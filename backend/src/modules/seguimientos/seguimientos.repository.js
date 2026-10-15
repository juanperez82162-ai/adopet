// Capa de REPOSITORY de SEGUIMIENTOS: el ÚNICO lugar con SQL del módulo.
// El instrumento (preguntas, opciones, semáforo) vive en la base; aquí solo
// se lee y se guardan las respuestas. Las fechas se comparan con la hora de
// la base (SYSDATE), que es la que manda.

import { conConexion, enTransaccion } from '../../config/database.js';

// Crea un seguimiento por cada etapa activa (día 3, semana 3, mes 3...).
// La fecha sale de ETAPAS_SEGUIMIENTO.DIAS_DESDE_ENTREGA: agregar una etapa
// es insertar una fila, sin tocar este código. Es UNA sola sentencia, así
// que o se crean todos o ninguno. Devuelve cuántos creó.
export async function programarSeguimientos(idSolicitud, fechaEntrega) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `INSERT INTO SEGUIMIENTOS (ID_SOLICITUD, ID_ETAPA, FECHA_PROGRAMADA)
             SELECT :idSolicitud, e.ID_ETAPA, TRUNC(:fechaEntrega) + e.DIAS_DESDE_ENTREGA
               FROM ETAPAS_SEGUIMIENTO e
              WHERE e.ACTIVO = 'S'`,
            { idSolicitud, fechaEntrega },
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    });
}

const NOMBRE_ADOPTANTE = `REGEXP_REPLACE(TRIM(u.PRIMER_NOMBRE || ' ' || u.SEGUNDO_NOMBRE || ' ' || u.PRIMER_APELLIDO || ' ' || u.SEGUNDO_APELLIDO), ' +', ' ')`;

// YA_TOCA: ya llegó la fecha programada. EN_PLAZO: aún no pasan los días que
// tiene el adoptante para responder (diasPlazo, de la configuración).
const SELECT_SEGUIMIENTO = `
    SELECT sg.ID_SEGUIMIENTO,
           sg.ID_SOLICITUD,
           s.DOCUMENTO,
           ${NOMBRE_ADOPTANTE} AS NOMBRE_ADOPTANTE,
           u.TELEFONO,
           s.ID_MASCOTA,
           m.NOMBRE AS MASCOTA,
           s.ID_ESTADO_PROCESO,
           sg.ID_ETAPA,
           et.NOMBRE AS ETAPA,
           et.DIAS_DESDE_ENTREGA,
           sg.FECHA_PROGRAMADA,
           sg.FECHA_PROGRAMADA + :diasPlazo AS FECHA_LIMITE,
           CASE WHEN TRUNC(SYSDATE) >= sg.FECHA_PROGRAMADA THEN 'S' ELSE 'N' END AS YA_TOCA,
           CASE WHEN TRUNC(SYSDATE) <= sg.FECHA_PROGRAMADA + :diasPlazo THEN 'S' ELSE 'N' END AS EN_PLAZO,
           sg.FECHA_RESPUESTA,
           sg.SOLICITA_CONTACTO,
           sg.COMENTARIO,
           sg.PUNTAJE,
           sg.ID_SEMAFORO,
           sm.NOMBRE AS SEMAFORO
      FROM SEGUIMIENTOS sg
      JOIN SOLICITUDES_ADOPCION s ON s.ID_SOLICITUD = sg.ID_SOLICITUD
      JOIN USUARIOS u ON u.DOCUMENTO = s.DOCUMENTO
      JOIN MASCOTAS m ON m.ID_MASCOTA = s.ID_MASCOTA
      JOIN ETAPAS_SEGUIMIENTO et ON et.ID_ETAPA = sg.ID_ETAPA
      LEFT JOIN SEMAFOROS sm ON sm.ID_SEMAFORO = sg.ID_SEMAFORO`;

// filtros: { documento (solo los de esa persona), idSolicitud }.
export async function listarSeguimientos(filtros, diasPlazo) {
    return conConexion(async (conexion) => {
        const condiciones = [];
        const valores = { diasPlazo };

        if (filtros.documento) {
            condiciones.push('s.DOCUMENTO = :documento');
            valores.documento = filtros.documento;
        }

        if (filtros.idSolicitud) {
            condiciones.push('sg.ID_SOLICITUD = :idSolicitud');
            valores.idSolicitud = filtros.idSolicitud;
        }

        const donde = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

        const r = await conexion.execute(
            `${SELECT_SEGUIMIENTO} ${donde} ORDER BY sg.FECHA_PROGRAMADA, sg.ID_SEGUIMIENTO`,
            valores
        );
        return r.rows;
    });
}

