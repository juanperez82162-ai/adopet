// Llamadas al backend del módulo de mascotas. Las pantallas NUNCA usan
// fetch directo: todo pasa por peticion() (pone el token, entiende el
// formato { ok, datos | error } y lanza ErrorApi con error.detalles).

import { peticion } from '../../api/cliente.js';

const BASE = '/mascotas';

// filtros: { texto, idEspecie, estado } (estado: 'activos' | 'inactivos').
// Solo se envían los que tienen valor.
export function listarMascotas(filtros = {}) {
    const parametros = new URLSearchParams();

    for (const [clave, valor] of Object.entries(filtros)) {
        if (valor) {
            parametros.set(clave, valor);
        }
    }

    const consulta = parametros.toString();
    return peticion(`${BASE}${consulta ? `?${consulta}` : ''}`);
}

export function obtenerMascota(id) {
    return peticion(`${BASE}/${id}`);
}

export function crearMascota(datos) {
    return peticion(BASE, { metodo: 'POST', cuerpo: datos });
}

export function modificarMascota(id, datos) {
    return peticion(`${BASE}/${id}`, { metodo: 'PUT', cuerpo: datos });
}

// Los estados que el staff puede elegir a mano (Disponible, En tratamiento).
export function listarEstados() {
    return peticion(`${BASE}/estados`);
}

// Desactivar: { activo: false, observaciones, fechaSalida? }
// Reactivar:  { activo: true, observaciones, idEstadoMascota }
export function cambiarActivoMascota(id, datos) {
    return peticion(`${BASE}/${id}/estado`, { metodo: 'PATCH', cuerpo: datos });
}

// La foto viaja en un FormData, en el campo "foto".
export function subirFoto(id, archivo) {
    const formulario = new FormData();
    formulario.append('foto', archivo);
    return peticion(`${BASE}/${id}/fotos`, { metodo: 'POST', formulario });
}

// Las fotos sí se borran de verdad (única excepción a "nada se borra").
// Devuelve la ficha actualizada.
export function eliminarFoto(idFoto) {
    return peticion(`${BASE}/fotos/${idFoto}`, { metodo: 'DELETE' });
}

export function marcarFotoPrincipal(idFoto) {
    return peticion(`${BASE}/fotos/${idFoto}/principal`, { metodo: 'PATCH' });
}
