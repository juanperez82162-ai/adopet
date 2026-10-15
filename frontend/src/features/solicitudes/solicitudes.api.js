// Llamadas al backend del módulo de solicitudes (siempre por peticion()).

import { peticion } from '../../api/cliente.js';

const BASE = '/solicitudes';

// Tipos de vivienda, tiempos disponibles, especies y largos máximos.
export function obtenerOpcionesCuestionario() {
    return peticion(`${BASE}/opciones-cuestionario`);
}

// No guarda nada: devuelve las mascotas más compatibles con las respuestas.
export function recomendarMascotas(cuestionario, idEspecie) {
    return peticion(`${BASE}/recomendaciones`, {
        metodo: 'POST',
        cuerpo: { cuestionario, idEspecie: idEspecie || undefined }
    });
}

// cuestionario es opcional: solo va si la persona lo respondió.
export function crearSolicitud(idMascota, cuestionario) {
    return peticion(BASE, { metodo: 'POST', cuerpo: { idMascota, cuestionario } });
}

// ---- Consulta y gestión -----------------------------------------------

// filtros: { idEstadoProceso, texto }. El staff recibe todas; el adoptante, las suyas.
export function listarSolicitudes(filtros = {}) {
    const parametros = new URLSearchParams();

    for (const [clave, valor] of Object.entries(filtros)) {
        if (valor) parametros.set(clave, valor);
    }

    const consulta = parametros.toString();
    return peticion(`${BASE}${consulta ? `?${consulta}` : ''}`);
}

export function obtenerSolicitud(id) {
    return peticion(`${BASE}/${id}`);
}

export function formalizarSolicitud(id, observaciones) {
    return peticion(`${BASE}/${id}/formalizar`, { metodo: 'PATCH', cuerpo: { observaciones } });
}

// idEstadoProceso: 7 adoptante · 8 staff · 9 otros.
export function cancelarSolicitud(id, idEstadoProceso, observaciones) {
    return peticion(`${BASE}/${id}/cancelar`, { metodo: 'PATCH', cuerpo: { idEstadoProceso, observaciones } });
}
