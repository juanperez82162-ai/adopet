// Cliente HTTP único de la aplicación.
// Es el ÚNICO archivo que conoce la URL del backend y dónde vive el token.

const URL_BASE = (import.meta.env.VITE_API_URL || '').trim();

const CLAVE_TOKEN = 'adopet_token';
const CLAVE_USUARIO = 'adopet_usuario';

export const EVENTO_SESION_EXPIRADA = 'adopet:sesion-expirada';

export class ErrorApi extends Error {
    constructor(codigo, mensaje, estadoHttp) {
        super(mensaje);
        this.name = 'ErrorApi';
        this.codigo = codigo;
        this.estadoHttp = estadoHttp;
    }
}

// ---- Sesión guardada en el navegador --------------------------------

export function guardarSesion(token, usuario) {
    try {
        localStorage.setItem(CLAVE_TOKEN, token);
        localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    } catch {
        // Si el navegador bloquea el almacenamiento, la sesión solo dura
        // mientras la página esté abierta. No es un error fatal.
    }
}

export function leerToken() {
    try {
        return localStorage.getItem(CLAVE_TOKEN);
    } catch {
        return null;
    }
}

export function leerUsuarioGuardado() {
    try {
        const texto = localStorage.getItem(CLAVE_USUARIO);
        return texto ? JSON.parse(texto) : null;
    } catch {
        return null;
    }
}

export function borrarSesion() {
    try {
        localStorage.removeItem(CLAVE_TOKEN);
        localStorage.removeItem(CLAVE_USUARIO);
    } catch {
        // Nada que hacer.
    }
}

// ---- Peticiones -----------------------------------------------------

export async function peticion(ruta, { metodo = 'GET', cuerpo } = {}) {
    const token = leerToken();
    const encabezados = {};

    if (cuerpo !== undefined) {
        encabezados['Content-Type'] = 'application/json';
    }

    if (token) {
        encabezados.Authorization = `Bearer ${token}`;
    }

    let respuesta;

    try {
        respuesta = await fetch(`${URL_BASE}${ruta}`, {
            method: metodo,
            headers: encabezados,
            body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined
        });
    } catch {
        throw new ErrorApi('SIN_CONEXION', 'No se pudo conectar con el servidor. Verifique que el backend esté encendido.', 0);
    }

    let json;

    try {
        json = await respuesta.json();
    } catch {
        throw new ErrorApi('RESPUESTA_INVALIDA', 'El servidor respondió algo inesperado.', respuesta.status);
    }

    if (!json.ok) {
        // Un 401 con token significa que la sesión venció o ya no es válida:
        // se avisa a toda la aplicación para que cierre la sesión.
        if (respuesta.status === 401 && token) {
            window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
        }

        throw new ErrorApi(
            json.error?.codigo || 'ERROR_DESCONOCIDO',
            json.error?.mensaje || 'Ocurrió un error inesperado.',
            respuesta.status
        );
    }

    return json.datos;
}

export function peticionGet(ruta) {
    return peticion(ruta);
}
