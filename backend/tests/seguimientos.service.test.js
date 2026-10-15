// Seguimientos: programar, consultar y responder los checkpoints.
// El repositorio se simula: no hay Oracle.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { simular, reiniciar } from './apoyo.js';

const repo = simular('modules/seguimientos/seguimientos.repository.js', [
    'programarSeguimientos', 'listarSeguimientos', 'buscarSeguimiento', 'listarInstrumento',
    'listarSemaforos', 'listarRespuestas', 'guardarRespuestas'
]);

const {
    programarCheckpoints, obtenerFormulario, obtenerSeguimientos, obtenerSeguimiento, responder
} = await import('../src/modules/seguimientos/seguimientos.service.js');

const STAFF = { documento: '1', rol: 'STAFF' };
const ADOPTANTE = { documento: '2', rol: 'ADOPTANTE' };

// Instrumento: 2 preguntas con 4 opciones (puntaje 4 a 1; la de puntaje 1 de la pregunta 2 es alarma).
function instrumento() {
    const filas = [];

    for (const [idPregunta, texto] of [[1, 'P1'], [2, 'P2']]) {
        for (const [i, puntaje] of [4, 3, 2, 1].entries()) {
            filas.push({
                ID_PREGUNTA: idPregunta, PREGUNTA: texto, ORDEN_PREGUNTA: idPregunta,
                ID_OPCION: idPregunta * 10 + i, OPCION: `O${i}`, PUNTAJE: puntaje,
                ES_ALARMA: idPregunta === 2 && puntaje === 1 ? 'S' : 'N', ORDEN_OPCION: i + 1
            });
        }
    }

    return filas;
}

const SEMAFOROS = [
    { ID_SEMAFORO: 1, NOMBRE: 'VERDE', PUNTAJE_MIN: 3, PUNTAJE_MAX: 4 },
    { ID_SEMAFORO: 2, NOMBRE: 'AMARILLO', PUNTAJE_MIN: 2, PUNTAJE_MAX: 2.99 },
    { ID_SEMAFORO: 3, NOMBRE: 'ROJO', PUNTAJE_MIN: 1, PUNTAJE_MAX: 1.99 }
];

function fila(cambios = {}) {
    return {
        ID_SEGUIMIENTO: 5, ID_SOLICITUD: 10, DOCUMENTO: '2', NOMBRE_ADOPTANTE: 'Ana Pérez', TELEFONO: '300',
        ID_MASCOTA: 1, MASCOTA: 'Luna', ID_ESTADO_PROCESO: 3, ID_ETAPA: 1, ETAPA: 'DIA_3', DIAS_DESDE_ENTREGA: 3,
        FECHA_PROGRAMADA: new Date(), FECHA_LIMITE: new Date(), YA_TOCA: 'S', EN_PLAZO: 'S',
        FECHA_RESPUESTA: null, SOLICITA_CONTACTO: null, COMENTARIO: null, PUNTAJE: null, ID_SEMAFORO: null, SEMAFORO: null,
        ...cambios
    };
}

// Elige la opción i (0 = mejor) de cada pregunta.
const respuestas = (...indices) => indices.map((i, p) => ({ idPregunta: p + 1, idOpcion: (p + 1) * 10 + i }));

async function rechazaCon(promesa, codigoHttp, codigo) {
    await assert.rejects(promesa, (e) => e.codigoHttp === codigoHttp && e.codigo === codigo);
}

beforeEach(() => reiniciar(repo));

describe('programarCheckpoints', () => {
    it('programa los seguimientos desde la fecha de entrega y devuelve cuántos creó', async () => {
        const entrega = new Date('2026-10-15T10:00:00');
        repo.programarSeguimientos.mock.mockImplementation(async () => 3);

        assert.equal(await programarCheckpoints(10, entrega), 3);
        assert.deepEqual(repo.programarSeguimientos.mock.calls[0].arguments, [10, entrega]);
    });
});

describe('obtenerFormulario', () => {
    it('agrupa en preguntas y NO revela puntajes ni alarmas', async () => {
        repo.listarInstrumento.mock.mockImplementation(async () => instrumento());
        const f = await obtenerFormulario();

        assert.equal(f.preguntas.length, 2);
        assert.equal(f.preguntas[0].opciones.length, 4);
        assert.deepEqual(Object.keys(f.preguntas[0].opciones[0]).sort(), ['id', 'texto']);
    });
});

