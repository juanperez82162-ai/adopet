// Capa de SERVICE de MASCOTAS: aquí viven TODAS las reglas de negocio.
// - Valida y devuelve los errores campo por campo (detalles).
// - El staff ve todo; el adoptante solo ve mascotas activas con estado
//   visible, y sin los datos internos (observaciones, fecha de ingreso).
// - Convierte filas de Oracle (MAYÚSCULAS, 'S'/'N') a objetos de la API.
// Nunca llama al repository de otro módulo.

import { ErrorNegocio } from '../../utils/errores.js';
import {
    listarMascotas,
    buscarPorId,
    insertarMascota,
    actualizarMascota,
    desactivarMascota,
    reactivarMascota,
    contarFotos,
    listarFotos,
    buscarFoto,
    insertarFoto,
    marcarPrincipal,
    listarEstadosElegibles,
    eliminarFoto,
    cambiarEstadoSiEs,
    contarResumenMascotas
} from './mascotas.repository.js';
import { detectarTipoImagen } from './fotos.tipo.js';
import { guardarFoto, borrarFoto } from './fotos.almacen.js';

// Deben coincidir con el tamaño de las columnas de MASCOTAS.
export const LARGO_MAXIMO_NOMBRE = 50;
export const LARGO_MAXIMO_NECESIDADES = 500;
export const LARGO_MAXIMO_OBSERVACIONES = 200;
export const EDAD_MAXIMA_MESES = 999; // NUMBER(3)

// Decisión de fotos: JPG, PNG o WEBP · máximo 5 MB · máximo 5 por mascota.
export const TAMANIO_MAXIMO_FOTO = 5 * 1024 * 1024;
export const LIMITE_FOTOS = 5;

// IDs fijos de ESTADOS_MASCOTA (sembrados en V2).
const DISPONIBLE = 1;
const EN_TRATAMIENTO = 2;
const EN_PROCESO = 3;
const EN_PRUEBA = 4;
const ADOPTADA = 5;

// El staff solo elige estos dos. Los demás los pone el sistema.
const ESTADOS_ELEGIBLES = [DISPONIBLE, EN_TRATAMIENTO];

const esStaff = (usuario) => usuario?.rol === 'STAFF';

// ---- Conversión fila de Oracle → objeto de la API --------------------

// ESTADOS_MASCOTA guarda códigos (EN_TRATAMIENTO); la pantalla muestra
// texto legible ("En tratamiento"). Se arma aquí, en un solo lugar.
function etiquetaEstado(nombre) {
    const texto = String(nombre).replaceAll('_', ' ').toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function aMascota(fila, verInterno) {
    const mascota = {
        id: fila.ID_MASCOTA,
        nombre: fila.NOMBRE,
        idRaza: fila.ID_RAZA,
        raza: fila.RAZA,
        idEspecie: fila.ID_ESPECIE,
        especie: fila.ESPECIE,
        edadActualMeses: fila.EDAD_ACTUAL_MESES,
        idTamanio: fila.ID_TAMANIO,
        tamanio: fila.TAMANIO,
        idSexo: fila.ID_SEXO,
        sexo: fila.SEXO,
        idNivelEnergia: fila.ID_NIVEL_ENERGIA,
        nivelEnergia: fila.NIVEL_ENERGIA,
        compatibleNinos: fila.COMPATIBLE_NINOS === 'S',
        compatibleOtrasMascotas: fila.COMPATIBLE_OTRAS_MASCOTAS === 'S',
        tieneNecesidadesEspeciales: fila.TIENE_NECESIDADES_ESPECIALES === 'S',
        descripcionNecesidades: fila.DESCRIPCION_NECESIDADES,
        idEstadoMascota: fila.ID_ESTADO_MASCOTA,
        estado: etiquetaEstado(fila.ESTADO),
        esAdoptable: fila.ES_ADOPTABLE === 'S',
        idFotoPrincipal: fila.ID_FOTO_PRINCIPAL
    };

    if (verInterno) {
        // Datos internos del albergue: el adoptante no los ve.
        mascota.edadMesesIngreso = fila.EDAD_MESES_INGRESO;
        mascota.fechaIngreso = fila.FECHA_INGRESO;
        mascota.fechaSalida = fila.FECHA_SALIDA;
        mascota.observacionesEstado = fila.OBSERVACIONES_ESTADO;
        mascota.activo = fila.ACTIVO === 'S';
    }

    return mascota;
}

// ---- Validaciones ----------------------------------------------------

function lanzarDatosInvalidos(errores) {
    throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'Revisa los campos marcados.', errores);
}

