import { peticion } from '../../api/cliente.js';

export function obtenerMatriz() {
    return peticion('/accesos');
}

// permisos: solo los módulos que el perfil puede ver.
export function guardarPermisos(idPerfil, permisos) {
    return peticion(`/accesos/${idPerfil}`, { metodo: 'PUT', cuerpo: { permisos } });
}

// ---- Perfiles (los roles son fijos) ---------------------------------

export function crearPerfil(nombre, idRol) {
    return peticion('/accesos/perfiles', { metodo: 'POST', cuerpo: { nombre, idRol } });
}

export function renombrarPerfil(idPerfil, nombre) {
    return peticion(`/accesos/perfiles/${idPerfil}`, { metodo: 'PUT', cuerpo: { nombre } });
}

export function cambiarEstadoPerfil(idPerfil, activo) {
    return peticion(`/accesos/perfiles/${idPerfil}/estado`, { metodo: 'PATCH', cuerpo: { activo } });
}
