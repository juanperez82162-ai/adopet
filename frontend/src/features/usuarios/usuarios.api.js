import { peticion } from '../../api/cliente.js';

export function obtenerMiPerfil() {
    return peticion('/usuarios/mi-perfil');
}

export function actualizarMiPerfil(datos) {
    return peticion('/usuarios/mi-perfil', { metodo: 'PUT', cuerpo: datos });
}

export function cambiarMiContrasena(contrasenaActual, contrasenaNueva) {
    return peticion('/usuarios/mi-perfil/contrasena', {
        metodo: 'PUT',
        cuerpo: { contrasenaActual, contrasenaNueva }
    });
}

// ---- Administración de usuarios ---------------------------------------

// filtros: { buscar, idPerfil, estado } (estado: 'activos' | 'inactivos').
export function listarUsuarios(filtros = {}) {
    const parametros = new URLSearchParams();

    for (const [clave, valor] of Object.entries(filtros)) {
        if (valor) {
            parametros.set(clave, valor);
        }
    }

    const consulta = parametros.toString();
    return peticion(`/usuarios${consulta ? `?${consulta}` : ''}`);
}

export function listarPerfiles() {
    return peticion('/usuarios/perfiles');
}

export function obtenerUsuario(documento) {
    return peticion(`/usuarios/${encodeURIComponent(documento)}`);
}

export function editarUsuario(documento, datos) {
    return peticion(`/usuarios/${encodeURIComponent(documento)}`, { metodo: 'PUT', cuerpo: datos });
}

export function cambiarPerfilUsuario(documento, idPerfil) {
    return peticion(`/usuarios/${encodeURIComponent(documento)}/perfil`, { metodo: 'PATCH', cuerpo: { idPerfil } });
}

export function cambiarEstadoUsuario(documento, activo) {
    return peticion(`/usuarios/${encodeURIComponent(documento)}/estado`, { metodo: 'PATCH', cuerpo: { activo } });
}
