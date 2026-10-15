// Capa de SERVICE de SEGUIMIENTOS: aquí viven las reglas de los checkpoints.
// - Se programan al registrar la entrega (regla 3-3-3).
// - El adoptante responde el formulario en su plazo; el sistema calcula el
//   promedio y el semáforo. Si alguna respuesta es de ALARMA, el semáforo es
//   rojo sin importar el promedio.
// - El adoptante no ve su puntaje ni su semáforo: es evaluación interna.
// Nunca llama al repository de otro módulo.

import { ErrorNegocio } from '../../utils/errores.js';
import { config } from '../../config/env.js';
import {
    programarSeguimientos,
    listarSeguimientos,
    buscarSeguimiento,
    listarInstrumento,
    listarSemaforos,
    listarRespuestas,
    guardarRespuestas
} from './seguimientos.repository.js';

const ROL_STAFF = 'STAFF';
const EN_PRUEBA = 3; // ESTADOS_PROCESO
const ROJO = 3; // SEMAFOROS

// Debe coincidir con SEGUIMIENTOS.COMENTARIO.
export const LARGO_MAXIMO_COMENTARIO = 500;

// Devuelve cuántos checkpoints quedaron programados.
export async function programarCheckpoints(idSolicitud, fechaEntrega) {
    return programarSeguimientos(idSolicitud, fechaEntrega);
}

function lanzarDatosInvalidos(errores) {
    throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'Revisa los campos marcados.', errores);
}

const esEnteroPositivo = (v) => Number.isInteger(v) && v > 0;

// ---- Estado de un checkpoint -------------------------------------------------
// No se guarda: se deduce de las fechas.
//   RESPONDIDO  · ya tiene respuesta
//   PROGRAMADO  · todavía no llega su fecha
//   PENDIENTE   · ya llegó y el adoptante está a tiempo de responder
//   NO_ATENDIDO · pasó el plazo sin respuesta
function estadoDe(f) {
    if (f.FECHA_RESPUESTA) return 'RESPONDIDO';
    if (f.YA_TOCA !== 'S') return 'PROGRAMADO';
    return f.EN_PLAZO === 'S' ? 'PENDIENTE' : 'NO_ATENDIDO';
}

function aSeguimiento(f, verEvaluacion) {
    const seguimiento = {
        id: f.ID_SEGUIMIENTO,
        idSolicitud: f.ID_SOLICITUD,
        idMascota: f.ID_MASCOTA,
        mascota: f.MASCOTA,
        etapa: f.ETAPA,
        diasDesdeEntrega: f.DIAS_DESDE_ENTREGA,
        fechaProgramada: f.FECHA_PROGRAMADA,
        fechaLimite: f.FECHA_LIMITE,
        fechaRespuesta: f.FECHA_RESPUESTA,
        estado: estadoDe(f)
    };

    if (verEvaluacion) {
        seguimiento.documento = f.DOCUMENTO;
        seguimiento.adoptante = f.NOMBRE_ADOPTANTE;
        seguimiento.telefono = f.TELEFONO;
        seguimiento.solicitaContacto = f.SOLICITA_CONTACTO === null ? null : f.SOLICITA_CONTACTO === 'S';
        seguimiento.comentario = f.COMENTARIO;
        seguimiento.puntaje = f.PUNTAJE;
        seguimiento.semaforo = f.SEMAFORO;
    }

    return seguimiento;
}

// ---- Formulario ---------------------------------------------------------------

// Agrupa las filas (una por opción) en preguntas con sus opciones.
function agruparInstrumento(filas) {
    const preguntas = new Map();

    for (const f of filas) {
        if (!preguntas.has(f.ID_PREGUNTA)) {
            preguntas.set(f.ID_PREGUNTA, { id: f.ID_PREGUNTA, texto: f.PREGUNTA, opciones: [] });
        }

        preguntas.get(f.ID_PREGUNTA).opciones.push({
            id: f.ID_OPCION, texto: f.OPCION, puntaje: f.PUNTAJE, esAlarma: f.ES_ALARMA === 'S'
        });
    }

    return [...preguntas.values()];
}

