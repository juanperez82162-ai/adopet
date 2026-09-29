// Capa de SERVICE: aquí viven TODAS las reglas de negocio del módulo.
// - Valida los datos y devuelve los errores campo por campo (detalles),
//   para que el formulario del frontend marque cada campo en rojo.
// - Decide qué se puede hacer y qué no (409 si el estado no lo permite).
// - Convierte las filas de Oracle (MAYUSCULAS, 'S'/'N') a objetos de
//   JavaScript (camelCase, true/false) antes de devolverlas.
// Puede llamar a OTRO service (por ejemplo al de catálogos), pero NUNCA
// al repository de otro módulo.

import { ErrorNegocio } from '../../utils/errores.js';
import {
    listarEjemplos,
    buscarPorId,
    insertarEjemplo,
    actualizarEjemplo,
    actualizarActivo
} from './ejemplo.repository.js';

// CAMBIA ESTO: los límites deben coincidir con el tamaño de las columnas.
export const LARGO_MAXIMO_NOMBRE = 60;
export const LARGO_MAXIMO_DESCRIPCION = 200;

// ---- Conversión fila de Oracle → objeto de la API --------------------

function aEjemplo(fila) {
    return {
        id: fila.ID_EJEMPLO,
        nombre: fila.NOMBRE,
        descripcion: fila.DESCRIPCION,
        activo: fila.ACTIVO === 'S'
    };
}

// ---- Validaciones ----------------------------------------------------

function validarId(valor) {
    const id = Number(valor);

    if (!Number.isInteger(id) || id <= 0) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'id: debe ser un número entero positivo.');
    }

    return id;
}

// Devuelve los datos limpios o lanza 400 con { campo: mensaje }.
// El frontend tiene una copia de estas reglas (ejemplo.validaciones.js)
// para avisar mientras se escribe; la que protege de verdad es esta.
function validarDatos(cuerpo) {
    const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';
    const descripcion = typeof cuerpo.descripcion === 'string' ? cuerpo.descripcion.trim() : '';
    const errores = {};

    if (!nombre) {
        errores.nombre = 'Escribe el nombre.';
    } else if (nombre.length > LARGO_MAXIMO_NOMBRE) {
        errores.nombre = `Máximo ${LARGO_MAXIMO_NOMBRE} caracteres.`;
    }

    if (descripcion.length > LARGO_MAXIMO_DESCRIPCION) {
        errores.descripcion = `Máximo ${LARGO_MAXIMO_DESCRIPCION} caracteres.`;
    }

    if (Object.keys(errores).length > 0) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'Revisa los campos marcados.', errores);
    }

    // Opcional vacío → null, para que Oracle guarde NULL y no ''.
    return { nombre, descripcion: descripcion || null };
}

// ORA-00001: se violó un índice único. Se traduce a un 409 legible.
function traducirDuplicado(err) {
    if (err.errorNum === 1) {
        throw new ErrorNegocio(409, 'NOMBRE_DUPLICADO', 'Ya existe un registro con ese nombre.',
            { nombre: 'Ya existe un registro con ese nombre.' });
    }
}

async function buscarExistente(id) {
    const fila = await buscarPorId(id);

    if (!fila) {
        throw new ErrorNegocio(404, 'EJEMPLO_NO_EXISTE', 'El registro no existe.');
    }

    return fila;
}

// ---- Casos de uso (lo que llama el controller) -----------------------

export async function obtenerTodos(consulta = {}) {
    const texto = typeof consulta.texto === 'string' ? consulta.texto.trim() : '';
    const estado = ['activos', 'inactivos'].includes(consulta.estado) ? consulta.estado : 'todos';

    const filas = await listarEjemplos({ texto, estado });
    return filas.map(aEjemplo);
}

export async function obtenerUno(valorId) {
    return aEjemplo(await buscarExistente(validarId(valorId)));
}

// Si el registro debe guardar quién lo creó, el controller le pasa también
// req.usuario ({ documento, nombre, idPerfil, rol }), que viene del token.
export async function crearEjemplo(cuerpo) {
    const datos = validarDatos(cuerpo);

    try {
        const id = await insertarEjemplo(datos);
        return obtenerUno(id);
    } catch (err) {
        traducirDuplicado(err);
        throw err;
    }
}

export async function modificarEjemplo(valorId, cuerpo) {
    const id = validarId(valorId);
    await buscarExistente(id);
    const datos = validarDatos(cuerpo);

    try {
        await actualizarEjemplo(id, datos);
    } catch (err) {
        traducirDuplicado(err);
        throw err;
    }

    return obtenerUno(id);
}

export async function cambiarEstadoEjemplo(valorId, cuerpo) {
    const id = validarId(valorId);

    if (typeof cuerpo.activo !== 'boolean') {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'activo: debe ser true o false.');
    }

    await buscarExistente(id);

    // CAMBIA ESTO: aquí van las reglas que impiden desactivar, con 409.
    // Ejemplo en Mascotas: no desactivar una mascota con una adopción ACTIVA.

    await actualizarActivo(id, cuerpo.activo ? 'S' : 'N');
    return obtenerUno(id);
}
