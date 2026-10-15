// Capa de SERVICE de SOLICITUDES: aquí viven TODAS las reglas de negocio.
// - Cuestionario de compatibilidad (opcional): recomienda mascotas.
// - Crear la solicitud: directa desde el catálogo o después del match.
//   Siempre nace en estado SOLICITUD y ligada a UNA mascota. No reserva
//   la mascota: solo el staff, al pasarla a ACTIVO, la compromete.
// Nunca llama al repository de otro módulo.

import { ErrorNegocio } from '../../utils/errores.js';
import { config } from '../../config/env.js';
import {
    listarTiposVivienda,
    listarTiemposDisponibles,
    listarEspecies,
    listarMascotasAdoptables,
    buscarMascotaParaSolicitud,
    buscarOpcionVivienda,
    buscarOpcionTiempo,
    insertarSolicitud,
    listarSolicitudes,
    buscarSolicitud,
    formalizarSolicitud,
    cancelarSolicitud,
    registrarEntrega,
    revertirEntrega,
    extenderPlazo,
    listarVencidas,
    marcarVencida,
    cerrarPrueba,
    listarPorVencer,
    listarPruebasCumplidas
} from './solicitudes.repository.js';
import {
    reservarMascotaParaProceso,
    liberarMascotaDeProceso,
    pasarMascotaAPrueba,
    revertirMascotaAProceso,
    marcarMascotaAdoptada,
    devolverMascotaAlAlbergue,
    revertirMascotaAdoptada,
    revertirDevolucionDeMascota
} from '../mascotas/mascotas.service.js';
import { programarCheckpoints } from '../seguimientos/seguimientos.service.js';
import { notificarAlStaff } from '../notificaciones/notificaciones.service.js';
import { TIPO } from '../notificaciones/tipos.js';
import { PERFIL_VETADO } from '../../utils/perfiles.js';
import { mejoresCoincidencias, calcularMatch } from './match.js';

// Cuántas mascotas recomienda el match.
export const CANTIDAD_RECOMENDADAS = 3;

// Deben coincidir con el tamaño de las columnas de SOLICITUDES_ADOPCION.
export const LARGO_MAXIMO_OTRO = 100;
export const LARGO_MAXIMO_OBSERVACION = 300;

const ROL_ADOPTANTE = 'ADOPTANTE';
const ROL_STAFF = 'STAFF';

// IDs fijos de ESTADOS_PROCESO (sembrados en V2).
const SOLICITUD = 1;
const ACTIVO = 2;
const EN_PRUEBA = 3;
const FINALIZADO = 4;
const FALLIDO = 5;
const CANCELADO_ADOPTANTE = 7;
const CANCELADO_STAFF = 8;
const CANCELADO_OTROS = 9;
const ESTADOS_CANCELACION = [CANCELADO_ADOPTANTE, CANCELADO_STAFF, CANCELADO_OTROS];

// Debe coincidir con el tamaño de SOLICITUDES_ADOPCION.OBSERVACIONES.
export const LARGO_MAXIMO_MOTIVO = 500;

function lanzarDatosInvalidos(errores) {
    throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'Revisa los campos marcados.', errores);
}

const esEnteroPositivo = (v) => Number.isInteger(v) && v > 0;

function exigirAdoptante(usuario) {
    if (usuario.rol !== ROL_ADOPTANTE) {
        throw new ErrorNegocio(403, 'SOLO_ADOPTANTES',
            'Solo una persona adoptante puede enviar una solicitud de adopción.');
    }
}

// Validación de forma del cuestionario (sin tocar la base). Devuelve los
// valores limpios o lanza 400. Los textos "otro" se validan después, cuando
// se sabe si la opción elegida es "Otro".
function validarFormaCuestionario(c) {
    const errores = {};

    if (c === null || typeof c !== 'object' || Array.isArray(c)) {
        lanzarDatosInvalidos({ cuestionario: 'Envía las respuestas del cuestionario.' });
    }

    if (!esEnteroPositivo(c.idTipoVivienda)) errores.idTipoVivienda = 'Elige el tipo de vivienda.';
    if (!esEnteroPositivo(c.idTiempoDisponible)) errores.idTiempoDisponible = 'Elige el tiempo que puedes dedicarle.';

    const booleanos = {
        tieneEspacioExterior: 'Indica si tienes espacio exterior.',
        experienciaPrevia: 'Indica si has tenido mascotas antes.',
        dispuestoNecesidadesEspeciales: 'Indica si estás dispuesto a cuidar una mascota con necesidades especiales.',
        tieneNinosHogar: 'Indica si hay niños en tu hogar.',
        tieneOtrasMascotasHogar: 'Indica si tienes otras mascotas.'
    };

    for (const [campo, mensaje] of Object.entries(booleanos)) {
        if (typeof c[campo] !== 'boolean') errores[campo] = mensaje;
    }

    for (const campo of ['tipoViviendaOtro', 'tiempoDisponibleOtro', 'experienciaObservaciones', 'otrasMascotasObservaciones']) {
        if (c[campo] != null && typeof c[campo] !== 'string') errores[campo] = 'Debe ser texto.';
    }

    if (Object.keys(errores).length > 0) lanzarDatosInvalidos(errores);
}

