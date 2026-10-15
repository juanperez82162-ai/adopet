// Capa de REPOSITORY de NOTIFICACIONES: el ÚNICO lugar con SQL del módulo.
// DOCUMENTO NULL = aviso para el staff como equipo (bandeja compartida).

import { conConexion } from '../../config/database.js';

const LIMITE = 100;

// Inserta el aviso salvo que ya exista uno igual (mismo tipo, solicitud,
// destinatario y mensaje). Así los jobs pueden correr todos los días sin
// repetir alertas. Devuelve las filas insertadas (0 o 1).
export async function insertarSiNoExiste({ documento, idTipo, mensaje, idSolicitud }) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `INSERT INTO NOTIFICACIONES (DOCUMENTO, ID_TIPO_NOTIFICACION, MENSAJE, ID_SOLICITUD)
             SELECT :documento, :idTipo, :mensaje, :idSolicitud
               FROM DUAL
              WHERE NOT EXISTS (
                    SELECT 1 FROM NOTIFICACIONES
                     WHERE ID_TIPO_NOTIFICACION = :idTipo
                       AND ID_SOLICITUD = :idSolicitud
                       AND MENSAJE = :mensaje
                       AND NVL(DOCUMENTO, '-') = NVL(:documento, '-'))`,
            { documento: documento ?? null, idTipo, mensaje, idSolicitud },
            { autoCommit: true }
        );
        return r.rowsAffected;
    });
}

// Las no leídas primero, por prioridad y luego las más recientes.
export async function listarNotificaciones(documento) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `SELECT * FROM (
                 SELECT n.ID_NOTIFICACION, n.ID_SOLICITUD, n.MENSAJE, n.FECHA_CREACION, n.FECHA_LECTURA,
                        t.NOMBRE AS TIPO, t.PRIORIDAD
                   FROM NOTIFICACIONES n
                   JOIN TIPOS_NOTIFICACION t ON t.ID_TIPO_NOTIFICACION = n.ID_TIPO_NOTIFICACION
                  WHERE NVL(n.DOCUMENTO, '-') = NVL(:documento, '-')
                  ORDER BY CASE WHEN n.FECHA_LECTURA IS NULL THEN 0 ELSE 1 END,
                           t.PRIORIDAD, n.FECHA_CREACION DESC, n.ID_NOTIFICACION DESC)
              WHERE ROWNUM <= ${LIMITE}`,
            { documento: documento ?? null }
        );
        return r.rows;
    });
}

export async function contarNoLeidas(documento) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `SELECT COUNT(*) AS TOTAL
               FROM NOTIFICACIONES
              WHERE FECHA_LECTURA IS NULL
                AND NVL(DOCUMENTO, '-') = NVL(:documento, '-')`,
            { documento: documento ?? null }
        );
        return r.rows[0].TOTAL;
    });
}

export async function buscarNotificacion(idNotificacion) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `SELECT ID_NOTIFICACION, DOCUMENTO, FECHA_LECTURA
               FROM NOTIFICACIONES WHERE ID_NOTIFICACION = :idNotificacion`,
            { idNotificacion }
        );
        return r.rows[0];
    });
}

// Solo marca las que siguen sin leer. Devuelve las filas cambiadas.
export async function marcarLeida(idNotificacion) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `UPDATE NOTIFICACIONES SET FECHA_LECTURA = SYSDATE
              WHERE ID_NOTIFICACION = :idNotificacion AND FECHA_LECTURA IS NULL`,
            { idNotificacion },
            { autoCommit: true }
        );
        return r.rowsAffected;
    });
}

export async function marcarTodasLeidas(documento) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `UPDATE NOTIFICACIONES SET FECHA_LECTURA = SYSDATE
              WHERE FECHA_LECTURA IS NULL
                AND NVL(DOCUMENTO, '-') = NVL(:documento, '-')`,
            { documento: documento ?? null },
            { autoCommit: true }
        );
        return r.rowsAffected;
    });
}
