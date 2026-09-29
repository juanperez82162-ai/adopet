// Validaciones del formulario, para avisar mientras se escribe.
// Son una COPIA de las reglas de backend/src/modules/ejemplo/ejemplo.service.js:
// el backend es el que protege de verdad. Si cambias una regla, cámbiala
// en los dos lados.

// CAMBIA ESTO: los mismos límites del backend.
export const LARGO_MAXIMO_NOMBRE = 60;
export const LARGO_MAXIMO_DESCRIPCION = 200;

// Recibe los datos del formulario y devuelve { campo: mensaje } SOLO con
// los campos que tienen error (es lo que espera useFormulario).
export function validarEjemplo(datos) {
    const nombre = datos.nombre.trim();
    const descripcion = datos.descripcion.trim();

    const errores = {
        nombre: !nombre
            ? 'Escribe el nombre.'
            : nombre.length > LARGO_MAXIMO_NOMBRE ? `Máximo ${LARGO_MAXIMO_NOMBRE} caracteres.` : null,
        descripcion: descripcion.length > LARGO_MAXIMO_DESCRIPCION
            ? `Máximo ${LARGO_MAXIMO_DESCRIPCION} caracteres.`
            : null
    };

    return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje));
}
