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
