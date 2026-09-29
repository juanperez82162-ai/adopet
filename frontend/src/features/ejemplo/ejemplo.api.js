// =====================================================================
// MÓDULO DE EJEMPLO — plantilla del frontend. No está en Rutas.jsx, así
// que nunca se muestra. Ver backend/src/modules/ejemplo/LEEME.md.
// =====================================================================
//
// Llamadas al backend del módulo. Las pantallas NUNCA usan fetch
// directo: todo pasa por peticion(), que pone el token, entiende el
// formato { ok, datos | error } y lanza ErrorApi con error.detalles.

import { peticion } from '../../api/cliente.js';

// CAMBIA ESTO: la ruta base con la que se registró en app.js
// (por ejemplo '/mascotas').
const BASE = '/ejemplos';

// filtros: { texto, estado } (estado: 'activos' | 'inactivos').
// Solo se envían los que tienen valor.
export function listarEjemplos(filtros = {}) {
    const parametros = new URLSearchParams();

    for (const [clave, valor] of Object.entries(filtros)) {
        if (valor) {
            parametros.set(clave, valor);
        }
    }

    const consulta = parametros.toString();
    return peticion(`${BASE}${consulta ? `?${consulta}` : ''}`);
}

export function obtenerEjemplo(id) {
    return peticion(`${BASE}/${id}`);
}

export function crearEjemplo(datos) {
    return peticion(BASE, { metodo: 'POST', cuerpo: datos });
}

export function modificarEjemplo(id, datos) {
    return peticion(`${BASE}/${id}`, { metodo: 'PUT', cuerpo: datos });
}

export function cambiarEstadoEjemplo(id, activo) {
    return peticion(`${BASE}/${id}/estado`, { metodo: 'PATCH', cuerpo: { activo } });
}
