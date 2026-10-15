// Capa de CONTROLLER de MASCOTAS: traduce HTTP a llamadas del service.
// - Saca los datos de req (params, query, body y usuario del token).
// - Llama al service y responde con exito(res, datos, codigoHttp).
// No tiene reglas de negocio ni SQL. Los errores los lanza el service
// (ErrorNegocio) y los atrapa el middleware central de errores.

import { exito } from '../../utils/respuesta.js';
import { config } from '../../config/env.js';
import {
    obtenerTodos,
    obtenerUno,
    crearMascota,
    modificarMascota,
    cambiarActivoMascota,
    subirFoto,
    obtenerRutaFoto,
    marcarFotoPrincipal,
    obtenerEstadosElegibles,
    eliminarUnaFoto
} from './mascotas.service.js';

export async function listar(req, res) {
    // Filtros por la URL: /api/mascotas?texto=luna&idEspecie=1&estado=activos
    return exito(res, await obtenerTodos(req.query, req.usuario));
}

export async function ver(req, res) {
    return exito(res, await obtenerUno(req.params.id, req.usuario));
}

export async function crear(req, res) {
    return exito(res, await crearMascota(req.body ?? {}, req.usuario), 201);
}

export async function modificar(req, res) {
    return exito(res, await modificarMascota(req.params.id, req.body ?? {}, req.usuario));
}

export async function cambiarEstado(req, res) {
    return exito(res, await cambiarActivoMascota(req.params.id, req.body ?? {}, req.usuario));
}

export async function subir(req, res) {
    return exito(res, await subirFoto(req.params.id, req.file, req.usuario), 201);
}

// La foto se entrega por aquí (con sesión) y no como archivo público.
// "root" impide salirse de la carpeta de fotos. "private" evita que un
// caché compartido la guarde y se la muestre a otra persona.
export async function verFoto(req, res) {
    const ruta = await obtenerRutaFoto(req.params.idFoto, req.usuario);

    return res.sendFile(ruta, {
        root: config.fotos.carpeta,
        headers: { 'Cache-Control': 'private, max-age=3600' }
    });
}

export async function hacerPrincipal(req, res) {
    return exito(res, await marcarFotoPrincipal(req.params.idFoto, req.usuario));
}

export async function estados(req, res) {
    return exito(res, await obtenerEstadosElegibles());
}

export async function eliminarFotoMascota(req, res) {
    return exito(res, await eliminarUnaFoto(req.params.idFoto, req.usuario));
}
