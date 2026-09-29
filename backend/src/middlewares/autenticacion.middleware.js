import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { error } from '../utils/respuesta.js';

export function autenticar(req, res, next) {
    const encabezado = req.headers.authorization;

    if (!encabezado || !encabezado.startsWith('Bearer ')) {
        return error(res, 401, 'SESION_REQUERIDA', 'Debe iniciar sesión para continuar.');
    }

    const token = encabezado.slice('Bearer '.length);

    try {
        const datos = jwt.verify(token, config.jwt.secreto);

        req.usuario = {
            documento: datos.documento,
            nombre: datos.nombre,
            idPerfil: datos.idPerfil,
            rol: datos.rol
        };

        return next();
    } catch (err) {
        return error(res, 401, 'SESION_INVALIDA', 'La sesión no es válida o ya expiró.');
    }
}