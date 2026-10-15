// Capa de CONTROLLER de SOLICITUDES: traduce HTTP a llamadas del service.
// No tiene reglas de negocio ni SQL.

import { exito } from '../../utils/respuesta.js';
import {
    obtenerOpcionesCuestionario,
    recomendarMascotas,
    crearSolicitud,
    obtenerSolicitudes,
    obtenerSolicitud,
    formalizar,
    cancelar,
    cancelarPropia
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

export async function listar(req, res) {
    return exito(res, await obtenerSolicitudes(req.query, req.usuario));
}

export async function ver(req, res) {
    return exito(res, await obtenerSolicitud(req.params.id, req.usuario));
}

export async function formalizarSolicitud(req, res) {
    return exito(res, await formalizar(req.params.id, req.body ?? {}, req.usuario));
}

export async function cancelarSolicitud(req, res) {
    return exito(res, await cancelar(req.params.id, req.body ?? {}, req.usuario));
}

export async function cancelarMiSolicitud(req, res) {
    return exito(res, await cancelarPropia(req.params.id, req.body ?? {}, req.usuario));
}