const limpiar = (texto) => (typeof texto === 'string' && texto.trim() !== '' ? texto.trim() : null);

// Busca las opciones elegidas, exige el texto cuando es "Otro" y devuelve
// el cuestionario listo para el match y para guardar.
async function resolverCuestionario(c) {
    validarFormaCuestionario(c);

    const errores = {};
    const [vivienda, tiempo] = await Promise.all([
        buscarOpcionVivienda(c.idTipoVivienda),
        buscarOpcionTiempo(c.idTiempoDisponible)
    ]);

    if (!vivienda) errores.idTipoVivienda = 'El tipo de vivienda elegido no existe o no está disponible.';
    if (!tiempo) errores.idTiempoDisponible = 'El tiempo elegido no existe o no está disponible.';

    const viviendaOtro = limpiar(c.tipoViviendaOtro);
    const tiempoOtro = limpiar(c.tiempoDisponibleOtro);
    const experienciaObs = limpiar(c.experienciaObservaciones);
    const mascotasObs = limpiar(c.otrasMascotasObservaciones);

    // El texto "otro" es obligatorio si se eligió "Otro" y sobra en cualquier otro caso.
    if (vivienda && vivienda.ES_OTRO === 'S' && !viviendaOtro) errores.tipoViviendaOtro = 'Cuéntanos cuál es tu tipo de vivienda.';
    if (vivienda && vivienda.ES_OTRO !== 'S' && viviendaOtro) errores.tipoViviendaOtro = 'Solo se escribe si eliges "Otro".';
    if (tiempo && tiempo.ES_OTRO === 'S' && !tiempoOtro) errores.tiempoDisponibleOtro = 'Cuéntanos cuánto tiempo puedes dedicarle.';
    if (tiempo && tiempo.ES_OTRO !== 'S' && tiempoOtro) errores.tiempoDisponibleOtro = 'Solo se escribe si eliges "Otro".';

    if (viviendaOtro && viviendaOtro.length > LARGO_MAXIMO_OTRO) errores.tipoViviendaOtro = `Máximo ${LARGO_MAXIMO_OTRO} caracteres.`;
    if (tiempoOtro && tiempoOtro.length > LARGO_MAXIMO_OTRO) errores.tiempoDisponibleOtro = `Máximo ${LARGO_MAXIMO_OTRO} caracteres.`;
    if (experienciaObs && experienciaObs.length > LARGO_MAXIMO_OBSERVACION) errores.experienciaObservaciones = `Máximo ${LARGO_MAXIMO_OBSERVACION} caracteres.`;
    if (mascotasObs && mascotasObs.length > LARGO_MAXIMO_OBSERVACION) errores.otrasMascotasObservaciones = `Máximo ${LARGO_MAXIMO_OBSERVACION} caracteres.`;

    // Las observaciones solo tienen sentido si la respuesta lo amerita.
    if (experienciaObs && !c.experienciaPrevia) errores.experienciaObservaciones = 'Solo se escribe si ya has tenido mascotas.';
    if (mascotasObs && !c.tieneOtrasMascotasHogar) errores.otrasMascotasObservaciones = 'Solo se escribe si tienes otras mascotas.';

    if (Object.keys(errores).length > 0) lanzarDatosInvalidos(errores);

    return {
        paraMatch: {
            nivelVivienda: vivienda.NIVEL,
            tieneEspacioExterior: c.tieneEspacioExterior,
            nivelTiempo: tiempo.NIVEL,
            experienciaPrevia: c.experienciaPrevia,
            dispuestoNecesidadesEspeciales: c.dispuestoNecesidadesEspeciales,
            tieneNinosHogar: c.tieneNinosHogar,
            tieneOtrasMascotasHogar: c.tieneOtrasMascotasHogar
        },
        paraGuardar: {
            idTipoVivienda: c.idTipoVivienda,
            tipoViviendaOtro: viviendaOtro,
            tieneEspacioExterior: c.tieneEspacioExterior ? 'S' : 'N',
            idTiempoDisponible: c.idTiempoDisponible,
            tiempoDisponibleOtro: tiempoOtro,
            experienciaPrevia: c.experienciaPrevia ? 'S' : 'N',
            experienciaObservaciones: experienciaObs,
            dispuestoNecesidades: c.dispuestoNecesidadesEspeciales ? 'S' : 'N',
            tieneNinos: c.tieneNinosHogar ? 'S' : 'N',
            tieneOtrasMascotas: c.tieneOtrasMascotasHogar ? 'S' : 'N',
            otrasMascotasObservaciones: mascotasObs
        }
    };
}