function validarId(valor) {
    const id = Number(valor);

    if (!Number.isInteger(id) || id <= 0) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'id: debe ser un número entero positivo.');
    }

    return id;
}

const esEnteroPositivo = (v) => Number.isInteger(v) && v > 0;

// Devuelve los datos limpios o lanza 400 con { campo: mensaje }.
// El frontend tendrá una copia de estas reglas (mascotas.validaciones.js)
// para avisar mientras se escribe; la que protege de verdad es esta.
function validarDatos(cuerpo) {
    const errores = {};
    const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';

    if (!nombre) {
        errores.nombre = 'Escribe el nombre.';
    } else if (nombre.length > LARGO_MAXIMO_NOMBRE) {
        errores.nombre = `Máximo ${LARGO_MAXIMO_NOMBRE} caracteres.`;
    }

    const selectores = {
        idRaza: 'Elige la raza.',
        idTamanio: 'Elige el tamaño.',
        idSexo: 'Elige el sexo.',
        idNivelEnergia: 'Elige el nivel de energía.'
    };

    for (const [campo, mensaje] of Object.entries(selectores)) {
        if (!esEnteroPositivo(cuerpo[campo])) errores[campo] = mensaje;
    }

    const edad = cuerpo.edadMesesIngreso;

    if (!Number.isInteger(edad) || edad < 1 || edad > EDAD_MAXIMA_MESES) {
        errores.edadMesesIngreso = `La edad al ingresar debe estar entre 1 y ${EDAD_MAXIMA_MESES} meses.`;
    }

    const siNo = {
        compatibleNinos: 'Indica si es compatible con niños.',
        compatibleOtrasMascotas: 'Indica si es compatible con otras mascotas.',
        tieneNecesidadesEspeciales: 'Indica si tiene necesidades especiales.'
    };

    for (const [campo, mensaje] of Object.entries(siNo)) {
        if (typeof cuerpo[campo] !== 'boolean') errores[campo] = mensaje;
    }

    // La descripción solo aplica si tiene necesidades especiales.
    const tieneNecesidades = cuerpo.tieneNecesidadesEspeciales === true;
    const descripcion = typeof cuerpo.descripcionNecesidades === 'string'
        ? cuerpo.descripcionNecesidades.trim() : '';

    if (tieneNecesidades && descripcion.length > LARGO_MAXIMO_NECESIDADES) {
        errores.descripcionNecesidades = `Máximo ${LARGO_MAXIMO_NECESIDADES} caracteres.`;
    }

    // El staff solo puede elegir DISPONIBLE o EN_TRATAMIENTO.
    const idEstado = cuerpo.idEstadoMascota ?? DISPONIBLE;

    if (!ESTADOS_ELEGIBLES.includes(idEstado)) {
        errores.idEstadoMascota = 'Solo puedes elegir Disponible o En tratamiento.';
    }

    if (Object.keys(errores).length > 0) lanzarDatosInvalidos(errores);

    return {
        nombre,
        idRaza: cuerpo.idRaza,
        edadMesesIngreso: edad,
        idTamanio: cuerpo.idTamanio,
        idSexo: cuerpo.idSexo,
        idNivelEnergia: cuerpo.idNivelEnergia,
        compatibleNinos: cuerpo.compatibleNinos ? 'S' : 'N',
        compatibleOtrasMascotas: cuerpo.compatibleOtrasMascotas ? 'S' : 'N',
        tieneNecesidadesEspeciales: tieneNecesidades ? 'S' : 'N',
        descripcionNecesidades: tieneNecesidades ? (descripcion || null) : null,
        idEstadoMascota: idEstado
    };
}

