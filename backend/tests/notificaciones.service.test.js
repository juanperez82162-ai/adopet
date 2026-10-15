// Notificaciones: bandeja compartida del staff. El repositorio se simula.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { simular, reiniciar } from './apoyo.js';

const repo = simular('modules/notificaciones/notificaciones.repository.js', [
    'insertarSiNoExiste', 'listarNotificaciones', 'contarNoLeidas', 'buscarNotificacion',
    'marcarLeida', 'marcarTodasLeidas'
]);

const {
    notificarAlStaff, notificarAlAdoptante, obtenerNotificaciones, obtenerContador, marcarComoLeida, marcarTodasComoLeidas,
    TIPO, LARGO_MAXIMO_MENSAJE
} = await import('../src/modules/notificaciones/notificaciones.service.js');

const STAFF = { documento: '1', rol: 'STAFF' };
const ADOPTANTE = { documento: '2', rol: 'ADOPTANTE' };

beforeEach(() => reiniciar(repo));

async function rechazaCon(promesa, codigoHttp, codigo) {
    await assert.rejects(promesa, (e) => e.codigoHttp === codigoHttp && e.codigo === codigo);
}

describe('notificarAlStaff', () => {
    it('crea el aviso sin destinatario (va al equipo) y dice si era nuevo', async () => {
        repo.insertarSiNoExiste.mock.mockImplementation(async () => 1);

        assert.equal(await notificarAlStaff(TIPO.SEGUIMIENTO_ROJO, 'Mensaje', 10), true);
        assert.deepEqual(repo.insertarSiNoExiste.mock.calls[0].arguments[0],
            { documento: null, idTipo: 1, mensaje: 'Mensaje', idSolicitud: 10 });
    });

    it('devuelve false si ya existía uno igual', async () => {
        repo.insertarSiNoExiste.mock.mockImplementation(async () => 0);
        assert.equal(await notificarAlStaff(TIPO.TRAMITE_POR_VENCER, 'Mensaje', 10), false);
    });

    it('recorta el mensaje al largo de la columna', async () => {
        repo.insertarSiNoExiste.mock.mockImplementation(async () => 1);
        await notificarAlStaff(TIPO.PRUEBA_CUMPLIDA, 'x'.repeat(400), 10);

        assert.equal(repo.insertarSiNoExiste.mock.calls[0].arguments[0].mensaje.length, LARGO_MAXIMO_MENSAJE);
    });
});

describe('notificarAlAdoptante', () => {
    it('crea el aviso en la bandeja personal del adoptante', async () => {
        repo.insertarSiNoExiste.mock.mockImplementation(async () => 1);

        assert.equal(await notificarAlAdoptante('2', TIPO.CHECKPOINT_DISPONIBLE, 'Mensaje', 10), true);
        assert.deepEqual(repo.insertarSiNoExiste.mock.calls[0].arguments[0],
            { documento: '2', idTipo: 9, mensaje: 'Mensaje', idSolicitud: 10 });
    });
});

describe('consulta', () => {
    it('el staff ve la bandeja compartida y el adoptante la suya', async () => {
        repo.listarNotificaciones.mock.mockImplementation(async () => [{
            ID_NOTIFICACION: 3, ID_SOLICITUD: 10, TIPO: 'SEGUIMIENTO_ROJO', PRIORIDAD: 1,
            MENSAJE: 'm', FECHA_CREACION: new Date(), FECHA_LECTURA: null
        }]);

        const lista = await obtenerNotificaciones(STAFF);
        assert.equal(repo.listarNotificaciones.mock.calls[0].arguments[0], null);
        assert.deepEqual(lista[0], {
            id: 3, idSolicitud: 10, tipo: 'SEGUIMIENTO_ROJO', prioridad: 1, mensaje: 'm',
            fechaCreacion: lista[0].fechaCreacion, leida: false
        });

        await obtenerNotificaciones(ADOPTANTE);
        assert.equal(repo.listarNotificaciones.mock.calls[1].arguments[0], '2');
    });

    it('cuenta las no leídas de la bandeja que corresponde', async () => {
        repo.contarNoLeidas.mock.mockImplementation(async () => 4);

        assert.deepEqual(await obtenerContador(STAFF), { noLeidas: 4 });
        assert.equal(repo.contarNoLeidas.mock.calls[0].arguments[0], null);
    });
});

describe('marcar como leída', () => {
    it('marca una de la bandeja del staff', async () => {
        repo.buscarNotificacion.mock.mockImplementation(async () => ({ ID_NOTIFICACION: 3, DOCUMENTO: null, FECHA_LECTURA: null }));
        repo.marcarLeida.mock.mockImplementation(async () => 1);

        assert.deepEqual(await marcarComoLeida(3, STAFF), { id: 3, leida: true });
        assert.equal(repo.marcarLeida.mock.calls[0].arguments[0], 3);
    });

    it('si ya estaba leída no vuelve a escribir', async () => {
        repo.buscarNotificacion.mock.mockImplementation(async () => ({ ID_NOTIFICACION: 3, DOCUMENTO: null, FECHA_LECTURA: new Date() }));

        await marcarComoLeida(3, STAFF);
        assert.equal(repo.marcarLeida.mock.callCount(), 0);
    });

    it('404 si no existe o es de otra bandeja', async () => {
        repo.buscarNotificacion.mock.mockImplementation(async () => undefined);
        await rechazaCon(marcarComoLeida(3, STAFF), 404, 'NOTIFICACION_NO_ENCONTRADA');

        repo.buscarNotificacion.mock.mockImplementation(async () => ({ ID_NOTIFICACION: 3, DOCUMENTO: null, FECHA_LECTURA: null }));
        await rechazaCon(marcarComoLeida(3, ADOPTANTE), 404, 'NOTIFICACION_NO_ENCONTRADA');
    });

    it('rechaza un id inválido', async () => {
        await rechazaCon(marcarComoLeida('abc', STAFF), 400, 'DATOS_INVALIDOS');
    });

    it('marca todas las de la bandeja', async () => {
        repo.marcarTodasLeidas.mock.mockImplementation(async () => 5);

        assert.deepEqual(await marcarTodasComoLeidas(STAFF), { marcadas: 5 });
        assert.equal(repo.marcarTodasLeidas.mock.calls[0].arguments[0], null);
    });
});
