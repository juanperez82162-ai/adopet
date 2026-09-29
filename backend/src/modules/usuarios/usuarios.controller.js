import { exito } from '../../utils/respuesta.js';
import {
    obtenerMiPerfil,
    actualizarMiPerfil,
    cambiarMiContrasena,
    buscarUsuarios,
    obtenerPerfiles,
    obtenerUsuario,
    editarUsuario,
    cambiarPerfilUsuario,
    cambiarEstadoUsuario
} from './usuarios.service.js';

// ---- Mi perfil -------------------------------------------------------

export async function verMiPerfil(req, res) {
    return exito(res, await obtenerMiPerfil(req.usuario.documento));
}

export async function editarMiPerfil(req, res) {
    return exito(res, await actualizarMiPerfil(req.usuario.documento, req.body ?? {}));
}

export async function editarMiContrasena(req, res) {
    await cambiarMiContrasena(req.usuario.documento, req.body ?? {});
    return exito(res, { mensaje: 'Tu contraseña se cambió.' });
}

// ---- Administración --------------------------------------------------

export async function listar(req, res) {
    return exito(res, await buscarUsuarios(req.query));
}

export async function listarPerfiles(req, res) {
    return exito(res, await obtenerPerfiles());
}

export async function ver(req, res) {
    return exito(res, await obtenerUsuario(req.params.documento));
}

export async function editar(req, res) {
    return exito(res, await editarUsuario(req.params.documento, req.body ?? {}));
}

export async function cambiarPerfil(req, res) {
    return exito(res, await cambiarPerfilUsuario(req.usuario.documento, req.params.documento, req.body ?? {}));
}

export async function cambiarEstado(req, res) {
    return exito(res, await cambiarEstadoUsuario(req.usuario.documento, req.params.documento, req.body ?? {}));
}