// ---- Opciones del cuestionario ----------------------------------------

const aOpcion = (f) => ({
    id: f.ID,
    nombre: f.NOMBRE,
    descripcion: f.DESCRIPCION,
    esOtro: f.ES_OTRO === 'S'
});

export async function obtenerOpcionesCuestionario() {
    const [tiposVivienda, tiemposDisponibles, especies] = await Promise.all([
        listarTiposVivienda(),
        listarTiemposDisponibles(),
        listarEspecies()
    ]);

    return {
        tiposVivienda: tiposVivienda.map(aOpcion),
        tiemposDisponibles: tiemposDisponibles.map(aOpcion),
        especies: especies.map((e) => ({ id: e.ID_ESPECIE, nombre: e.NOMBRE })),
        largos: { otro: LARGO_MAXIMO_OTRO, observacion: LARGO_MAXIMO_OBSERVACION }
    };
}

// ---- Match -------------------------------------------------------------

// No guarda nada: calcula y responde. Si ninguna mascota alcanza el
// umbral, devuelve una lista vacía (el frontend sugiere ver el catálogo).
export async function recomendarMascotas(cuerpo, usuario) {
    exigirAdoptante(usuario);

    let idEspecie = null;

    if (cuerpo.idEspecie != null && cuerpo.idEspecie !== '') {
        idEspecie = Number(cuerpo.idEspecie);

        if (!esEnteroPositivo(idEspecie)) {
            lanzarDatosInvalidos({ idEspecie: 'La especie elegida no es válida.' });
        }
    }

    const { paraMatch } = await resolverCuestionario(cuerpo.cuestionario);
    const candidatas = await listarMascotasAdoptables(idEspecie);

    const mascotas = candidatas.map((f) => ({
        id: f.ID_MASCOTA,
        nombre: f.NOMBRE,
        raza: f.RAZA,
        especie: f.ESPECIE,
        edadActualMeses: f.EDAD_ACTUAL_MESES,
        tamanio: f.TAMANIO,
        sexo: f.SEXO,
        nivelEnergia: f.NIVEL_ENERGIA_NOMBRE,
        idFotoPrincipal: f.ID_FOTO_PRINCIPAL,
        // Campos que usa el motor de match:
        nivelTamanio: f.NIVEL_TAMANIO,
        nivelEnergiaNumero: f.NIVEL_ENERGIA,
        compatibleNinos: f.COMPATIBLE_NINOS === 'S',
        compatibleOtrasMascotas: f.COMPATIBLE_OTRAS_MASCOTAS === 'S',
        tieneNecesidadesEspeciales: f.TIENE_NECESIDADES_ESPECIALES === 'S'
    }));

    const paraCalcular = mascotas.map((m) => ({ ...m, nivelEnergia: m.nivelEnergiaNumero }));
    const mejores = mejoresCoincidencias(paraMatch, paraCalcular, config.negocio.umbralMatch, CANTIDAD_RECOMENDADAS);

    return {
        umbral: config.negocio.umbralMatch,
        recomendadas: mejores.map(({ mascota, puntaje }) => ({
            id: mascota.id,
            nombre: mascota.nombre,
            raza: mascota.raza,
            especie: mascota.especie,
            edadActualMeses: mascota.edadActualMeses,
            tamanio: mascota.tamanio,
            sexo: mascota.sexo,
            idFotoPrincipal: mascota.idFotoPrincipal,
            puntaje
        }))
    };
}

// ---- Crear la solicitud -----------------------------------------------

// ORA-00001 sobre el índice de solicitud abierta: ya existe una para esa mascota.
function traducirDuplicada(err) {
    if (err.errorNum === 1 && String(err.message).includes('UX_SOLICITUD_ABIERTA_POR_USUARIO_MASCOTA')) {
        throw new ErrorNegocio(409, 'SOLICITUD_DUPLICADA',
            'Ya tienes una solicitud abierta para esta mascota. El albergue te contactará.');
    }

    throw err;
}

