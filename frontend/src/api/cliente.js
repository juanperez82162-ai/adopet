// Cliente HTTP único de la aplicación.
// Es el ÚNICO archivo que conoce la URL del backend y dónde vive el token.

const URL_BASE = (import.meta.env.VITE_API_URL || '').trim();

const CLAVE_TOKEN = 'adopet_token';
const CLAVE_USUARIO = 'adopet_usuario';

export const EVENTO_SESION_EXPIRADA = 'adopet:sesion-expirada';

// detalles: { campo: mensaje } cuando el backend marca campos puntuales.
export class ErrorApi extends Error {
    constructor(codigo, mensaje, estadoHttp, detalles = null) {
        super(mensaje);
        this.name = 'ErrorApi';
        this.codigo = codigo;
        this.estadoHttp = estadoHttp;
        this.detalles = detalles;
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

// formulario: un FormData (para subir archivos). Con él no se pone
// Content-Type: el navegador lo arma solo, con el separador del multipart.
export async function peticion(ruta, { metodo = 'GET', cuerpo, formulario } = {}) {
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
            body: formulario ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined)
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
            respuesta.status,
            json.error?.detalles || null
        );
    }

    return json.datos;
}

export function peticionGet(ruta) {
    return peticion(ruta);
}

// Descarga un archivo protegido (por ejemplo una foto) con el token de la
// sesión y lo devuelve como Blob. Una etiqueta <img src="..."> no puede
// mandar el token, por eso las fotos se piden aquí.
export async function descargarImagen(ruta) {
    const token = leerToken();
    let respuesta;

    try {
        respuesta = await fetch(`${URL_BASE}${ruta}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
    } catch {
        throw new ErrorApi('SIN_CONEXION', 'No se pudo conectar con el servidor.', 0);
    }

    if (!respuesta.ok) {
        if (respuesta.status === 401 && token) {
            window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
        }

        throw new ErrorApi('ARCHIVO_NO_DISPONIBLE', 'No se pudo cargar el archivo.', respuesta.status);
    }

    return respuesta.blob();
}
