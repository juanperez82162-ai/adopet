// Reglas del Admin sobre sí mismo, con el repositorio de usuarios simulado.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { simular, reiniciar } from './apoyo.js';

const repositorio = simular('modules/usuarios/usuarios.repository.js', [
    'buscarUsuarioPorDocumento', 'existeCiudadActiva', 'actualizarDatosUsuario', 'listarUsuarios',
    'listarPerfilesActivos', 'actualizarPerfilUsuario', 'actualizarEstadoUsuario', 'contarResumenUsuarios'
]);

const { cambiarEstadoUsuario, cambiarPerfilUsuario, obtenerResumenUsuarios } =
    await import('../src/modules/usuarios/usuarios.service.js');

const ADMIN = '1036000001';
const OTRO = '1036000002';

const FILA_OTRO = {
    DOCUMENTO: OTRO, TIPO_DOCUMENTO: 'CC', PRIMER_NOMBRE: 'Ana', PRIMER_APELLIDO: 'Ruiz',
    CORREO: 'ana@correo.com', ACTIVO: 'S', ID_PERFIL: 3, NOMBRE_PERFIL: 'Adoptante', NOMBRE_ROL: 'ADOPTANTE'
};

describe('Usuarios', () => {
    beforeEach(() => reiniciar(repositorio));

    it('un Admin no puede desactivarse a sí mismo', async () => {
        await assert.rejects(cambiarEstadoUsuario(ADMIN, ADMIN, { activo: false }), {
            codigoHttp: 409,
            codigo: 'ACCION_SOBRE_SI_MISMO'
        });
        assert.equal(repositorio.actualizarEstadoUsuario.mock.callCount(), 0);
    });

    it('un Admin no puede cambiarse su propio perfil', async () => {
        await assert.rejects(cambiarPerfilUsuario(ADMIN, ADMIN, { idPerfil: 3 }), {
            codigoHttp: 409,
            codigo: 'ACCION_SOBRE_SI_MISMO'
        });
    });

    it('un Admin sí puede desactivar a otra persona', async () => {
        repositorio.buscarUsuarioPorDocumento.mock.mockImplementation(async () => FILA_OTRO);
        repositorio.actualizarEstadoUsuario.mock.mockImplementation(async () => 1);

        await cambiarEstadoUsuario(ADMIN, OTRO, { activo: false });

        assert.deepEqual(repositorio.actualizarEstadoUsuario.mock.calls[0].arguments, [OTRO, 'N']);
    });

    it('activo debe ser true o false', async () => {
        await assert.rejects(cambiarEstadoUsuario(ADMIN, OTRO, { activo: 'no' }), {
            codigoHttp: 400,
            codigo: 'DATOS_INVALIDOS'
        });
    });

    it('el resumen cuenta los vetados con el nombre de perfil Vetado', async () => {
        repositorio.contarResumenUsuarios.mock.mockImplementation(async () => (
            { ACTIVOS: 10, NUEVOS: 2, DESACTIVADOS: 1, VETADOS: 1 }
        ));

        assert.deepEqual(await obtenerResumenUsuarios(), { activos: 10, nuevos: 2, desactivados: 1, vetados: 1 });
        assert.equal(repositorio.contarResumenUsuarios.mock.calls[0].arguments[0], 'Vetado');
    });
});
