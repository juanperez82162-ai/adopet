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
