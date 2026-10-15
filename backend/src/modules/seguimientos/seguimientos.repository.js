// Capa de REPOSITORY de SEGUIMIENTOS: el ÚNICO lugar con SQL del módulo.
// Por ahora solo programa los checkpoints; el formulario, el semáforo y las
// alertas llegan en la fase de seguimiento.

import { conConexion } from '../../config/database.js';

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
