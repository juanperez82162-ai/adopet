// Capa de CONTROLLER de SOLICITUDES: traduce HTTP a llamadas del service.
// No tiene reglas de negocio ni SQL.

import { exito } from '../../utils/respuesta.js';
import {
    obtenerOpcionesCuestionario,
    recomendarMascotas,
    crearSolicitud
} from './solicitudes.service.js';

export async function opciones(req, res) {
    return exito(res, await obtenerOpcionesCuestionario());
}

export async function recomendar(req, res) {
    return exito(res, await recomendarMascotas(req.body ?? {}, req.usuario));
}

export async function crear(req, res) {
    return exito(res, await crearSolicitud(req.body ?? {}, req.usuario), 201);
}
