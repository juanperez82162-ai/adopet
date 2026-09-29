import { ErrorNegocio } from '../../utils/errores.js';
import {
    listarActivasPorEspecie,
    listarTodasPorEspecie,
    especieActiva,
    insertarRaza,
    actualizarNombreRaza,
    actualizarActivoRaza
} from './razas.repository.js';

export const LARGO_NOMBRE_RAZA = 50;

export async function obtenerRazasActivas(idEspecie) {
    const filas = await listarActivasPorEspecie(idEspecie);
    return filas.map((fila) => ({ id: fila.ID, nombre: fila.NOMBRE }));
}

export async function obtenerRazasAdmin(idEspecie) {
    const filas = await listarTodasPorEspecie(idEspecie);
    return filas.map((fila) => ({ id: fila.ID, nombre: fila.NOMBRE, activo: fila.ACTIVO === 'S' }));
}

export async function crearRaza(idEspecie, nombre) {
    if (!(await especieActiva(idEspecie))) {
        throw new ErrorNegocio(400, 'ESPECIE_INVALIDA', 'La especie no existe o está desactivada.');
    }

    try {
        const id = await insertarRaza(idEspecie, nombre);
        return { id, nombre, activo: true };
    } catch (err) {
        traducirDuplicado(err);
        throw err;
    }
}

export async function renombrarRaza(id, nombre) {
    let filasAfectadas;

    try {
        filasAfectadas = await actualizarNombreRaza(id, nombre);
    } catch (err) {
        traducirDuplicado(err);
        throw err;
    }

    if (filasAfectadas === 0) {
        throw new ErrorNegocio(404, 'VALOR_NO_EXISTE', 'La raza no existe.');
    }

    return { id, nombre };
}

export async function cambiarEstadoRaza(id, activo) {
    const filasAfectadas = await actualizarActivoRaza(id, activo ? 'S' : 'N');

    if (filasAfectadas === 0) {
        throw new ErrorNegocio(404, 'VALOR_NO_EXISTE', 'La raza no existe.');
    }

    return { id, activo };
}

function traducirDuplicado(err) {
    if (err.errorNum === 1) {
        throw new ErrorNegocio(409, 'NOMBRE_DUPLICADO', 'Ya existe una raza con ese nombre en esta especie.');
    }
}