// ORA-02291: una llave foránea apunta a algo que no existe. El nombre
// de la restricción dice qué campo fue.
const CAMPO_POR_FK = {
    FK_MASCOTAS_RAZA: ['idRaza', 'La raza elegida no existe.'],
    FK_MASCOTAS_TAMANIO: ['idTamanio', 'El tamaño elegido no existe.'],
    FK_MASCOTAS_SEXO: ['idSexo', 'El sexo elegido no existe.'],
    FK_MASCOTAS_ENERGIA: ['idNivelEnergia', 'El nivel de energía elegido no existe.'],
    FK_MASCOTAS_ESTADO: ['idEstadoMascota', 'El estado elegido no existe.']
};

function traducirLlaveForanea(err) {
    if (err.errorNum !== 2291) return;

    const fk = Object.keys(CAMPO_POR_FK).find((nombre) => err.message.includes(nombre));

    if (fk) {
        const [campo, mensaje] = CAMPO_POR_FK[fk];
        lanzarDatosInvalidos({ [campo]: mensaje });
    }
}

async function buscarExistente(id) {
    const fila = await buscarPorId(id);

    if (!fila) {
        throw new ErrorNegocio(404, 'MASCOTA_NO_EXISTE', 'La mascota no existe.');
    }

    return fila;
}

// ---- Casos de uso (lo que llama el controller) -----------------------

export async function obtenerTodos(consulta = {}, usuario) {
    const staff = esStaff(usuario);
    const texto = typeof consulta.texto === 'string' ? consulta.texto.trim() : '';
    const idEspecie = Number(consulta.idEspecie);
    const idEstadoMascota = Number(consulta.idEstadoMascota);

    const filas = await listarMascotas({
        texto,
        // Solo el staff puede ver inactivas; el adoptante nunca.
        estado: staff && ['activos', 'inactivos'].includes(consulta.estado) ? consulta.estado : 'todos',
        idEspecie: esEnteroPositivo(idEspecie) ? idEspecie : null,
        idEstadoMascota: staff && esEnteroPositivo(idEstadoMascota) ? idEstadoMascota : null,
        soloVisibles: !staff
    });

    return filas.map((fila) => aMascota(fila, staff));
}

export async function obtenerUno(valorId, usuario) {
    const staff = esStaff(usuario);
    const fila = await buscarExistente(validarId(valorId));

    // Para el adoptante, una mascota que no ve es como si no existiera.
    if (!staff && (fila.ACTIVO !== 'S' || fila.ES_VISIBLE !== 'S')) {
        throw new ErrorNegocio(404, 'MASCOTA_NO_EXISTE', 'La mascota no existe.');
    }

    const mascota = aMascota(fila, staff);
    mascota.fotos = (await listarFotos(fila.ID_MASCOTA)).map((foto) => ({
        id: foto.ID_FOTO,
        esPrincipal: foto.ES_PRINCIPAL === 'S'
    }));

    return mascota;
}

export async function crearMascota(cuerpo, usuario) {
    const datos = validarDatos(cuerpo);

    try {
        const id = await insertarMascota(datos);
        return obtenerUno(id, usuario);
    } catch (err) {
        traducirLlaveForanea(err);
        throw err;
    }
}

