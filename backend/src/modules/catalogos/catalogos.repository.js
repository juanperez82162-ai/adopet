import oracledb from 'oracledb';
import { obtenerConexion } from '../../config/database.js';

// Los nombres de tabla y columna vienen SIEMPRE de catalogos.config.js
// (lista blanca), nunca de la petición. Los valores van como bind variables.

export async function listarActivos(catalogo) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT ${catalogo.columnaId} AS ID, NOMBRE
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
            `SELECT ${catalogo.columnaId} AS ID, NOMBRE, ACTIVO
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

export async function insertar(catalogo, nombre) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `INSERT INTO ${catalogo.tabla} (NOMBRE)
             VALUES (:nombre)
             RETURNING ${catalogo.columnaId} INTO :id`,
            {
                nombre,
                id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            },
            { autoCommit: true }
        );

        return resultado.outBinds.id[0];
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function actualizarNombre(catalogo, id, nombre) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `UPDATE ${catalogo.tabla}
                SET NOMBRE = :nombre
              WHERE ${catalogo.columnaId} = :id`,
            { nombre, id },
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