describe('estado de un checkpoint', () => {
    const estadoCon = async (cambios) => {
        repo.listarSeguimientos.mock.mockImplementation(async () => [fila(cambios)]);
        return (await obtenerSeguimientos({}, STAFF))[0].estado;
    };

    it('se deduce de las fechas', async () => {
        assert.equal(await estadoCon({ YA_TOCA: 'N' }), 'PROGRAMADO');
        assert.equal(await estadoCon({}), 'PENDIENTE');
        assert.equal(await estadoCon({ EN_PLAZO: 'N' }), 'NO_ATENDIDO');
        assert.equal(await estadoCon({ FECHA_RESPUESTA: new Date() }), 'RESPONDIDO');
    });
});

describe('consulta', () => {
    it('el staff ve todos con la evaluación; el adoptante solo los suyos y sin ella', async () => {
        repo.listarSeguimientos.mock.mockImplementation(async () => [
            fila({ FECHA_RESPUESTA: new Date(), PUNTAJE: 3.5, SEMAFORO: 'VERDE', SOLICITA_CONTACTO: 'N' })
        ]);

        const staff = (await obtenerSeguimientos({}, STAFF))[0];
        assert.equal(staff.semaforo, 'VERDE');
        assert.equal(staff.puntaje, 3.5);
        assert.equal(repo.listarSeguimientos.mock.calls[0].arguments[0].documento, undefined);

        const adoptante = (await obtenerSeguimientos({}, ADOPTANTE))[0];
        assert.equal(adoptante.semaforo, undefined);
        assert.equal(adoptante.puntaje, undefined);
        assert.equal(repo.listarSeguimientos.mock.calls[1].arguments[0].documento, '2');
    });

    it('rechaza un idSolicitud inválido', async () => {
        await rechazaCon(obtenerSeguimientos({ idSolicitud: 'x' }, STAFF), 400, 'DATOS_INVALIDOS');
    });

    it('un adoptante no ve el checkpoint de otra persona (404)', async () => {
        repo.buscarSeguimiento.mock.mockImplementation(async () => fila({ DOCUMENTO: '99' }));
        await rechazaCon(obtenerSeguimiento(5, ADOPTANTE), 404, 'SEGUIMIENTO_NO_ENCONTRADO');
    });

    it('el staff ve las respuestas de un checkpoint respondido', async () => {
        repo.buscarSeguimiento.mock.mockImplementation(async () => fila({ FECHA_RESPUESTA: new Date() }));
        repo.listarRespuestas.mock.mockImplementation(async () => [
            { PREGUNTA: 'P1', OPCION: 'O0', PUNTAJE: 4, ES_ALARMA: 'N' }
        ]);

        const s = await obtenerSeguimiento(5, STAFF);
        assert.equal(s.respuestas[0].pregunta, 'P1');
        assert.equal(s.respuestas[0].esAlarma, false);
    });
});

