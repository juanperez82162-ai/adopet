// Capa de CONTROLLER de SEGUIMIENTOS: traduce HTTP a llamadas del service.

import { exito } from '../../utils/respuesta.js';
import {
    obtenerFormulario,
    obtenerSeguimientos,
    obtenerSeguimiento,
    responder
} from './seguimientos.service.js';

export async function formulario(req, res) {
    return exito(res, await obtenerFormulario());
}

export async function listar(req, res) {
    return exito(res, await obtenerSeguimientos(req.query, req.usuario));
}

export async function ver(req, res) {
    return exito(res, await obtenerSeguimiento(req.params.id, req.usuario));
}

export async function responderSeguimiento(req, res) {
    return exito(res, await responder(req.params.id, req.body ?? {}, req.usuario));
}
