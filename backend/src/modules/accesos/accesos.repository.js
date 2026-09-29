import oracledb from 'oracledb';
import { obtenerConexion } from '../../config/database.js';

// Todos los perfiles, activos o no, con cuántos usuarios tiene cada uno.
export async function listarPerfiles() {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT p.ID_PERFIL, p.NOMBRE_PERFIL, p.ACTIVO, p.ID_ROL, r.NOMBRE_ROL,
                    (SELECT COUNT(*) FROM USUARIOS u WHERE u.ID_PERFIL = p.ID_PERFIL) AS TOTAL_USUARIOS
               FROM PERFILES p
               JOIN ROLES r ON r.ID_ROL = p.ID_ROL
              ORDER BY r.ID_ROL, p.ID_PERFIL`
        );

        return resultado.rows;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function listarRoles() {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT ID_ROL, NOMBRE_ROL
               FROM ROLES
              ORDER BY ID_ROL`
        );

        return resultado.rows;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function insertarPerfil(nombre, idRol) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `INSERT INTO PERFILES (ID_ROL, NOMBRE_PERFIL)
             VALUES (:idRol, :nombre)
             RETURNING ID_PERFIL INTO :id`,
            {
                idRol,
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

export async function actualizarNombrePerfil(idPerfil, nombre) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        await conexion.execute(
            `UPDATE PERFILES
                SET NOMBRE_PERFIL = :nombre
              WHERE ID_PERFIL = :idPerfil`,
            { nombre, idPerfil },
            { autoCommit: true }
        );
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function actualizarEstadoPerfil(idPerfil, activo) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        await conexion.execute(
            `UPDATE PERFILES
                SET ACTIVO = :activo
              WHERE ID_PERFIL = :idPerfil`,
            { activo, idPerfil },
            { autoCommit: true }
        );
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function listarOpcionesActivas() {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT ID_OPCION_MENU, NOMBRE_OPCION, ETIQUETA, ORDEN
               FROM OPCIONES_MENU
              WHERE ACTIVO = 'S'
              ORDER BY ORDEN`
        );

        return resultado.rows;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function listarPermisos() {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT ID_PERFIL, ID_OPCION_MENU, CREAR, MODIFICAR, ELIMINAR
               FROM PERFILES_OPCIONES`
        );

        return resultado.rows;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

// Reemplaza los permisos de un perfil sobre las opciones activas, en UNA
// transacción: o queda todo guardado o no cambia nada.
// permisos: [{ idOpcion, crear, modificar, eliminar }] con 'S' / 'N'.
// La existencia de la fila ES el permiso de ver: quitar "Ver" borra la fila.
export async function reemplazarPermisosPerfil(idPerfil, permisos) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        // 1. Se quitan las filas de las opciones activas que ya no se ven.
        const conservar = permisos.map((permiso) => permiso.idOpcion);
        const marcadores = conservar.map((_, indice) => `:o${indice}`).join(', ');
        const valoresBorrado = { idPerfil };
        conservar.forEach((idOpcion, indice) => {
            valoresBorrado[`o${indice}`] = idOpcion;
        });

        await conexion.execute(
            `DELETE FROM PERFILES_OPCIONES
              WHERE ID_PERFIL = :idPerfil
                AND ID_OPCION_MENU IN (SELECT ID_OPCION_MENU FROM OPCIONES_MENU WHERE ACTIVO = 'S')
                ${conservar.length > 0 ? `AND ID_OPCION_MENU NOT IN (${marcadores})` : ''}`,
            valoresBorrado
        );

        // 2. Se crean o actualizan las que sí se ven.
        if (permisos.length > 0) {
            await conexion.executeMany(
                `MERGE INTO PERFILES_OPCIONES po
                 USING (SELECT :idPerfil  AS ID_PERFIL,
                               :idOpcion  AS ID_OPCION_MENU,
                               :crear     AS CREAR,
                               :modificar AS MODIFICAR,
                               :eliminar  AS ELIMINAR
                          FROM DUAL) nuevo
                    ON (po.ID_PERFIL = nuevo.ID_PERFIL AND po.ID_OPCION_MENU = nuevo.ID_OPCION_MENU)
                 WHEN MATCHED THEN UPDATE
                      SET po.CREAR = nuevo.CREAR, po.MODIFICAR = nuevo.MODIFICAR, po.ELIMINAR = nuevo.ELIMINAR
                 WHEN NOT MATCHED THEN INSERT (ID_PERFIL, ID_OPCION_MENU, CREAR, MODIFICAR, ELIMINAR)
                      VALUES (nuevo.ID_PERFIL, nuevo.ID_OPCION_MENU, nuevo.CREAR, nuevo.MODIFICAR, nuevo.ELIMINAR)`,
                permisos.map((permiso) => ({
                    idPerfil,
                    idOpcion: permiso.idOpcion,
                    crear: permiso.crear,
                    modificar: permiso.modificar,
                    eliminar: permiso.eliminar
                }))
            );
        }

        await conexion.commit();
    } catch (err) {
        if (conexion) {
            await conexion.rollback();
        }
        throw err;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}