// El adoptante solo recibe los textos: nunca el puntaje ni cuáles son alarma.
export async function obtenerFormulario() {
    const preguntas = agruparInstrumento(await listarInstrumento());

    return {
        preguntas: preguntas.map((p) => ({
            id: p.id,
            texto: p.texto,
            opciones: p.opciones.map((o) => ({ id: o.id, texto: o.texto }))
        })),
        largoComentario: LARGO_MAXIMO_COMENTARIO
    };
}

// ---- Consulta -------------------------------------------------------------------

export async function obtenerSeguimientos(consulta, usuario) {
    const esStaff = usuario.rol === ROL_STAFF;
    const filtros = {};

    if (consulta.idSolicitud) {
        const id = Number(consulta.idSolicitud);

        if (!esEnteroPositivo(id)) {
            throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'idSolicitud: debe ser un número entero positivo.');
        }

        filtros.idSolicitud = id;
    }

    if (!esStaff) filtros.documento = usuario.documento;

    const filas = await listarSeguimientos(filtros, config.negocio.diasRespuestaCheckpoint);
    return filas.map((f) => aSeguimiento(f, esStaff));
}

async function buscarExistente(valorId, usuario) {
    const id = Number(valorId);

    if (!esEnteroPositivo(id)) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'id: debe ser un número entero positivo.');
    }

    const fila = await buscarSeguimiento(id, config.negocio.diasRespuestaCheckpoint);

    // Un adoptante no sabe si existen los checkpoints de otros.
    if (!fila || (usuario.rol !== ROL_STAFF && fila.DOCUMENTO !== usuario.documento)) {
        throw new ErrorNegocio(404, 'SEGUIMIENTO_NO_ENCONTRADO', 'El seguimiento no existe.');
    }

    return fila;
}

// El staff además ve qué respondió la persona, pregunta por pregunta.
export async function obtenerSeguimiento(valorId, usuario) {
    const fila = await buscarExistente(valorId, usuario);
    const esStaff = usuario.rol === ROL_STAFF;
    const seguimiento = aSeguimiento(fila, esStaff);

    if (esStaff && fila.FECHA_RESPUESTA) {
        seguimiento.respuestas = (await listarRespuestas(fila.ID_SEGUIMIENTO)).map((r) => ({
            pregunta: r.PREGUNTA, respuesta: r.OPCION, puntaje: r.PUNTAJE, esAlarma: r.ES_ALARMA === 'S'
        }));
    }

    return seguimiento;
}

// ---- Responder ------------------------------------------------------------------

// Promedio redondeado a 2 decimales (SEGUIMIENTOS.PUNTAJE es NUMBER(3,2)).
const redondear = (n) => Math.round(n * 100) / 100;

function validarRespuestas(cuerpo, preguntas) {
    const errores = {};

    if (typeof cuerpo.solicitaContacto !== 'boolean') {
        errores.solicitaContacto = 'Indica si quieres que el albergue te contacte.';
    }

    const comentario = typeof cuerpo.comentario === 'string' ? cuerpo.comentario.trim() : '';

    if (cuerpo.comentario != null && typeof cuerpo.comentario !== 'string') {
        errores.comentario = 'Debe ser texto.';
    } else if (comentario.length > LARGO_MAXIMO_COMENTARIO) {
        errores.comentario = `Máximo ${LARGO_MAXIMO_COMENTARIO} caracteres.`;
    }

    const enviadas = Array.isArray(cuerpo.respuestas) ? cuerpo.respuestas : null;
    const elegidas = new Map(); // idPregunta → idOpcion

    if (!enviadas) {
        errores.respuestas = 'Responde todas las preguntas.';
    } else {
        for (const r of enviadas) {
            if (r && esEnteroPositivo(r.idPregunta) && esEnteroPositivo(r.idOpcion) && !elegidas.has(r.idPregunta)) {
                elegidas.set(r.idPregunta, r.idOpcion);
            } else {
                errores.respuestas = 'Las respuestas no son válidas.';
            }
        }

        // Exactamente una opción válida por cada pregunta del formulario.
        if (!errores.respuestas) {
            const faltan = preguntas.some((p) => !elegidas.has(p.id));
            const sobran = elegidas.size !== preguntas.length;
            const invalida = preguntas.some((p) => !p.opciones.some((o) => o.id === elegidas.get(p.id)));

            if (faltan || sobran) errores.respuestas = 'Responde todas las preguntas.';
            else if (invalida) errores.respuestas = 'Alguna respuesta no es válida.';
        }
    }

    if (Object.keys(errores).length > 0) lanzarDatosInvalidos(errores);

    return { elegidas, comentario: comentario || null };
}

