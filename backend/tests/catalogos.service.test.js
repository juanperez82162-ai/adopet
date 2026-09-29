// Reglas del service de catálogos, con el repositorio simulado.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { simular, reiniciar } from './apoyo.js';

const repositorio = simular('modules/catalogos/catalogos.repository.js', [
    'listarActivos', 'listarTodos', 'insertar', 'actualizar', 'actualizarActivo', 'contarOtrosActivos'
]);

const { crear, modificar, cambiarEstado } = await import('../src/modules/catalogos/catalogos.service.js');
const { CATALOGOS } = await import('../src/modules/catalogos/catalogos.config.js');

// Error que lanza Oracle cuando se viola un índice único (ORA-00001).
function errorDuplicado() {
    return Object.assign(new Error('ORA-00001: unique constraint violated'), { errorNum: 1 });
}

describe('Catálogos', () => {
    beforeEach(() => reiniciar(repositorio));

    it('no crea valores en un catálogo predefinido (tamaños)', async () => {
        await assert.rejects(crear(CATALOGOS.tamanios, { nombre: 'GIGANTE' }), {
            codigoHttp: 409,
            codigo: 'CATALOGO_SOLO_MIGRACION'
        });
        assert.equal(repositorio.insertar.mock.callCount(), 0);
    });

    it('crea en un catálogo abierto (ciudades)', async () => {
        repositorio.insertar.mock.mockImplementation(async () => 21);

        const creado = await crear(CATALOGOS.ciudades, { nombre: 'Caldas' });

        assert.deepEqual(creado, { id: 21, nombre: 'Caldas', activo: true });
    });

    it('un nombre repetido se traduce a 409 NOMBRE_DUPLICADO', async () => {
        repositorio.insertar.mock.mockImplementation(async () => {
            throw errorDuplicado();
        });

        await assert.rejects(crear(CATALOGOS.ciudades, { nombre: 'Bello' }), {
            codigoHttp: 409,
            codigo: 'NOMBRE_DUPLICADO'
        });
    });

    it('los estados del proceso no se desactivan', async () => {
        await assert.rejects(cambiarEstado(CATALOGOS['estados-proceso'], 1, false), {
            codigoHttp: 409,
            codigo: 'CATALOGO_NO_DESACTIVABLE'
        });
    });

    it('no deja desactivar el último valor activo', async () => {
        repositorio.contarOtrosActivos.mock.mockImplementation(async () => 0);

        await assert.rejects(cambiarEstado(CATALOGOS.sexos, 1, false), {
            codigoHttp: 409,
            codigo: 'ULTIMO_VALOR_ACTIVO'
        });
        assert.equal(repositorio.actualizarActivo.mock.callCount(), 0);
    });

    it('desactiva cuando quedan otros activos, guardando N', async () => {
        repositorio.contarOtrosActivos.mock.mockImplementation(async () => 3);
        repositorio.actualizarActivo.mock.mockImplementation(async () => 1);

        assert.deepEqual(await cambiarEstado(CATALOGOS.sexos, 1, false), { id: 1, activo: false });
        assert.equal(repositorio.actualizarActivo.mock.calls[0].arguments[2], 'N');
    });

    it('modificar un id que no existe responde 404', async () => {
        repositorio.actualizar.mock.mockImplementation(async () => 0);

        await assert.rejects(modificar(CATALOGOS.ciudades, 999, { nombre: 'X' }), {
            codigoHttp: 404,
            codigo: 'VALOR_NO_EXISTE'
        });
    });
});
