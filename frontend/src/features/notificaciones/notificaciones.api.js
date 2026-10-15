// Llamadas al backend del módulo de notificaciones (siempre por peticion()).

import { peticion } from '../../api/cliente.js';

const BASE = '/notificaciones';

export function listarNotificaciones() {
    return peticion(BASE);
}

// { noLeidas }: alimenta el contador del menú.
export function obtenerContador() {
    return peticion(`${BASE}/contador`);
}

export function marcarLeida(id) {
    return peticion(`${BASE}/${id}/leer`, { metodo: 'PATCH' });
}

export function marcarTodasLeidas() {
    return peticion(`${BASE}/leer-todas`, { metodo: 'PATCH' });
}
