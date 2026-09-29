import { buscarPermiso } from './auth.repository.js';

const ACCIONES = ['CONSULTAR', 'CREAR', 'MODIFICAR', 'ELIMINAR'];

export async function tienePermiso(documento, nombreOpcion, accion) {
    if (!ACCIONES.includes(accion)) {
        throw new Error(`Acción de permiso desconocida: ${accion}`);
    }

    const permiso = await buscarPermiso(documento, nombreOpcion);

    if (!permiso) {
        return false;
    }

    if (accion === 'CONSULTAR') {
        return true;
    }

    return permiso[accion] === 'S';
}