export async function crearSolicitud(cuerpo, usuario) {
    exigirAdoptante(usuario);

    const idMascota = Number(cuerpo.idMascota);

    if (!esEnteroPositivo(idMascota)) {
        lanzarDatosInvalidos({ idMascota: 'Elige la mascota.' });
    }

    const mascota = await buscarMascotaParaSolicitud(idMascota);

    if (!mascota || mascota.ACTIVO !== 'S') {
        throw new ErrorNegocio(404, 'MASCOTA_NO_ENCONTRADA', 'La mascota no existe.');
    }

    if (mascota.ES_ADOPTABLE !== 'S') {
        throw new ErrorNegocio(409, 'MASCOTA_NO_ADOPTABLE',
            `${mascota.NOMBRE} no está disponible para adopción en este momento.`);
    }

    // El cuestionario es opcional, pero si llega debe venir completo.
    const cuestionario = cuerpo.cuestionario == null ? null : await resolverCuestionario(cuerpo.cuestionario);

    const vacio = {
        idTipoVivienda: null, tipoViviendaOtro: null, tieneEspacioExterior: null,
        idTiempoDisponible: null, tiempoDisponibleOtro: null,
        experienciaPrevia: null, experienciaObservaciones: null,
        dispuestoNecesidades: null, tieneNinos: null,
        tieneOtrasMascotas: null, otrasMascotasObservaciones: null
    };

    try {
        const creada = await insertarSolicitud({
            documento: usuario.documento,
            idMascota,
            ...(cuestionario ? cuestionario.paraGuardar : vacio)
        });

        return {
            idSolicitud: creada.idSolicitud,
            fechaEnvio: creada.fechaEnvio,
            idMascota,
            mascota: mascota.NOMBRE,
            conCuestionario: cuestionario !== null
        };
    } catch (err) {
        return traducirDuplicada(err);
    }
}


// ---- Consulta ------------------------------------------------------------

function aSolicitud(f, verContacto) {
    const conCuestionario = f.ID_TIPO_VIVIENDA !== null;

    const solicitud = {
        id: f.ID_SOLICITUD,
        documento: f.DOCUMENTO,
        adoptante: f.NOMBRE_ADOPTANTE,
        idMascota: f.ID_MASCOTA,
        mascota: f.MASCOTA,
        idFotoPrincipal: f.ID_FOTO_PRINCIPAL,
        idEstadoProceso: f.ID_ESTADO_PROCESO,
        estado: f.ESTADO,
        fechaEnvio: f.FECHA_ENVIO,
        fechaInicio: f.FECHA_INICIO,
        fechaVencimiento: f.FECHA_VENCIMIENTO,
        fechaEntrega: f.FECHA_ENTREGA,
        fechaFinPrueba: f.FECHA_FIN_PRUEBA,
        fechaResolucion: f.FECHA_RESOLUCION,
        observaciones: f.OBSERVACIONES,
        conCuestionario
    };

    if (verContacto) {
        solicitud.telefono = f.TELEFONO;
        solicitud.correo = f.CORREO;
    }

    if (conCuestionario) {
        solicitud.cuestionario = {
            tipoVivienda: f.TIPO_VIVIENDA,
            tipoViviendaOtro: f.TIPO_VIVIENDA_OTRO,
            tieneEspacioExterior: f.TIENE_ESPACIO_EXTERIOR === 'S',
            tiempoDisponible: f.TIEMPO_DISPONIBLE,
            tiempoDisponibleOtro: f.TIEMPO_DISPONIBLE_OTRO,
            experienciaPrevia: f.EXPERIENCIA_PREVIA === 'S',
            experienciaObservaciones: f.EXPERIENCIA_PREVIA_OBSERVACIONES,
            dispuestoNecesidadesEspeciales: f.DISPUESTO_NECESIDADES_ESPECIALES === 'S',
            tieneNinosHogar: f.TIENE_NINOS_HOGAR === 'S',
            tieneOtrasMascotasHogar: f.TIENE_OTRAS_MASCOTAS_HOGAR === 'S',
            otrasMascotasObservaciones: f.TIENE_OTRAS_MASCOTAS_HOGAR_OBSERVACIONES
        };

        // Qué tan compatible es ESTA mascota con las respuestas (solo informativo).
        const resultado = calcularMatch(
            {
                nivelVivienda: f.NIVEL_VIVIENDA,
                tieneEspacioExterior: f.TIENE_ESPACIO_EXTERIOR === 'S',
                nivelTiempo: f.NIVEL_TIEMPO,
                experienciaPrevia: f.EXPERIENCIA_PREVIA === 'S',
                dispuestoNecesidadesEspeciales: f.DISPUESTO_NECESIDADES_ESPECIALES === 'S',
                tieneNinosHogar: f.TIENE_NINOS_HOGAR === 'S',
                tieneOtrasMascotasHogar: f.TIENE_OTRAS_MASCOTAS_HOGAR === 'S'
            },
            {
                nivelTamanio: f.NIVEL_TAMANIO,
                nivelEnergia: f.NIVEL_ENERGIA,
                compatibleNinos: f.COMPATIBLE_NINOS === 'S',
                compatibleOtrasMascotas: f.COMPATIBLE_OTRAS_MASCOTAS === 'S',
                tieneNecesidadesEspeciales: f.TIENE_NECESIDADES_ESPECIALES === 'S'
            }
        );

        solicitud.compatibilidad = { puntaje: resultado.puntaje, descartada: resultado.descartada };
    }

    return solicitud;
}

