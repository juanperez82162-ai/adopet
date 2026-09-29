import oracledb from 'oracledb';
import { conConexion } from '../../config/database.js';

// Los nombres de tabla y columna vienen SIEMPRE de catalogos.config.js
// (lista blanca), nunca de la petición. Los valores van como bind variables.

function columnasExtra(catalogo) {
    const columnas = [];

    if (catalogo.conDescripcion) {
        columnas.push('DESCRIPCION');
    }

    if (catalogo.conNivel) {
        columnas.push('NIVEL');
    }

    if (catalogo.conOtro) {
        columnas.push('ES_OTRO');
    }

    if (catalogo.conReglasDocumento) {
        columnas.push('SOLO_NUMEROS', 'LARGO_MINIMO', 'LARGO_MAXIMO');
    }

    return columnas.length > 0 ? `, ${columnas.join(', ')}` : '';
}

export async function listarActivos(catalogo) {
    return conConexion(async (conexion) => {
        const orden = catalogo.conNivel ? `NIVEL, ${catalogo.columnaId}` : catalogo.columnaId;

        const resultado = await conexion.execute(
            `SELECT ${catalogo.columnaId} AS ID, NOMBRE${columnasExtra(catalogo)}
               FROM ${catalogo.tabla}
              WHERE ACTIVO = 'S'
              ORDER BY ${orden}`
        );

        return resultado.rows;
    });
}

export async function listarTodos(catalogo) {
    return conConexion(async (conexion) => {
        const orden = catalogo.conNivel ? `NIVEL, ${catalogo.columnaId}` : catalogo.columnaId;

        const resultado = await conexion.execute(
            `SELECT ${catalogo.columnaId} AS ID, NOMBRE, ACTIVO${columnasExtra(catalogo)}
               FROM ${catalogo.tabla}
              ORDER BY ${orden}`
        );

        return resultado.rows;
    });
}

// Solo lo usan los catálogos abiertos (sin nivel ni descripción obligatoria).
export async function insertar(catalogo, { nombre }) {
    return conConexion(async (conexion) => {
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
    });
}

// El nivel NO se edita desde la aplicación: lo definen las migraciones.
export async function actualizar(catalogo, id, { nombre, descripcion }) {
    return conConexion(async (conexion) => {
        const asignaciones = catalogo.conDescripcion
            ? 'NOMBRE = :nombre, DESCRIPCION = :descripcion'
            : 'NOMBRE = :nombre';
        const binds = catalogo.conDescripcion ? { nombre, descripcion, id } : { nombre, id };

        const resultado = await conexion.execute(
            `UPDATE ${catalogo.tabla}
                SET ${asignaciones}
              WHERE ${catalogo.columnaId} = :id`,
            binds,
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    });
}

export async function actualizarActivo(catalogo, id, activo) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `UPDATE ${catalogo.tabla}
                SET ACTIVO = :activo
              WHERE ${catalogo.columnaId} = :id`,
            { activo, id },
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    });
}

// Cuántos valores activos quedan en el catálogo sin contar el indicado.
export async function contarOtrosActivos(catalogo, id) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `SELECT COUNT(*) AS TOTAL
               FROM ${catalogo.tabla}
              WHERE ACTIVO = 'S'
                AND ${catalogo.columnaId} <> :id`,
            { id }
        );

        return resultado.rows[0].TOTAL;
    });
}