export async function modificarMascota(valorId, cuerpo, usuario) {
    const id = validarId(valorId);
    const actual = await buscarExistente(id);

    // Si no llega estado, se conserva el actual. Si llega uno distinto,
    // solo se permite entre DISPONIBLE y EN_TRATAMIENTO: los estados
    // EN_PROCESO, EN_PRUEBA y ADOPTADA los maneja el sistema.
    const idEstadoPedido = cuerpo.idEstadoMascota ?? actual.ID_ESTADO_MASCOTA;

    if (idEstadoPedido !== actual.ID_ESTADO_MASCOTA
        && !ESTADOS_ELEGIBLES.includes(actual.ID_ESTADO_MASCOTA)) {
        throw new ErrorNegocio(409, 'ESTADO_NO_MODIFICABLE',
            'El estado de esta mascota lo maneja el proceso de adopción y no se puede cambiar a mano.',
            { idEstadoMascota: 'No se puede cambiar el estado de esta mascota.' });
    }

    // Si el estado actual lo maneja el sistema y no se cambia, se valida
    // el resto de los campos con un estado elegible de relleno y se
    // restituye el actual después.
    const manejadoPorSistema = !ESTADOS_ELEGIBLES.includes(actual.ID_ESTADO_MASCOTA);
    const datos = validarDatos(
        manejadoPorSistema ? { ...cuerpo, idEstadoMascota: DISPONIBLE } : { ...cuerpo, idEstadoMascota: idEstadoPedido }
    );

    if (manejadoPorSistema) datos.idEstadoMascota = actual.ID_ESTADO_MASCOTA;

    try {
        await actualizarMascota(id, datos);
    } catch (err) {
        traducirLlaveForanea(err);
        throw err;
    }

    return obtenerUno(id, usuario);
}

// Cambia si la mascota está en el albergue (activo true/false). Es la
// acción ELIMINAR del menú: solo la tiene el Admin.
export async function cambiarActivoMascota(valorId, cuerpo, usuario) {
    const id = validarId(valorId);

    if (typeof cuerpo.activo !== 'boolean') {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'activo: debe ser true o false.');
    }

    return cuerpo.activo
        ? reactivar(id, cuerpo, usuario)
        : desactivar(id, cuerpo, usuario);
}

// La mascota vuelve al albergue (por ejemplo, una adoptada que regresa).
// Es la misma fila: no se reabre ningún proceso, porque una solicitud
// cerrada nunca se reactiva. Quien la quiera adoptar empieza otra.
async function reactivar(id, cuerpo, usuario) {
    const actual = await buscarExistente(id);

    if (actual.ACTIVO === 'S') {
        throw new ErrorNegocio(409, 'MASCOTA_YA_ACTIVA', 'La mascota ya está en el albergue.');
    }

    const errores = {};
    const observaciones = typeof cuerpo.observaciones === 'string' ? cuerpo.observaciones.trim() : '';
    const idEstadoMascota = cuerpo.idEstadoMascota ?? DISPONIBLE;

    if (!observaciones) {
        errores.observaciones = 'Escribe el motivo del regreso.';
    } else if (observaciones.length > LARGO_MAXIMO_OBSERVACIONES) {
        errores.observaciones = `Máximo ${LARGO_MAXIMO_OBSERVACIONES} caracteres.`;
    }

    // Vuelve en un estado visible; el sistema pondrá los demás después.
    if (!ESTADOS_ELEGIBLES.includes(idEstadoMascota)) {
        errores.idEstadoMascota = 'Al regresar solo puede quedar Disponible o En tratamiento.';
    }

    if (Object.keys(errores).length > 0) lanzarDatosInvalidos(errores);

    await reactivarMascota(id, { idEstadoMascota, observaciones });
    return obtenerUno(id, usuario);
}

