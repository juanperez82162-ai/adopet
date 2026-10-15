// Capa de CONTROLLER de NOTIFICACIONES: traduce HTTP a llamadas del service.

import { exito } from '../../utils/respuesta.js';
import {
    obtenerNotificaciones,
    obtenerContador,
    marcarComoLeida,
    marcarTodasComoLeidas
} from './notificaciones.service.js';

export async function listar(req, res) {
    return exito(res, await obtenerNotificaciones(req.usuario));
}

export async function contador(req, res) {
    return exito(res, await obtenerContador(req.usuario));
}

export async function leer(req, res) {
    return exito(res, await marcarComoLeida(req.params.id, req.usuario));
}

export async function leerTodas(req, res) {
    return exito(res, await marcarTodasComoLeidas(req.usuario));
}
