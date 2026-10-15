// Capa de SERVICE de NOTIFICACIONES.
// - Los otros módulos llaman a notificar() cuando pasa algo que el staff debe
//   saber. Todas las alertas van al staff como equipo (bandeja compartida):
//   si alguien la marca como leída, queda leída para todos.
// - El adoptante ve los avisos dirigidos a él: cambios de su solicitud y seguimientos por responder.
// Nunca llama al repository de otro módulo.

import { ErrorNegocio } from '../../utils/errores.js';
import {
    insertarSiNoExiste,
    listarNotificaciones,
    contarNoLeidas,
    buscarNotificacion,
    marcarLeida,
    marcarTodasLeidas
} from './notificaciones.repository.js';

export { TIPO } from './tipos.js';

// Debe coincidir con NOTIFICACIONES.MENSAJE.
export const LARGO_MAXIMO_MENSAJE = 255;

const ROL_STAFF = 'STAFF';

// Destinatario según quién consulta: el staff ve la bandeja compartida (NULL).
const destinatarioDe = (usuario) => (usuario.rol === ROL_STAFF ? null : usuario.documento);

function recortar(mensaje) {
    return mensaje.length > LARGO_MAXIMO_MENSAJE ? `${mensaje.slice(0, LARGO_MAXIMO_MENSAJE - 1)}…` : mensaje;
}

// Crea un aviso para el staff como equipo. Devuelve true si se creó y false si ya existía.
export async function notificarAlStaff(idTipo, mensaje, idSolicitud) {
    return (await insertarSiNoExiste({ documento: null, idTipo, mensaje: recortar(mensaje), idSolicitud })) === 1;
}

// Crea un aviso en la bandeja personal de un adoptante. Mismo contrato que el anterior.
export async function notificarAlAdoptante(documento, idTipo, mensaje, idSolicitud) {
    return (await insertarSiNoExiste({ documento, idTipo, mensaje: recortar(mensaje), idSolicitud })) === 1;
}

export async function obtenerNotificaciones(usuario) {
    const filas = await listarNotificaciones(destinatarioDe(usuario));

    return filas.map((n) => ({
        id: n.ID_NOTIFICACION,
        idSolicitud: n.ID_SOLICITUD,
        tipo: n.TIPO,
        prioridad: n.PRIORIDAD,
        mensaje: n.MENSAJE,
        fechaCreacion: n.FECHA_CREACION,
        leida: n.FECHA_LECTURA !== null
    }));
}

export async function obtenerContador(usuario) {
    return { noLeidas: await contarNoLeidas(destinatarioDe(usuario)) };
}

export async function marcarComoLeida(valorId, usuario) {
    const id = Number(valorId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'id: debe ser un número entero positivo.');
    }

    const fila = await buscarNotificacion(id);

    // Solo se ve y se marca lo que está en la propia bandeja.
    if (!fila || (fila.DOCUMENTO ?? null) !== destinatarioDe(usuario)) {
        throw new ErrorNegocio(404, 'NOTIFICACION_NO_ENCONTRADA', 'La notificación no existe.');
    }

    if (fila.FECHA_LECTURA === null) {
        await marcarLeida(id);
    }

    return { id, leida: true };
}

export async function marcarTodasComoLeidas(usuario) {
    return { marcadas: await marcarTodasLeidas(destinatarioDe(usuario)) };
}
