// Capa de REPOSITORY: el ÚNICO lugar donde hay SQL en el módulo.
// - Cada función hace una consulta y devuelve filas tal como las da Oracle.
// - No decide nada: las reglas van en el service.
// - Los valores SIEMPRE van como bind variables (:nombre), nunca pegados
//   al texto del SQL: así se evita la inyección de SQL.
// - conConexion presta una conexión del pool y la devuelve siempre.
//   Si varias escrituras deben guardarse juntas (o ninguna), se usa
//   enTransaccion en lugar de conConexion, y SIN autoCommit.

import oracledb from 'oracledb';
import { conConexion } from '../../config/database.js';

// CAMBIA ESTO: la tabla EJEMPLOS no existe; es solo para la plantilla.
// Columnas supuestas: ID_EJEMPLO (IDENTITY), NOMBRE (único), DESCRIPCION
// (opcional) y ACTIVO ('S'/'N').

// Búsqueda sin tildes ni mayúsculas: NLS_SORT/NLS_COMP no se tocan;
// se compara con UPPER y TRANSLATE sobre las vocales tildadas.
const SIN_TILDES = (columna) =>
    `TRANSLATE(UPPER(${columna}), 'ÁÉÍÓÚÜ', 'AEIOUU')`;

export async function listarEjemplos({ texto, estado }) {
    return conConexion(async (conexion) => {
        const condiciones = [];
        const valores = {};

        if (texto) {
            condiciones.push(`${SIN_TILDES('NOMBRE')} LIKE '%' || ${SIN_TILDES(':texto')} || '%'`);
            valores.texto = texto;
        }

        if (estado !== 'todos') {
            condiciones.push('ACTIVO = :activo');
            valores.activo = estado === 'activos' ? 'S' : 'N';
        }

        const donde = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

        const resultado = await conexion.execute(
            `SELECT ID_EJEMPLO, NOMBRE, DESCRIPCION, ACTIVO
               FROM EJEMPLOS
               ${donde}
              ORDER BY NOMBRE`,
            valores
        );

        return resultado.rows;
    });
}

// Devuelve la fila o undefined si no existe.
export async function buscarPorId(id) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `SELECT ID_EJEMPLO, NOMBRE, DESCRIPCION, ACTIVO
               FROM EJEMPLOS
              WHERE ID_EJEMPLO = :id`,
            { id }
        );

        return resultado.rows[0];
    });
}

// Devuelve el id que Oracle generó (RETURNING ... INTO).
export async function insertarEjemplo({ nombre, descripcion }) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `INSERT INTO EJEMPLOS (NOMBRE, DESCRIPCION)
             VALUES (:nombre, :descripcion)
             RETURNING ID_EJEMPLO INTO :id`,
            {
                nombre,
                descripcion,
                id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            },
            { autoCommit: true }
        );

        return resultado.outBinds.id[0];
    });
}

export async function actualizarEjemplo(id, { nombre, descripcion }) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `UPDATE EJEMPLOS
                SET NOMBRE = :nombre,
                    DESCRIPCION = :descripcion
              WHERE ID_EJEMPLO = :id`,
            { nombre, descripcion, id },
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    });
}

export async function actualizarActivo(id, activo) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `UPDATE EJEMPLOS SET ACTIVO = :activo WHERE ID_EJEMPLO = :id`,
            { activo, id },
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    });
}