// El staff ve todas; el adoptante solo las suyas y sin datos de contacto.
export async function obtenerSolicitudes(consulta, usuario) {
    const esStaff = usuario.rol === ROL_STAFF;
    const filtros = { texto: typeof consulta.texto === 'string' ? consulta.texto.trim() : '' };

    if (consulta.idEstadoProceso) {
        const id = Number(consulta.idEstadoProceso);

        if (!esEnteroPositivo(id)) {
            throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'idEstadoProceso: debe ser un número entero positivo.');
        }

        filtros.idEstadoProceso = id;
    }

    if (!esStaff) filtros.documento = usuario.documento;

    const filas = await listarSolicitudes(filtros);
    return filas.map((f) => aSolicitud(f, esStaff));
}

async function buscarExistente(valorId, usuario) {
    const id = Number(valorId);

    if (!esEnteroPositivo(id)) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'id: debe ser un número entero positivo.');
    }

    const fila = await buscarSolicitud(id);

    // Un adoptante no sabe si existen las solicitudes de otros.
    if (!fila || (usuario.rol !== ROL_STAFF && fila.DOCUMENTO !== usuario.documento)) {
        throw new ErrorNegocio(404, 'SOLICITUD_NO_ENCONTRADA', 'La solicitud no existe.');
    }

    return fila;
}

export async function obtenerSolicitud(valorId, usuario) {
    return aSolicitud(await buscarExistente(valorId, usuario), usuario.rol === ROL_STAFF);
}

// ---- Formalizar y cancelar (staff) -----------------------------------------

function leerMotivo(cuerpo, obligatorio) {
    const texto = typeof cuerpo.observaciones === 'string' ? cuerpo.observaciones.trim() : '';

    if (obligatorio && !texto) {
        lanzarDatosInvalidos({ observaciones: 'Escribe el motivo.' });
    }

    if (texto.length > LARGO_MAXIMO_MOTIVO) {
        lanzarDatosInvalidos({ observaciones: `Máximo ${LARGO_MAXIMO_MOTIVO} caracteres.` });
    }

    return texto || null;
}

function exigirNoSerLaMismaPersona(fila, usuario) {
    if (fila.DOCUMENTO === usuario.documento) {
        throw new ErrorNegocio(403, 'SOLICITUD_PROPIA', 'No puedes gestionar tu propia solicitud.');
    }
}