describe('responder', () => {
    beforeEach(() => {
        repo.buscarSeguimiento.mock.mockImplementation(async () => fila());
        repo.listarInstrumento.mock.mockImplementation(async () => instrumento());
        repo.listarSemaforos.mock.mockImplementation(async () => SEMAFOROS);
        repo.guardarRespuestas.mock.mockImplementation(async () => true);
    });

    const cuerpo = (resp, extra = {}) => ({ respuestas: resp, solicitaContacto: false, ...extra });
    const guardado = () => repo.guardarRespuestas.mock.calls[0].arguments[0];

    it('promedio alto → verde', async () => {
        await responder(5, cuerpo(respuestas(0, 1)), ADOPTANTE); // 4 y 3 → 3.5
        assert.equal(guardado().puntaje, 3.5);
        assert.equal(guardado().idSemaforo, 1);
    });

    it('promedio medio → amarillo', async () => {
        await responder(5, cuerpo(respuestas(2, 2)), ADOPTANTE); // 2 y 2 → 2
        assert.equal(guardado().idSemaforo, 2);
    });

    it('promedio bajo → rojo', async () => {
        await responder(5, cuerpo(respuestas(3, 2)), ADOPTANTE); // 1 y 2 → 1.5
        assert.equal(guardado().puntaje, 1.5);
        assert.equal(guardado().idSemaforo, 3);
    });

    it('una respuesta de alarma da rojo aunque el promedio sea alto', async () => {
        await responder(5, cuerpo(respuestas(0, 3)), ADOPTANTE); // 4 y 1(alarma) → 2.5 amarillo, pero alarma
        assert.equal(guardado().puntaje, 2.5);
        assert.equal(guardado().idSemaforo, 3);
    });

    it('guarda el contacto, el comentario limpio y todas las respuestas', async () => {
        await responder(5, cuerpo(respuestas(0, 0), { solicitaContacto: true, comentario: '  Todo bien  ' }), ADOPTANTE);

        assert.equal(guardado().solicitaContacto, 'S');
        assert.equal(guardado().comentario, 'Todo bien');
        assert.equal(guardado().respuestas.length, 2);
    });

    it('devuelve el checkpoint sin la evaluación', async () => {
        const r = await responder(5, cuerpo(respuestas(0, 0)), ADOPTANTE);
        assert.equal(r.semaforo, undefined);
        assert.equal(r.puntaje, undefined);
    });

    it('exige todas las preguntas, sin repetir ni inventar', async () => {
        await rechazaCon(responder(5, cuerpo(respuestas(0)), ADOPTANTE), 400, 'DATOS_INVALIDOS');
        await rechazaCon(responder(5, cuerpo([...respuestas(0, 0), { idPregunta: 1, idOpcion: 11 }]), ADOPTANTE), 400, 'DATOS_INVALIDOS');
        await rechazaCon(responder(5, cuerpo([{ idPregunta: 1, idOpcion: 99 }, { idPregunta: 2, idOpcion: 20 }]), ADOPTANTE), 400, 'DATOS_INVALIDOS');
        await rechazaCon(responder(5, { solicitaContacto: false }, ADOPTANTE), 400, 'DATOS_INVALIDOS');
        assert.equal(repo.guardarRespuestas.mock.callCount(), 0);
    });

    it('una opción de otra pregunta no vale', async () => {
        await rechazaCon(
            responder(5, cuerpo([{ idPregunta: 1, idOpcion: 20 }, { idPregunta: 2, idOpcion: 20 }]), ADOPTANTE),
            400, 'DATOS_INVALIDOS'
        );
    });

    it('exige indicar si quiere contacto y limita el comentario', async () => {
        await rechazaCon(responder(5, { respuestas: respuestas(0, 0) }, ADOPTANTE), 400, 'DATOS_INVALIDOS');
        await rechazaCon(responder(5, cuerpo(respuestas(0, 0), { comentario: 'x'.repeat(501) }), ADOPTANTE), 400, 'DATOS_INVALIDOS');
    });

    it('el staff no responde por el adoptante', async () => {
        await rechazaCon(responder(5, cuerpo(respuestas(0, 0)), STAFF), 403, 'SOLO_ADOPTANTES');
    });

    it('no responde el checkpoint de otra persona (404)', async () => {
        repo.buscarSeguimiento.mock.mockImplementation(async () => fila({ DOCUMENTO: '99' }));
        await rechazaCon(responder(5, cuerpo(respuestas(0, 0)), ADOPTANTE), 404, 'SEGUIMIENTO_NO_ENCONTRADO');
    });

    it('respeta el calendario y el plazo', async () => {
        repo.buscarSeguimiento.mock.mockImplementation(async () => fila({ YA_TOCA: 'N' }));
        await rechazaCon(responder(5, cuerpo(respuestas(0, 0)), ADOPTANTE), 409, 'SEGUIMIENTO_NO_HABILITADO');

        repo.buscarSeguimiento.mock.mockImplementation(async () => fila({ EN_PLAZO: 'N' }));
        await rechazaCon(responder(5, cuerpo(respuestas(0, 0)), ADOPTANTE), 409, 'SEGUIMIENTO_VENCIDO');

        repo.buscarSeguimiento.mock.mockImplementation(async () => fila({ FECHA_RESPUESTA: new Date() }));
        await rechazaCon(responder(5, cuerpo(respuestas(0, 0)), ADOPTANTE), 409, 'SEGUIMIENTO_YA_RESPONDIDO');
    });

    it('solo mientras el trámite sigue en prueba', async () => {
        repo.buscarSeguimiento.mock.mockImplementation(async () => fila({ ID_ESTADO_PROCESO: 4 }));
        await rechazaCon(responder(5, cuerpo(respuestas(0, 0)), ADOPTANTE), 409, 'SEGUIMIENTO_NO_VIGENTE');
    });

    it('si alguien respondió justo antes, no guarda dos veces', async () => {
        repo.guardarRespuestas.mock.mockImplementation(async () => false);
        await rechazaCon(responder(5, cuerpo(respuestas(0, 0)), ADOPTANTE), 409, 'SEGUIMIENTO_YA_RESPONDIDO');
    });

    it('si los semáforos no cubren el promedio, avisa en vez de adivinar', async () => {
        repo.listarSemaforos.mock.mockImplementation(async () => []);
        await rechazaCon(responder(5, cuerpo(respuestas(0, 0)), ADOPTANTE), 500, 'SEMAFORO_NO_CONFIGURADO');
    });
});
