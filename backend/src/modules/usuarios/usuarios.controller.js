import { exito } from '../../utils/respuesta.js';
import { obtenerMiPerfil, actualizarMiPerfil, cambiarMiContrasena } from './usuarios.service.js';

export async function verMiPerfil(req, res) {
    const perfil = await obtenerMiPerfil(req.usuario.documento);
    return exito(res, perfil);
}

export async function editarMiPerfil(req, res) {
    const perfil = await actualizarMiPerfil(req.usuario.documento, req.body ?? {});
    return exito(res, perfil);
}

export async function editarMiContrasena(req, res) {
    await cambiarMiContrasena(req.usuario.documento, req.body ?? {});
    return exito(res, { mensaje: 'Tu contraseña se cambió.' });
}