// El adoptante confirmó por WhatsApp: el staff convierte la solicitud en
// trámite. Pasa a ACTIVO con el plazo de config.negocio.diasProcesoFormal y
// la mascota queda EN_PROCESO. Las demás solicitudes abiertas de esa mascota
// no se tocan: si este trámite se cae, siguen vigentes.
export async function formalizar(valorId, cuerpo, usuario) {
    const fila = await buscarExistente(valorId, usuario);
    exigirNoSerLaMismaPersona(fila, usuario);
    const observaciones = leerMotivo(cuerpo, false);

    if (fila.ID_ESTADO_PROCESO !== SOLICITUD) {
        throw new ErrorNegocio(409, 'SOLICITUD_NO_ABIERTA', 'Solo se puede formalizar una solicitud en estado SOLICITUD.');
    }

    if (fila.USUARIO_ACTIVO !== 'S' || fila.NOMBRE_PERFIL === PERFIL_VETADO) {
        throw new ErrorNegocio(409, 'ADOPTANTE_NO_HABILITADO', 'La persona no está habilitada para adoptar.');
    }

    // 1. La mascota debe seguir disponible; si sí, queda EN_PROCESO.
    if (!(await reservarMascotaParaProceso(fila.ID_MASCOTA))) {
        throw new ErrorNegocio(409, 'MASCOTA_NO_DISPONIBLE',
            `${fila.MASCOTA} ya no está disponible para iniciar un trámite.`);
    }

    // 2. La solicitud pasa a ACTIVO. Si falla, la mascota se libera.
    try {
        const cambiadas = await formalizarSolicitud(
            fila.ID_SOLICITUD, usuario.documento, config.negocio.diasProcesoFormal, observaciones
        );

        if (cambiadas !== 1) {
            throw new ErrorNegocio(409, 'SOLICITUD_NO_ABIERTA', 'La solicitud cambió de estado. Actualiza la lista.');
        }
    } catch (err) {
        await liberarMascotaDeProceso(fila.ID_MASCOTA);

        if (err.errorNum === 1 && String(err.message).includes('UX_PROCESO_VIGENTE_POR_USUARIO')) {
            throw new ErrorNegocio(409, 'ADOPTANTE_CON_PROCESO_VIGENTE',
                'Esta persona ya tiene un trámite de adopción vigente.');
        }

        throw err;
    }

    return aSolicitud(await buscarSolicitud(fila.ID_SOLICITUD), true);
}

// Cierra una solicitud abierta (SOLICITUD o ACTIVO) con un motivo. Si estaba
// ACTIVO, la mascota vuelve a quedar disponible. Una cerrada no se reactiva.
export async function cancelar(valorId, cuerpo, usuario) {
    const fila = await buscarExistente(valorId, usuario);
    exigirNoSerLaMismaPersona(fila, usuario);

    const idEstadoNuevo = Number(cuerpo.idEstadoProceso);

    if (!ESTADOS_CANCELACION.includes(idEstadoNuevo)) {
        lanzarDatosInvalidos({ idEstadoProceso: 'Elige quién cancela: el adoptante, el staff u otros.' });
    }

    const observaciones = leerMotivo(cuerpo, true);

    if (fila.ID_ESTADO_PROCESO !== SOLICITUD && fila.ID_ESTADO_PROCESO !== ACTIVO) {
        throw new ErrorNegocio(409, 'SOLICITUD_NO_CANCELABLE', 'Esta solicitud ya está cerrada o en periodo de prueba.');
    }

    const cambiadas = await cancelarSolicitud(
        fila.ID_SOLICITUD, fila.ID_ESTADO_PROCESO, idEstadoNuevo, usuario.documento, observaciones
    );

    if (cambiadas !== 1) {
        throw new ErrorNegocio(409, 'SOLICITUD_NO_CANCELABLE', 'La solicitud cambió de estado. Actualiza la lista.');
    }

    if (fila.ID_ESTADO_PROCESO === ACTIVO) {
        await liberarMascotaDeProceso(fila.ID_MASCOTA);
    }

    return aSolicitud(await buscarSolicitud(fila.ID_SOLICITUD), true);
}

// El adoptante retira su propia solicitud. Solo mientras sigue en estado
// SOLICITUD: una vez formalizada hay un trámite y una mascota en proceso, y
// eso se cierra hablando con el albergue. El motivo es opcional.
export async function cancelarPropia(valorId, cuerpo, usuario) {
    exigirAdoptante(usuario);

    // Si la solicitud no es suya, buscarExistente responde 404.
    const fila = await buscarExistente(valorId, usuario);
    const observaciones = leerMotivo(cuerpo, false);

    if (fila.ID_ESTADO_PROCESO !== SOLICITUD) {
        throw new ErrorNegocio(409, 'SOLICITUD_NO_CANCELABLE',
            fila.ID_ESTADO_PROCESO === ACTIVO
                ? 'Tu solicitud ya es un trámite activo. Para cancelarlo comunícate con el albergue.'
                : 'Esta solicitud ya está cerrada o en periodo de prueba.');
    }

    const cambiadas = await cancelarSolicitud(
        fila.ID_SOLICITUD, SOLICITUD, CANCELADO_ADOPTANTE, null, observaciones
    );

    if (cambiadas !== 1) {
        throw new ErrorNegocio(409, 'SOLICITUD_NO_CANCELABLE', 'La solicitud cambió de estado. Actualiza la lista.');
    }

    return aSolicitud(await buscarSolicitud(fila.ID_SOLICITUD), false);
}

// ---- Entrega, extensión de plazo y vencimiento -----------------------------

// Máximo de días que se puede extender el plazo en una sola vez.
export const MAXIMO_DIAS_EXTENSION = 365;

