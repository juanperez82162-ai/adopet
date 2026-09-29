import oracledb from 'oracledb';
import { obtenerConexion } from '../../config/database.js';

// Los nombres de tabla y columna vienen SIEMPRE de catalogos.config.js
// (lista blanca), nunca de la petición. Los valores van como bind variables.

function columnasExtra(catalogo) {
    const columnas = [];

    if (catalogo.conNivel) {
        columnas.push('NIVEL');
    }

    if (catalogo.conOtro) {
        columnas.push('ES_OTRO');
    }

    return columnas.length > 0 ? `, ${columnas.join(', ')}` : '';
}

export async function listarActivos(catalogo) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT ${catalogo.columnaId} AS ID, NOMBRE${columnasExtra(catalogo)}
               FROM ${catalogo.tabla}
              WHERE ACTIVO = 'S'
              ORDER BY ${catalogo.columnaId}`
        );

        return resultado.rows;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function listarTodos(catalogo) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT ${catalogo.columnaId} AS ID, NOMBRE, ACTIVO${columnasExtra(catalogo)}
               FROM ${catalogo.tabla}
              ORDER BY ${catalogo.columnaId}`
        );

        return resultado.rows;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function insertar(catalogo, { nombre, nivel }) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const columnas = catalogo.conNivel ? 'NOMBRE, NIVEL' : 'NOMBRE';
        const valores = catalogo.conNivel ? ':nombre, :nivel' : ':nombre';
        const binds = {
            nombre,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        };

        if (catalogo.conNivel) {
            binds.nivel = nivel;
        }

        const resultado = await conexion.execute(
            `INSERT INTO ${catalogo.tabla} (${columnas})
             VALUES (${valores})
             RETURNING ${catalogo.columnaId} INTO :id`,
            binds,
            { autoCommit: true }
        );

        return resultado.outBinds.id[0];
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function actualizar(catalogo, id, { nombre, nivel }) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const asignaciones = catalogo.conNivel ? 'NOMBRE = :nombre, NIVEL = :nivel' : 'NOMBRE = :nombre';
        const binds = catalogo.conNivel ? { nombre, nivel, id } : { nombre, id };

        const resultado = await conexion.execute(
            `UPDATE ${catalogo.tabla}
                SET ${asignaciones}
              WHERE ${catalogo.columnaId} = :id`,
            binds,
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function actualizarActivo(catalogo, id, activo) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `UPDATE ${catalogo.tabla}
                SET ACTIVO = :activo
              WHERE ${catalogo.columnaId} = :id`,
            { activo, id },
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}
