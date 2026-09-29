import { ErrorNegocio } from '../../utils/errores.js';
import {
    listarActivos,
    listarTodos,
    insertar,
    actualizarNombre,
    actualizarActivo
} from './catalogos.repository.js';

export async function obtenerActivos(catalogo) {
    const filas = await listarActivos(catalogo);
    return filas.map((fila) => ({ id: fila.ID, nombre: fila.NOMBRE }));
}

export async function obtenerTodos(catalogo) {
    const filas = await listarTodos(catalogo);
    return filas.map((fila) => ({ id: fila.ID, nombre: fila.NOMBRE, activo: fila.ACTIVO === 'S' }));
}

export async function crear(catalogo, nombre) {
    if (catalogo.idFijo) {
        throw new ErrorNegocio(
            409,
            'CATALOGO_SOLO_MIGRACION',
            'Este catálogo tiene valores fijos: sus opciones nuevas se agregan con una migración.'
        );
    }

    try {
        const id = await insertar(catalogo, nombre);
        return { id, nombre, activo: true };
    } catch (err) {
        traducirDuplicado(err);
        throw err;
    }
}

export async function renombrar(catalogo, id, nombre) {
    let filasAfectadas;

    try {
        filasAfectadas = await actualizarNombre(catalogo, id, nombre);
    } catch (err) {
        traducirDuplicado(err);
        throw err;
    }

    if (filasAfectadas === 0) {
        throw new ErrorNegocio(404, 'VALOR_NO_EXISTE', 'El valor del catálogo no existe.');
    }

    return { id, nombre };
}

export async function cambiarEstado(catalogo, id, activo) {
    if (!activo && !catalogo.permiteDesactivar) {
        throw new ErrorNegocio(
            409,
            'CATALOGO_NO_DESACTIVABLE',
            'Los valores de este catálogo no se pueden desactivar: el flujo del sistema depende de ellos.'
        );
    }

    const filasAfectadas = await actualizarActivo(catalogo, id, activo ? 'S' : 'N');

    if (filasAfectadas === 0) {
        throw new ErrorNegocio(404, 'VALOR_NO_EXISTE', 'El valor del catálogo no existe.');
    }

    return { id, activo };
}

function traducirDuplicado(err) {
    if (err.errorNum === 1) {
        throw new ErrorNegocio(409, 'NOMBRE_DUPLICADO', 'Ya existe un valor con ese nombre en el catálogo.');
    }
}
