import { ErrorNegocio } from '../utils/errores.js';
import { error } from '../utils/respuesta.js';

export function manejarErrores(err, req, res, next) {
    if (err instanceof ErrorNegocio) {
        return error(res, err.codigoHttp, err.codigo, err.message, err.detalles);
    }

    if (err.type === 'entity.parse.failed') {
        return error(res, 400, 'JSON_INVALIDO', 'El cuerpo de la petición no es un JSON válido.');
    }

    console.error('Error no controlado:', err);
    return error(res, 500, 'ERROR_INTERNO', 'Ocurrió un error inesperado. Intente de nuevo.');
}