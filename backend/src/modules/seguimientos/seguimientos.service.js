// Capa de SERVICE de SEGUIMIENTOS. Por ahora: programar los checkpoints
// cuando se registra la entrega de una mascota (regla 3-3-3).
// Lo llama el service de solicitudes; nunca su repository directamente.

import { programarSeguimientos } from './seguimientos.repository.js';

// Devuelve cuántos checkpoints quedaron programados.
export async function programarCheckpoints(idSolicitud, fechaEntrega) {
    return programarSeguimientos(idSolicitud, fechaEntrega);
}
