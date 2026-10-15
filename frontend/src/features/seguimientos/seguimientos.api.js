// Llamadas al backend del módulo de seguimientos (siempre por peticion()).

import { peticion } from '../../api/cliente.js';

const BASE = '/seguimientos';

// Preguntas y opciones del checkpoint (sin puntajes).
export function obtenerFormulario() {
    return peticion(`${BASE}/formulario`);
}

// El staff recibe todos; el adoptante, solo los suyos.
export function listarSeguimientos(filtros = {}) {
    const parametros = new URLSearchParams();

    for (const [clave, valor] of Object.entries(filtros)) {
        if (valor) parametros.set(clave, valor);
    }

    const consulta = parametros.toString();
    return peticion(`${BASE}${consulta ? `?${consulta}` : ''}`);
}

// El staff además recibe las respuestas pregunta por pregunta.
export function obtenerSeguimiento(id) {
    return peticion(`${BASE}/${id}`);
}

// respuestas: [{ idPregunta, idOpcion }]
export function responderSeguimiento(id, respuestas, solicitaContacto, comentario) {
    return peticion(`${BASE}/${id}/respuestas`, {
        metodo: 'POST',
        cuerpo: { respuestas, solicitaContacto, comentario }
    });
}
