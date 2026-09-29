import { peticion } from '../../api/cliente.js';

export function login(correo, contrasena) {
    return peticion('/auth/login', { metodo: 'POST', cuerpo: { correo, contrasena } });
}

export function registrar(datos) {
    return peticion('/auth/registro', { metodo: 'POST', cuerpo: datos });
}

export function obtenerMenu() {
    return peticion('/auth/menu');
}

export function solicitarRecuperacion(correo) {
    return peticion('/auth/recuperar', { metodo: 'POST', cuerpo: { correo } });
}

export function restablecerContrasena(token, contrasena) {
    return peticion('/auth/restablecer', { metodo: 'POST', cuerpo: { token, contrasena } });
}