const BOGOTA = { timeZone: 'America/Bogota' };

// El staff entrega la mascota: el trámite pasa a EN_PRUEBA, la mascota también,
// y se programan los checkpoints 3-3-3 desde la fecha de entrega. Si algo falla
// a mitad de camino, se deshace lo anterior para no dejar datos a medias.
export async function entregar(valorId, usuario) {
    const fila = await buscarExistente(valorId, usuario);
    exigirNoSerLaMismaPersona(fila, usuario);

    if (fila.ID_ESTADO_PROCESO !== ACTIVO) {
        throw new ErrorNegocio(409, 'SOLICITUD_NO_ACTIVA', 'Solo se puede registrar la entrega de un trámite activo.');
    }

    if (fila.FECHA_VENCIMIENTO < new Date()) {
        throw new ErrorNegocio(409, 'PLAZO_VENCIDO',
            'El plazo del trámite ya se cumplió. Extiéndelo para poder registrar la entrega.');
    }

    // 1. La mascota pasa de EN_PROCESO a EN_PRUEBA.
    if (!(await pasarMascotaAPrueba(fila.ID_MASCOTA))) {
        throw new ErrorNegocio(409, 'MASCOTA_NO_EN_PROCESO',
            `${fila.MASCOTA} no está en proceso de adopción. Revisa su estado en Mascotas.`);
    }

    // 2. El trámite pasa a EN_PRUEBA con la fecha de entrega.
    let entrega;

    try {
        entrega = await registrarEntrega(fila.ID_SOLICITUD);
    } catch (err) {
        await revertirMascotaAProceso(fila.ID_MASCOTA);
        throw err;
    }

    if (entrega.filas !== 1) {
        await revertirMascotaAProceso(fila.ID_MASCOTA);
        throw new ErrorNegocio(409, 'SOLICITUD_NO_ACTIVA', 'La solicitud cambió de estado o su plazo venció. Actualiza la lista.');
    }

    // 3. Se programan los checkpoints.
    try {
        await programarCheckpoints(fila.ID_SOLICITUD, entrega.fechaEntrega);
    } catch (err) {
        await revertirEntrega(fila.ID_SOLICITUD);
        await revertirMascotaAProceso(fila.ID_MASCOTA);
        throw err;
    }

    return aSolicitud(await buscarSolicitud(fila.ID_SOLICITUD), true);
}

// Suma días al plazo de un trámite activo y deja constancia en las observaciones.
export async function extender(valorId, cuerpo, usuario) {
    const fila = await buscarExistente(valorId, usuario);
    exigirNoSerLaMismaPersona(fila, usuario);

    const dias = cuerpo.dias;

    if (!Number.isInteger(dias) || dias < 1 || dias > MAXIMO_DIAS_EXTENSION) {
        lanzarDatosInvalidos({ dias: `Escribe un número de días entre 1 y ${MAXIMO_DIAS_EXTENSION}.` });
    }

    if (fila.ID_ESTADO_PROCESO !== ACTIVO) {
        throw new ErrorNegocio(409, 'SOLICITUD_NO_ACTIVA', 'Solo se puede extender el plazo de un trámite activo.');
    }

    // Constancia en las observaciones. Si se llenan (máximo 500), se conservan las más recientes.
    const hoy = new Date().toLocaleDateString('es-CO', BOGOTA);
    const nota = `Plazo extendido ${dias} ${dias === 1 ? 'día' : 'días'} el ${hoy}.`;
    const observaciones = [fila.OBSERVACIONES, nota].filter(Boolean).join(' ').slice(-LARGO_MAXIMO_MOTIVO);

    const cambiadas = await extenderPlazo(fila.ID_SOLICITUD, dias, observaciones);

    if (cambiadas !== 1) {
        throw new ErrorNegocio(409, 'SOLICITUD_NO_ACTIVA', 'La solicitud cambió de estado. Actualiza la lista.');
    }

    return aSolicitud(await buscarSolicitud(fila.ID_SOLICITUD), true);
}

// Lo ejecuta el job de vencimiento: los trámites activos con el plazo cumplido
// pasan a VENCIDO y su mascota vuelve a estar disponible. Un error con un
// trámite no detiene a los demás. Devuelve cuántos venció.
export async function vencerSolicitudes() {
    const candidatas = await listarVencidas();
    let vencidas = 0;

    for (const { ID_SOLICITUD: id, ID_MASCOTA: idMascota } of candidatas) {
        try {
            if ((await marcarVencida(id)) === 1) {
                await liberarMascotaDeProceso(idMascota);
                vencidas += 1;
            }
        } catch (err) {
            console.error(`No se pudo vencer la solicitud ${id}:`, err.message);
        }
    }

    return vencidas;
}

