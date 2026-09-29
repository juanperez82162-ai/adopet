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