export async function responder(valorId, cuerpo, usuario) {
    if (usuario.rol === ROL_STAFF) {
        throw new ErrorNegocio(403, 'SOLO_ADOPTANTES', 'Solo la persona que adoptó puede responder su seguimiento.');
    }

    const fila = await buscarExistente(valorId, usuario);
    const estado = estadoDe(fila);

    if (fila.ID_ESTADO_PROCESO !== EN_PRUEBA) {
        throw new ErrorNegocio(409, 'SEGUIMIENTO_NO_VIGENTE', 'Este seguimiento ya no está vigente.');
    }

    if (estado === 'RESPONDIDO') {
        throw new ErrorNegocio(409, 'SEGUIMIENTO_YA_RESPONDIDO', 'Ya respondiste este seguimiento.');
    }

    if (estado === 'PROGRAMADO') {
        throw new ErrorNegocio(409, 'SEGUIMIENTO_NO_HABILITADO', 'Este seguimiento todavía no está habilitado.');
    }

    if (estado === 'NO_ATENDIDO') {
        throw new ErrorNegocio(409, 'SEGUIMIENTO_VENCIDO', 'El plazo para responder este seguimiento ya terminó.');
    }

    const [preguntas, semaforos] = await Promise.all([
        listarInstrumento().then(agruparInstrumento),
        listarSemaforos()
    ]);

    const { elegidas, comentario } = validarRespuestas(cuerpo, preguntas);

    // Puntaje de cada opción elegida y si alguna es de alarma.
    const respuestas = preguntas.map((p) => ({ idPregunta: p.id, opcion: p.opciones.find((o) => o.id === elegidas.get(p.id)) }));
    const promedio = redondear(respuestas.reduce((suma, r) => suma + r.opcion.puntaje, 0) / respuestas.length);
    const hayAlarma = respuestas.some((r) => r.opcion.esAlarma);

    // Una alarma pone el semáforo en rojo sin mirar el promedio.
    const semaforo = hayAlarma
        ? semaforos.find((s) => s.ID_SEMAFORO === ROJO)
        : semaforos.find((s) => promedio >= s.PUNTAJE_MIN && promedio <= s.PUNTAJE_MAX);

    if (!semaforo) {
        throw new ErrorNegocio(500, 'SEMAFORO_NO_CONFIGURADO', 'No se pudo calcular el semáforo. Avisa al albergue.');
    }

    const guardado = await guardarRespuestas({
        idSeguimiento: fila.ID_SEGUIMIENTO,
        solicitaContacto: cuerpo.solicitaContacto ? 'S' : 'N',
        comentario,
        puntaje: promedio,
        idSemaforo: semaforo.ID_SEMAFORO,
        respuestas: respuestas.map((r) => ({ idPregunta: r.idPregunta, idOpcion: r.opcion.id }))
    });

    if (!guardado) {
        throw new ErrorNegocio(409, 'SEGUIMIENTO_YA_RESPONDIDO', 'Ya respondiste este seguimiento.');
    }

    return aSeguimiento(await buscarSeguimiento(fila.ID_SEGUIMIENTO, config.negocio.diasRespuestaCheckpoint), false);
}
