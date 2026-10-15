import { ErrorNegocio } from '../utils/errores.js';
import { error } from '../utils/respuesta.js';

// Los triggers de la base rechazan con RAISE_APPLICATION_ERROR(-20xxx, mensaje).
// Oracle entrega "ORA-20xxx: mensaje" y detrás la línea del trigger; aquí se
// deja solo el mensaje, que ya está escrito para la persona.
const ERROR_DE_TRIGGER = /ORA-20\d{3}: ([^\n]+)/;

export function mensajeDeTrigger(err) {
    return ERROR_DE_TRIGGER.exec(String(err?.message ?? ''))?.[1]?.trim() ?? null;
}

export function manejarErrores(err, req, res, next) {
    if (err instanceof ErrorNegocio) {
        return error(res, err.codigoHttp, err.codigo, err.message, err.detalles);
    }

    const mensajeTrigger = mensajeDeTrigger(err);

    if (mensajeTrigger) {
        return error(res, 409, 'REGLA_DE_LA_BASE', mensajeTrigger);
    }

    if (err.type === 'entity.parse.failed') {
        return error(res, 400, 'JSON_INVALIDO', 'El cuerpo de la petición no es un JSON válido.');
    }

    console.error('Error no controlado:', err);
    return error(res, 500, 'ERROR_INTERNO', 'Ocurrió un error inesperado. Intente de nuevo.');
}