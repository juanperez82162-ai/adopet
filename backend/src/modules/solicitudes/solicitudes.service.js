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
    insertarSolicitud
} from './solicitudes.repository.js';
import { mejoresCoincidencias } from './match.js';

// Cuántas mascotas recomienda el match.
export const CANTIDAD_RECOMENDADAS = 3;

// Deben coincidir con el tamaño de las columnas de SOLICITUDES_ADOPCION.
export const LARGO_MAXIMO_OTRO = 100;
export const LARGO_MAXIMO_OBSERVACION = 300;

const ROL_ADOPTANTE = 'ADOPTANTE';

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
