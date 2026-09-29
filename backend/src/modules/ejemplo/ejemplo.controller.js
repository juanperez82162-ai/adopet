// Capa de CONTROLLER: traduce HTTP a llamadas del service y responde.
// - Saca los datos de req (params, query, body, usuario del token).
// - Llama al service.
// - Responde con exito(res, datos, codigoHttp).
// No tiene reglas de negocio ni SQL. Los errores los lanza el service
// (ErrorNegocio) y los atrapa el middleware central de errores: Express 5
// pasa solo al manejador los errores de las funciones async.

import { exito } from '../../utils/respuesta.js';
import {
    obtenerTodos,
    obtenerUno,
    crearEjemplo,
    modificarEjemplo,
    cambiarEstadoEjemplo
} from './ejemplo.service.js';

export async function listar(req, res) {
    // Los filtros llegan por la URL: /api/ejemplos?texto=abc&estado=activos
    return exito(res, await obtenerTodos(req.query));
}

export async function ver(req, res) {
    return exito(res, await obtenerUno(req.params.id));
}

export async function crear(req, res) {
    // 201 = creado.
    return exito(res, await crearEjemplo(req.body ?? {}), 201);
}

export async function modificar(req, res) {
    return exito(res, await modificarEjemplo(req.params.id, req.body ?? {}));
}

export async function cambiarEstado(req, res) {
    return exito(res, await cambiarEstadoEjemplo(req.params.id, req.body ?? {}));
}
