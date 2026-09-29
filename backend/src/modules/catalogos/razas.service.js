import { ErrorNegocio } from '../../utils/errores.js';
import {
    listarActivasPorEspecie,
    listarTodasPorEspecie,
    especieActiva,
    insertarRaza,
    actualizarNombreRaza,
    actualizarActivoRaza,
    contarOtrasRazasActivas
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
    // Cada especie debe conservar al menos una raza activa (por ejemplo Mestizo),
    // o no se podría registrar ninguna mascota de esa especie.
    if (!activo && (await contarOtrasRazasActivas(id)) === 0) {
        throw new ErrorNegocio(
            409,
            'ULTIMO_VALOR_ACTIVO',
            'No se puede desactivar: es la última raza activa de esta especie.'
        );
    }

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
