import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { manejarErrores, mensajeDeTrigger } from '../src/middlewares/errores.middleware.js';

function respuestaFalsa() {
    const r = { codigo: null, cuerpo: null };
    r.status = (c) => { r.codigo = c; return r; };
    r.json = (b) => { r.cuerpo = b; return r; };
    return r;
}

describe('Errores que lanzan los triggers de la base', () => {
    const errorOracle = new Error(
        'ORA-20601: Una solicitud cerrada no se puede reactivar.\n'
        + 'ORA-06512: at "ADOPET.TRG_SOLICITUDES_VALIDAR_UPDATE", line 6'
    );

    test('se queda solo con el mensaje escrito en el trigger', () => {
        assert.equal(mensajeDeTrigger(errorOracle), 'Una solicitud cerrada no se puede reactivar.');
    });

    test('responde 409 con ese mensaje', () => {
        const res = respuestaFalsa();
        manejarErrores(errorOracle, {}, res, () => {});

        assert.equal(res.codigo, 409);
        assert.equal(res.cuerpo.ok, false);
        assert.equal(res.cuerpo.error.codigo, 'REGLA_DE_LA_BASE');
        assert.equal(res.cuerpo.error.mensaje, 'Una solicitud cerrada no se puede reactivar.');
    });

    test('un error de Oracle que no es de un trigger sigue siendo error interno', () => {
        const antes = console.error;
        console.error = () => {};

        try {
            const res = respuestaFalsa();
            manejarErrores(new Error('ORA-00001: unique constraint violated'), {}, res, () => {});
            assert.equal(res.codigo, 500);
        } finally {
            console.error = antes;
        }
    });
});
