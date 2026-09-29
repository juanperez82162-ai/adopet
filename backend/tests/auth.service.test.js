// Inicio de sesión, con el repositorio de auth simulado.
// bcrypt es real: las contraseñas se comparan de verdad contra un hash.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { simular, reiniciar } from './apoyo.js';

const repositorio = simular('modules/auth/auth.repository.js', [
    'buscarPermiso', 'buscarMenu', 'buscarIdPerfil', 'buscarReglasRegistro', 'insertarUsuario',
    'buscarUsuarioPorCorreo', 'buscarUsuarioPorDocumento', 'actualizarContrasena', 'buscarEstadoSesion'
]);

const { iniciarSesion, tienePermiso } = await import('../src/modules/auth/auth.service.js');

const CONTRASENA = 'Perro123!';
const HASH = bcrypt.hashSync(CONTRASENA, 4); // pocas rondas: es solo para la prueba

function usuario(cambios = {}) {
    return {
        DOCUMENTO: '1036000001', PRIMER_NOMBRE: 'Juan', PRIMER_APELLIDO: 'Pérez', CORREO: 'juan@correo.com',
        CONTRASENA_HASH: HASH, ACTIVO: 'S', ID_PERFIL: 1, NOMBRE_PERFIL: 'Admin', NOMBRE_ROL: 'STAFF',
        ...cambios
    };
}

describe('Login', () => {
    beforeEach(() => reiniciar(repositorio));

    it('con los datos correctos entrega un token y los datos básicos', async () => {
        repositorio.buscarUsuarioPorCorreo.mock.mockImplementation(async () => usuario());

        const sesion = await iniciarSesion('juan@correo.com', CONTRASENA);

        assert.equal(typeof sesion.token, 'string');
        assert.equal(sesion.usuario.nombre, 'Juan Pérez');
        assert.equal(sesion.usuario.vetado, false);
    });

    it('correo inexistente y contraseña errada dan EL MISMO error', async () => {
        const esperado = { codigoHttp: 401, codigo: 'CREDENCIALES_INVALIDAS' };

        repositorio.buscarUsuarioPorCorreo.mock.mockImplementation(async () => undefined);
        await assert.rejects(iniciarSesion('nadie@correo.com', CONTRASENA), esperado);

        repositorio.buscarUsuarioPorCorreo.mock.mockImplementation(async () => usuario());
        await assert.rejects(iniciarSesion('juan@correo.com', 'Otra123!'), esperado);
    });

    it('una cuenta desactivada no entra (403), aunque la contraseña sea correcta', async () => {
        repositorio.buscarUsuarioPorCorreo.mock.mockImplementation(async () => usuario({ ACTIVO: 'N' }));

        await assert.rejects(iniciarSesion('juan@correo.com', CONTRASENA), {
            codigoHttp: 403,
            codigo: 'USUARIO_INACTIVO'
        });
    });

    it('el vetado sí entra, marcado como vetado', async () => {
        repositorio.buscarUsuarioPorCorreo.mock.mockImplementation(async () => usuario({ NOMBRE_PERFIL: 'Vetado' }));

        const sesion = await iniciarSesion('juan@correo.com', CONTRASENA);

        assert.equal(sesion.usuario.vetado, true);
    });
});

describe('Permisos', () => {
    beforeEach(() => reiniciar(repositorio));

    it('sin fila en PERFILES_OPCIONES no hay ningún permiso', async () => {
        repositorio.buscarPermiso.mock.mockImplementation(async () => undefined);

        assert.equal(await tienePermiso('1', 'USUARIOS', 'CONSULTAR'), false);
    });

    it('la fila da CONSULTAR; las demás acciones dependen de su columna', async () => {
        repositorio.buscarPermiso.mock.mockImplementation(async () => ({ CREAR: 'S', MODIFICAR: 'S', ELIMINAR: 'N' }));

        assert.equal(await tienePermiso('1', 'MASCOTAS', 'CONSULTAR'), true);
        assert.equal(await tienePermiso('1', 'MASCOTAS', 'CREAR'), true);
        assert.equal(await tienePermiso('1', 'MASCOTAS', 'ELIMINAR'), false);
    });
});
