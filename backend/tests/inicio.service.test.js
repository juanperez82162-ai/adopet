// El resumen de Inicio sigue a los permisos, no al nombre del perfil.
// Aquí se simulan los SERVICES que usa inicio (no tiene repositorio).

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { simular, reiniciar } from './apoyo.js';

const auth = simular('modules/auth/auth.service.js', ['tienePermiso']);
const usuarios = simular('modules/usuarios/usuarios.service.js', ['obtenerResumenUsuarios']);
const mascotas = simular('modules/mascotas/mascotas.service.js', ['obtenerResumenMascotas']);
const solicitudes = simular('modules/solicitudes/solicitudes.service.js', ['obtenerResumenSolicitudes']);
const seguimientos = simular('modules/seguimientos/seguimientos.service.js', ['obtenerResumenSemaforos']);

const { obtenerResumen } = await import('../src/modules/inicio/inicio.service.js');

// Simula un perfil: lista de "OPCION:ACCION" que tiene concedidos.
function conPermisos(...concedidos) {
    auth.tienePermiso.mock.mockImplementation(async (documento, opcion, accion) => (
        concedidos.includes(`${opcion}:${accion}`)
    ));
}

describe('Inicio', () => {
    beforeEach(() => {
        [auth, usuarios, mascotas, solicitudes, seguimientos].forEach(reiniciar);
        usuarios.obtenerResumenUsuarios.mock.mockImplementation(async () => (
            { activos: 5, nuevos: 1, desactivados: 0, vetados: 0 }
        ));
        mascotas.obtenerResumenMascotas.mock.mockImplementation(async () => (
            { disponibles: 4, enTratamiento: 1, enProceso: 2, enPrueba: 3 }
        ));
        solicitudes.obtenerResumenSolicitudes.mock.mockImplementation(async () => (
            { enCurso: 2, porVencer: 1, dias: 3 }
        ));
        seguimientos.obtenerResumenSemaforos.mock.mockImplementation(async () => (
            { verdes: 2, amarillos: 1, rojos: 1, sinRespuesta: 1 }
        ));
    });

    it('con permiso de ver Usuarios trae el bloque con sus 4 cifras', async () => {
        conPermisos('USUARIOS:CONSULTAR');

        const { bloques } = await obtenerResumen('1');

        assert.equal(bloques.length, 1);
        assert.equal(bloques[0].opcion, 'USUARIOS');
        assert.equal(bloques[0].cifras.length, 4);
    });

    it('sin ningún permiso no trae bloques ni consulta las cifras', async () => {
        conPermisos();

        assert.deepEqual(await obtenerResumen('1'), { bloques: [] });
        assert.equal(usuarios.obtenerResumenUsuarios.mock.callCount(), 0);
        assert.equal(mascotas.obtenerResumenMascotas.mock.callCount(), 0);
    });

    it('el staff que gestiona ve los cuatro bloques', async () => {
        conPermisos(
            'USUARIOS:CONSULTAR', 'MASCOTAS:MODIFICAR', 'SOLICITUDES:MODIFICAR', 'SEGUIMIENTOS:MODIFICAR'
        );

        const { bloques } = await obtenerResumen('1');

        assert.deepEqual(bloques.map((b) => b.opcion), ['USUARIOS', 'MASCOTAS', 'SOLICITUDES', 'SEGUIMIENTOS']);
    });

    it('el adoptante, que solo consulta esos módulos, no ve las cifras internas', async () => {
        conPermisos('MASCOTAS:CONSULTAR', 'SOLICITUDES:CONSULTAR', 'SEGUIMIENTOS:CONSULTAR');

        assert.deepEqual(await obtenerResumen('2'), { bloques: [] });
        assert.equal(solicitudes.obtenerResumenSolicitudes.mock.callCount(), 0);
        assert.equal(seguimientos.obtenerResumenSemaforos.mock.callCount(), 0);
    });

    it('el semáforo trae rojo, amarillo, verde y sin respuesta, con su tono', async () => {
        conPermisos('SEGUIMIENTOS:MODIFICAR');

        const { bloques } = await obtenerResumen('1');
        const cifras = bloques[0].cifras;

        assert.deepEqual(cifras.map((c) => [c.clave, c.valor]), [
            ['rojos', 1], ['amarillos', 1], ['verdes', 2], ['sinRespuesta', 1]
        ]);
        assert.deepEqual(cifras.map((c) => c.tono), ['rojo', 'amarillo', 'verde', undefined]);
    });

    it('los trámites por vencer se marcan en amarillo solo si hay alguno', async () => {
        conPermisos('SOLICITUDES:MODIFICAR');

        let cifras = (await obtenerResumen('1')).bloques[0].cifras;
        assert.equal(cifras[1].tono, 'amarillo');
        assert.equal(cifras[1].etiqueta, 'Vencen en 3 días o menos');

        solicitudes.obtenerResumenSolicitudes.mock.mockImplementation(async () => (
            { enCurso: 2, porVencer: 0, dias: 3 }
        ));
        cifras = (await obtenerResumen('1')).bloques[0].cifras;
        assert.equal(cifras[1].tono, undefined);
    });
});
