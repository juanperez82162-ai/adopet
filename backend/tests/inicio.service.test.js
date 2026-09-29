// El resumen de Inicio sigue a los permisos, no al nombre del perfil.
// Aquí se simulan los SERVICES que usa inicio (no tiene repositorio).

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { simular, reiniciar } from './apoyo.js';

const auth = simular('modules/auth/auth.service.js', ['tienePermiso']);
const usuarios = simular('modules/usuarios/usuarios.service.js', ['obtenerResumenUsuarios']);

const { obtenerResumen } = await import('../src/modules/inicio/inicio.service.js');

describe('Inicio', () => {
    beforeEach(() => {
        reiniciar(auth);
        reiniciar(usuarios);
        usuarios.obtenerResumenUsuarios.mock.mockImplementation(async () => (
            { activos: 5, nuevos: 1, desactivados: 0, vetados: 0 }
        ));
    });

    it('con permiso de ver Usuarios trae el bloque con sus 4 cifras', async () => {
        auth.tienePermiso.mock.mockImplementation(async (documento, opcion) => opcion === 'USUARIOS');

        const { bloques } = await obtenerResumen('1');

        assert.equal(bloques.length, 1);
        assert.equal(bloques[0].opcion, 'USUARIOS');
        assert.equal(bloques[0].cifras.length, 4);
    });

    it('sin ese permiso no trae bloques ni consulta las cifras', async () => {
        auth.tienePermiso.mock.mockImplementation(async () => false);

        assert.deepEqual(await obtenerResumen('1'), { bloques: [] });
        assert.equal(usuarios.obtenerResumenUsuarios.mock.callCount(), 0);
    });
});
