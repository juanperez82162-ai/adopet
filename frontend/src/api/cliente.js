const URL_BASE = import.meta.env.VITE_API_URL;

export async function peticionGet(ruta) {
    const respuesta = await fetch(`${URL_BASE}${ruta}`);
    const cuerpo = await respuesta.json();

    if (!cuerpo.ok) {
        throw new Error(cuerpo.error?.mensaje || 'Error desconocido del servidor');
    }

    return cuerpo.datos;
}