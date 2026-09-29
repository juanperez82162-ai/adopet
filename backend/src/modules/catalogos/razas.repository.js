import oracledb from 'oracledb';
import { obtenerConexion } from '../../config/database.js';

// RAZAS no es un catálogo simple: cada raza pertenece a una especie.
// Por eso tiene su propio repositorio dentro del módulo de catálogos.

export async function listarActivasPorEspecie(idEspecie) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT r.ID_RAZA AS ID, r.NOMBRE
               FROM RAZAS r
               JOIN ESPECIES e ON e.ID_ESPECIE = r.ID_ESPECIE
              WHERE r.ID_ESPECIE = :idEspecie
                AND r.ACTIVO = 'S'
                AND e.ACTIVO = 'S'
              ORDER BY r.NOMBRE`,
            { idEspecie }
        );

        return resultado.rows;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function listarTodasPorEspecie(idEspecie) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT ID_RAZA AS ID, NOMBRE, ACTIVO
               FROM RAZAS
              WHERE ID_ESPECIE = :idEspecie
              ORDER BY NOMBRE`,
            { idEspecie }
        );

        return resultado.rows;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function especieActiva(idEspecie) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT COUNT(*) AS TOTAL
               FROM ESPECIES
              WHERE ID_ESPECIE = :idEspecie
                AND ACTIVO = 'S'`,
            { idEspecie }
        );

        return resultado.rows[0].TOTAL === 1;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function insertarRaza(idEspecie, nombre) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `INSERT INTO RAZAS (ID_ESPECIE, NOMBRE)
             VALUES (:idEspecie, :nombre)
             RETURNING ID_RAZA INTO :id`,
            {
                idEspecie,
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

export async function actualizarNombreRaza(id, nombre) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `UPDATE RAZAS SET NOMBRE = :nombre WHERE ID_RAZA = :id`,
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

export async function actualizarActivoRaza(id, activo) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `UPDATE RAZAS SET ACTIVO = :activo WHERE ID_RAZA = :id`,
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

// Cuántas razas activas quedan en la misma especie sin contar la indicada.
export async function contarOtrasRazasActivas(id) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT COUNT(*) AS TOTAL
               FROM RAZAS
              WHERE ACTIVO = 'S'
                AND ID_RAZA <> :id
                AND ID_ESPECIE = (SELECT ID_ESPECIE FROM RAZAS WHERE ID_RAZA = :id)`,
            { id }
        );

        return resultado.rows[0].TOTAL;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}