// "Eliminar" en ADOPET es desactivar: el animal sale del albergue. Exige
// el motivo y registra la fecha de salida (hoy, o la que indique el staff).
async function desactivar(id, cuerpo, usuario) {
    const actual = await buscarExistente(id);

    if (actual.ACTIVO === 'N') {
        throw new ErrorNegocio(409, 'MASCOTA_YA_INACTIVA', 'La mascota ya está desactivada.');
    }

    // Una mascota en proceso de adopción o en prueba no se puede retirar.
    if ([EN_PROCESO, EN_PRUEBA].includes(actual.ID_ESTADO_MASCOTA)) {
        throw new ErrorNegocio(409, 'MASCOTA_EN_ADOPCION',
            'La mascota está en un proceso de adopción; ciérralo antes de desactivarla.');
    }

    const errores = {};
    const observaciones = typeof cuerpo.observaciones === 'string' ? cuerpo.observaciones.trim() : '';

    if (!observaciones) {
        errores.observaciones = 'Escribe el motivo de la desactivación.';
    } else if (observaciones.length > LARGO_MAXIMO_OBSERVACIONES) {
        errores.observaciones = `Máximo ${LARGO_MAXIMO_OBSERVACIONES} caracteres.`;
    }

    // La fecha de salida es opcional (por defecto, ahora) y no puede ser
    // anterior al día de ingreso.
    let fechaSalida = null;

    if (cuerpo.fechaSalida !== undefined && cuerpo.fechaSalida !== null && cuerpo.fechaSalida !== '') {
        const texto = String(cuerpo.fechaSalida);
        const fecha = new Date(`${texto}T00:00:00`);
        const ingreso = new Date(actual.FECHA_INGRESO);
        ingreso.setHours(0, 0, 0, 0);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(fecha.getTime())) {
            errores.fechaSalida = 'Usa el formato AAAA-MM-DD.';
        } else if (fecha < ingreso) {
            errores.fechaSalida = 'La fecha de salida no puede ser anterior al ingreso.';
        } else {
            fechaSalida = texto;
        }
    }

    if (Object.keys(errores).length > 0) lanzarDatosInvalidos(errores);

    await desactivarMascota(id, { observaciones, fechaSalida });
    return obtenerUno(id, usuario);
}

// ---- Fotos -----------------------------------------------------------
// Las fotos no tienen URL pública: se piden por id a un endpoint con
// sesión. La primera que se sube es la principal.

export async function subirFoto(valorId, archivo, usuario) {
    const id = validarId(valorId);
    await buscarExistente(id);

    if (!archivo?.buffer) {
        lanzarDatosInvalidos({ foto: 'Elige una foto.' });
    }

    // Se mira el contenido real del archivo, no lo que diga su nombre.
    const extension = detectarTipoImagen(archivo.buffer);

    if (!extension) {
        lanzarDatosInvalidos({ foto: 'Solo se aceptan imágenes JPG, PNG o WEBP.' });
    }

    const total = await contarFotos(id);

    if (total >= LIMITE_FOTOS) {
        throw new ErrorNegocio(409, 'LIMITE_FOTOS',
            `Una mascota puede tener máximo ${LIMITE_FOTOS} fotos.`,
            { foto: `Ya tiene ${LIMITE_FOTOS} fotos.` });
    }

    const ruta = await guardarFoto(archivo.buffer, extension);

    try {
        await insertarFoto({ idMascota: id, ruta, esPrincipal: total === 0 });
    } catch (err) {
        // La fila no se guardó: se deshace el archivo para no dejar basura.
        await borrarFoto(ruta);
        throw err;
    }

    return obtenerUno(id, usuario);
}

// Devuelve la ruta relativa del archivo si quien la pide puede verla.
// Al adoptante una foto de una mascota que no ve le da 404.
export async function obtenerRutaFoto(valorIdFoto, usuario) {
    const foto = await buscarFoto(validarId(valorIdFoto));

    if (!foto || (!esStaff(usuario) && (foto.ACTIVO !== 'S' || foto.ES_VISIBLE !== 'S'))) {
        throw new ErrorNegocio(404, 'FOTO_NO_EXISTE', 'La foto no existe.');
    }

    return foto.RUTA_ARCHIVO;
}

export async function marcarFotoPrincipal(valorIdFoto, usuario) {
    const foto = await buscarFoto(validarId(valorIdFoto));

    if (!foto) {
        throw new ErrorNegocio(404, 'FOTO_NO_EXISTE', 'La foto no existe.');
    }

    if (foto.ES_PRINCIPAL !== 'S') {
        await marcarPrincipal(foto.ID_FOTO, foto.ID_MASCOTA);
    }

    return obtenerUno(foto.ID_MASCOTA, usuario);
}