// El staff cierra el periodo de prueba tras revisar los checkpoints.
//   FINALIZADO: la adopción se confirma (mascota ADOPTADA). Solo cuando el
//               periodo ya se cumplió; el motivo es opcional.
//   FALLIDO:    la mascota fue devuelta (vuelve a DISPONIBLE). Puede ocurrir
//               en cualquier momento de la prueba y exige explicar por qué.
// Primero se cambia la mascota y, si el trámite no se puede cerrar, se revierte.
export async function cerrarPeriodoPrueba(valorId, cuerpo, usuario) {
    const fila = await buscarExistente(valorId, usuario);
    exigirNoSerLaMismaPersona(fila, usuario);

    const resultado = cuerpo.resultado;

    if (resultado !== 'FINALIZADO' && resultado !== 'FALLIDO') {
        lanzarDatosInvalidos({ resultado: 'Elige si la adopción se confirma o fracasó.' });
    }

    const exito = resultado === 'FINALIZADO';
    const observaciones = leerMotivo(cuerpo, !exito);

    if (fila.ID_ESTADO_PROCESO !== EN_PRUEBA) {
        throw new ErrorNegocio(409, 'SOLICITUD_NO_EN_PRUEBA', 'Solo se puede cerrar un trámite en periodo de prueba.');
    }

    if (exito && fila.FECHA_FIN_PRUEBA > new Date()) {
        throw new ErrorNegocio(409, 'PERIODO_NO_CUMPLIDO',
            'El periodo de prueba todavía no se cumple. Si la mascota fue devuelta, registra el fracaso.');
    }

    const cambiarMascota = exito ? marcarMascotaAdoptada : devolverMascotaAlAlbergue;
    const revertirMascota = exito ? revertirMascotaAdoptada : revertirDevolucionDeMascota;

    if (!(await cambiarMascota(fila.ID_MASCOTA))) {
        throw new ErrorNegocio(409, 'MASCOTA_NO_EN_PRUEBA',
            `${fila.MASCOTA} no está en periodo de prueba. Revisa su estado en Mascotas.`);
    }

    let cambiadas;

    try {
        cambiadas = await cerrarPrueba(fila.ID_SOLICITUD, exito ? FINALIZADO : FALLIDO, usuario.documento, observaciones);
    } catch (err) {
        await revertirMascota(fila.ID_MASCOTA);
        throw err;
    }

    if (cambiadas !== 1) {
        await revertirMascota(fila.ID_MASCOTA);
        throw new ErrorNegocio(409, 'SOLICITUD_NO_EN_PRUEBA', 'La solicitud cambió de estado. Actualiza la lista.');
    }

    return aSolicitud(await buscarSolicitud(fila.ID_SOLICITUD), true);
}

// ---- Alertas al staff (las ejecuta el job diario) ----------------------------

const fechaCorta = (fecha) => fecha.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });

// Trámites activos que vencen en los próximos días. Devuelve cuántas alertas nuevas creó.
export async function alertarTramitesPorVencer() {
    const filas = await listarPorVencer(config.negocio.diasAvisoVencimiento);
    let nuevas = 0;

    for (const f of filas) {
        try {
            const mensaje = `El trámite de ${f.MASCOTA} con ${f.NOMBRE_ADOPTANTE} vence el ${fechaCorta(f.FECHA_VENCIMIENTO)}.`;
            if (await notificarAlStaff(TIPO.TRAMITE_POR_VENCER, mensaje, f.ID_SOLICITUD)) nuevas += 1;
        } catch (err) {
            console.error(`No se pudo alertar la solicitud ${f.ID_SOLICITUD}:`, err.message);
        }
    }

    return nuevas;
}

// Periodos de prueba cumplidos que esperan la confirmación del staff.
export async function alertarPruebasCumplidas() {
    const filas = await listarPruebasCumplidas();
    let nuevas = 0;

    for (const f of filas) {
        try {
            const mensaje = `El periodo de prueba de ${f.MASCOTA} con ${f.NOMBRE_ADOPTANTE} ya se cumplió. Revisa los seguimientos y confirma la adopción.`;
            if (await notificarAlStaff(TIPO.PRUEBA_CUMPLIDA, mensaje, f.ID_SOLICITUD)) nuevas += 1;
        } catch (err) {
            console.error(`No se pudo alertar la solicitud ${f.ID_SOLICITUD}:`, err.message);
        }
    }

    return nuevas;
}
