import { peticion } from '../../api/cliente.js';

// { bloques: [{ opcion, titulo, ruta, cifras: [{ clave, etiqueta, valor }] }] }
// Solo trae los bloques de los módulos que la persona puede ver.
export function obtenerResumen() {
    return peticion('/inicio/resumen');
}
