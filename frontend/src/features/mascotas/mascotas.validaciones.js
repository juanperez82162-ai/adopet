// Validaciones de los formularios, para avisar mientras se escribe.
// Son una COPIA de las reglas de backend/src/modules/mascotas/mascotas.service.js:
// el backend es el que protege de verdad. Si cambias una regla, cámbiala
// en los dos lados.

export const LARGO_MAXIMO_NOMBRE = 50;
export const LARGO_MAXIMO_NECESIDADES = 500;
export const LARGO_MAXIMO_OBSERVACIONES = 200;
export const EDAD_MAXIMA_MESES = 999;

// Fotos: JPG, PNG o WEBP · máximo 5 MB · máximo 5 por mascota.
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
export const TAMANIO_MAXIMO_FOTO = 5 * 1024 * 1024;
export const LIMITE_FOTOS = 5;

// El formulario pide la edad en años y meses; el backend la guarda en meses.
export function edadEnMeses(datos) {
    return Number(datos.edadAnios || 0) * 12 + Number(datos.edadMeses || 0);
}

const esEntero = (texto) => /^\d+$/.test(String(texto).trim());

export function validarMascota(datos) {
    const nombre = datos.nombre.trim();
    const descripcion = datos.descripcionNecesidades.trim();
    const anios = String(datos.edadAnios).trim();
    const meses = String(datos.edadMeses).trim();

    const errores = {
        nombre: !nombre
            ? 'Escribe el nombre.'
            : nombre.length > LARGO_MAXIMO_NOMBRE ? `Máximo ${LARGO_MAXIMO_NOMBRE} caracteres.` : null,
        idEspecie: !datos.idEspecie ? 'Elige la especie.' : null,
        idRaza: !datos.idRaza ? 'Elige la raza.' : null,
        idSexo: !datos.idSexo ? 'Elige el sexo.' : null,
        idTamanio: !datos.idTamanio ? 'Elige el tamaño.' : null,
        idNivelEnergia: !datos.idNivelEnergia ? 'Elige el nivel de energía.' : null,
        compatibleNinos: !datos.compatibleNinos ? 'Indica si es compatible con niños.' : null,
        compatibleOtrasMascotas: !datos.compatibleOtrasMascotas ? 'Indica si es compatible con otras mascotas.' : null,
        tieneNecesidadesEspeciales: !datos.tieneNecesidadesEspeciales ? 'Indica si tiene necesidades especiales.' : null,
        descripcionNecesidades: datos.tieneNecesidadesEspeciales === 'S' && descripcion.length > LARGO_MAXIMO_NECESIDADES
            ? `Máximo ${LARGO_MAXIMO_NECESIDADES} caracteres.`
            : null
    };

    if (anios && !esEntero(anios)) {
        errores.edadAnios = 'Escribe solo números enteros.';
    }

    if (meses && !esEntero(meses)) {
        errores.edadMeses = 'Escribe solo números enteros.';
    } else if (meses && Number(meses) > 11) {
        errores.edadMeses = 'Los meses van de 0 a 11.';
    }

    if (!errores.edadAnios && !errores.edadMeses) {
        const total = edadEnMeses(datos);

        if (total < 1) {
            errores.edadAnios = 'Indica la edad al ingresar (al menos 1 mes).';
        } else if (total > EDAD_MAXIMA_MESES) {
            errores.edadAnios = 'La edad es demasiado alta.';
        }
    }

    return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje));
}

// Convierte los valores del formulario (todos texto) al cuerpo que espera
// el backend. El estado solo viaja si el staff lo puede elegir.
export function aCuerpoMascota(datos) {
    const cuerpo = {
        nombre: datos.nombre.trim(),
        idRaza: Number(datos.idRaza),
        edadMesesIngreso: edadEnMeses(datos),
        idTamanio: Number(datos.idTamanio),
        idSexo: Number(datos.idSexo),
        idNivelEnergia: Number(datos.idNivelEnergia),
        compatibleNinos: datos.compatibleNinos === 'S',
        compatibleOtrasMascotas: datos.compatibleOtrasMascotas === 'S',
        tieneNecesidadesEspeciales: datos.tieneNecesidadesEspeciales === 'S',
        descripcionNecesidades: datos.descripcionNecesidades.trim()
    };

    if (datos.idEstadoMascota) {
        cuerpo.idEstadoMascota = Number(datos.idEstadoMascota);
    }

    return cuerpo;
}

// Desactivar y reactivar piden el motivo; la fecha de salida es opcional.
export function validarAlbergue(datos) {
    const observaciones = datos.observaciones.trim();

    const errores = {
        observaciones: !observaciones
            ? 'Escribe el motivo.'
            : observaciones.length > LARGO_MAXIMO_OBSERVACIONES ? `Máximo ${LARGO_MAXIMO_OBSERVACIONES} caracteres.` : null
    };

    return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje));
}
