import { exito } from '../../utils/respuesta.js';
import {
    obtenerMatriz,
    guardarPermisos,
    crearPerfil,
    renombrarPerfil,
    cambiarEstadoPerfil
} from './accesos.service.js';

export async function verMatriz(req, res) {
    return exito(res, await obtenerMatriz());
}

export async function guardar(req, res) {
    return exito(res, await guardarPermisos(req.params.idPerfil, req.body ?? {}));
}

export async function nuevoPerfil(req, res) {
    return exito(res, await crearPerfil(req.body ?? {}), 201);
}

export async function renombrar(req, res) {
    return exito(res, await renombrarPerfil(req.params.idPerfil, req.body ?? {}));
}

export async function cambiarEstado(req, res) {
    return exito(res, await cambiarEstadoPerfil(req.params.idPerfil, req.body ?? {}));
}
