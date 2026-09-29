import { tienePermiso } from '../modules/auth/auth.service.js';
import { error } from '../utils/respuesta.js';

export function autorizar(nombreOpcion, accion) {
    return async (req, res, next) => {
        try {
            const permitido = await tienePermiso(req.usuario.documento, nombreOpcion, accion);

            if (!permitido) {
                return error(res, 403, 'SIN_PERMISO', 'No tiene permiso para realizar esta acción.');
            }

            return next();
        } catch (err) {
            console.error('Error al verificar permisos:', err.message);
            return error(res, 500, 'ERROR_PERMISOS', 'No se pudo verificar el permiso.');
        }
    };
}