export async function buscarSeguimiento(idSeguimiento, diasPlazo) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `${SELECT_SEGUIMIENTO} WHERE sg.ID_SEGUIMIENTO = :idSeguimiento`,
            { idSeguimiento, diasPlazo }
        );
        return r.rows[0];
    });
}

// Preguntas activas con sus opciones activas, ordenadas. Una fila por opción.
export async function listarInstrumento() {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `SELECT p.ID_PREGUNTA, p.TEXTO AS PREGUNTA, p.ORDEN AS ORDEN_PREGUNTA,
                    o.ID_OPCION, o.TEXTO AS OPCION, o.PUNTAJE, o.ES_ALARMA, o.ORDEN AS ORDEN_OPCION
               FROM PREGUNTAS_CHECKPOINT p
               JOIN OPCIONES_CHECKPOINT o ON o.ID_PREGUNTA = p.ID_PREGUNTA AND o.ACTIVO = 'S'
              WHERE p.ACTIVO = 'S'
              ORDER BY p.ORDEN, p.ID_PREGUNTA, o.ORDEN, o.ID_OPCION`
        );
        return r.rows;
    });
}

export async function listarSemaforos() {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `SELECT ID_SEMAFORO, NOMBRE, PUNTAJE_MIN, PUNTAJE_MAX
               FROM SEMAFOROS WHERE ACTIVO = 'S' ORDER BY ID_SEMAFORO`
        );
        return r.rows;
    });
}

// Lo que respondió el adoptante, con el texto de cada pregunta y opción (para el staff).
export async function listarRespuestas(idSeguimiento) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `SELECT p.TEXTO AS PREGUNTA, o.TEXTO AS OPCION, o.PUNTAJE, o.ES_ALARMA
               FROM RESPUESTAS_SEGUIMIENTO rs
               JOIN PREGUNTAS_CHECKPOINT p ON p.ID_PREGUNTA = rs.ID_PREGUNTA
               JOIN OPCIONES_CHECKPOINT o ON o.ID_OPCION = rs.ID_OPCION
              WHERE rs.ID_SEGUIMIENTO = :idSeguimiento
              ORDER BY p.ORDEN, p.ID_PREGUNTA`,
            { idSeguimiento }
        );
        return r.rows;
    });
}

// Guarda las respuestas y cierra el checkpoint en UNA transacción: o queda
// todo o nada. Solo si el checkpoint sigue sin responder. Devuelve true si guardó.
export async function guardarRespuestas(d) {
    return enTransaccion(async (conexion) => {
        const r = await conexion.execute(
            `UPDATE SEGUIMIENTOS
                SET FECHA_RESPUESTA = SYSDATE,
                    SOLICITA_CONTACTO = :solicitaContacto,
                    COMENTARIO = :comentario,
                    PUNTAJE = :puntaje,
                    ID_SEMAFORO = :idSemaforo
              WHERE ID_SEGUIMIENTO = :idSeguimiento
                AND FECHA_RESPUESTA IS NULL`,
            {
                idSeguimiento: d.idSeguimiento,
                solicitaContacto: d.solicitaContacto,
                comentario: d.comentario,
                puntaje: d.puntaje,
                idSemaforo: d.idSemaforo
            }
        );

        if (r.rowsAffected !== 1) return false;

        await conexion.executeMany(
            `INSERT INTO RESPUESTAS_SEGUIMIENTO (ID_SEGUIMIENTO, ID_PREGUNTA, ID_OPCION)
             VALUES (:idSeguimiento, :idPregunta, :idOpcion)`,
            d.respuestas.map((x) => ({ idSeguimiento: d.idSeguimiento, idPregunta: x.idPregunta, idOpcion: x.idOpcion }))
        );

        return true;
    });
}

// Checkpoints de adopciones EN_PRUEBA (3) que nadie respondió y cuyo plazo ya
// terminó. Los de trámites cerrados no se alertan.
export async function listarNoAtendidos(diasPlazo) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `${SELECT_SEGUIMIENTO}
              WHERE s.ID_ESTADO_PROCESO = 3
                AND sg.FECHA_RESPUESTA IS NULL
                AND TRUNC(SYSDATE) > sg.FECHA_PROGRAMADA + :diasPlazo
              ORDER BY sg.FECHA_PROGRAMADA, sg.ID_SEGUIMIENTO`,
            { diasPlazo }
        );
        return r.rows;
    });
}