// Para el selector del formulario: solo los estados que el staff elige.
export async function obtenerEstadosElegibles() {
    const filas = await listarEstadosElegibles(ESTADOS_ELEGIBLES);
    return filas.map((fila) => ({ id: fila.ID_ESTADO_MASCOTA, nombre: etiquetaEstado(fila.NOMBRE) }));
}

// Primero se borra la fila (si falla, no pasó nada); después el archivo.
// Si el archivo no se puede borrar, la foto ya no existe para el sistema:
// queda un archivo huérfano, se avisa en el log y no se le falla al usuario.
export async function eliminarUnaFoto(valorIdFoto, usuario) {
    const foto = await buscarFoto(validarId(valorIdFoto));

    if (!foto) {
        throw new ErrorNegocio(404, 'FOTO_NO_EXISTE', 'La foto no existe.');
    }

    await eliminarFoto(foto.ID_FOTO, foto.ID_MASCOTA, foto.ES_PRINCIPAL === 'S');

    try {
        await borrarFoto(foto.RUTA_ARCHIVO);
    } catch (err) {
        console.error(`No se pudo borrar el archivo ${foto.RUTA_ARCHIVO}:`, err.message);
    }

    return obtenerUno(foto.ID_MASCOTA, usuario);
}

// ---- Para el módulo de solicitudes ----------------------------------------
// El estado EN_PROCESO lo maneja el sistema, no el staff a mano. El módulo
// de solicitudes lo pide a través de estas dos funciones (nunca toca
// MASCOTAS directamente).

// DISPONIBLE → EN_PROCESO. Devuelve true si la mascota estaba disponible.
export async function reservarMascotaParaProceso(idMascota) {
    return (await cambiarEstadoSiEs(idMascota, DISPONIBLE, EN_PROCESO)) === 1;
}

// EN_PROCESO → DISPONIBLE (el trámite se canceló o falló antes de entregar).
export async function liberarMascotaDeProceso(idMascota) {
    return (await cambiarEstadoSiEs(idMascota, EN_PROCESO, DISPONIBLE)) === 1;
}

// EN_PROCESO → EN_PRUEBA (se entregó la mascota y empieza el periodo de prueba).
export async function pasarMascotaAPrueba(idMascota) {
    return (await cambiarEstadoSiEs(idMascota, EN_PROCESO, EN_PRUEBA)) === 1;
}

// EN_PRUEBA → EN_PROCESO. Solo para deshacer una entrega que no se pudo completar.
export async function revertirMascotaAProceso(idMascota) {
    return (await cambiarEstadoSiEs(idMascota, EN_PRUEBA, EN_PROCESO)) === 1;
}

// EN_PRUEBA → ADOPTADA (el staff confirmó la adopción).
export async function marcarMascotaAdoptada(idMascota) {
    return (await cambiarEstadoSiEs(idMascota, EN_PRUEBA, ADOPTADA)) === 1;
}

// EN_PRUEBA → DISPONIBLE (la mascota volvió al albergue y puede ser adoptada de nuevo).
export async function devolverMascotaAlAlbergue(idMascota) {
    return (await cambiarEstadoSiEs(idMascota, EN_PRUEBA, DISPONIBLE)) === 1;
}

// Deshacen un cierre que no se pudo completar (vuelven a EN_PRUEBA).
export async function revertirMascotaAdoptada(idMascota) {
    return (await cambiarEstadoSiEs(idMascota, ADOPTADA, EN_PRUEBA)) === 1;
}

export async function revertirDevolucionDeMascota(idMascota) {
    return (await cambiarEstadoSiEs(idMascota, DISPONIBLE, EN_PRUEBA)) === 1;
}

// Cifras para el panel de Inicio del staff.
export async function obtenerResumenMascotas() {
    const fila = await contarResumenMascotas();

    return {
        disponibles: fila.DISPONIBLES,
        enTratamiento: fila.EN_TRATAMIENTO,
        enProceso: fila.EN_PROCESO,
        enPrueba: fila.EN_PRUEBA
    };
}
