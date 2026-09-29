// Validaciones del formulario de usuario, para avisar mientras se escribe.
// Son una COPIA de backend/src/modules/auth/auth.validaciones.js: el
// backend es el que realmente protege; esto es solo para ayudar a tiempo.
// Si cambias una regla, cámbiala en los dos archivos.

export const EDAD_MINIMA = 18;
export const EDAD_MAXIMA = 100;
export const LARGO_MAXIMO_NOMBRE = 30;
export const LARGO_MINIMO_DIRECCION = 5;
export const LARGO_MAXIMO_DIRECCION = 200;
export const LARGO_MAXIMO_CORREO = 150;
export const LARGO_MINIMO_CONTRASENA = 8;
export const LARGO_MAXIMO_CONTRASENA = 72;

const LETRAS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
const PATRON_NOMBRE = new RegExp(`^[${LETRAS}]+(?:[ '-][${LETRAS}]+)*$`);
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const PATRON_TELEFONO = /^(3\d{9}|60\d{8})$/;

// ---- Limpieza (la misma que hace el backend) ------------------------

function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

export function limpiarNombre(valor) {
    return texto(valor)
        .replace(/\s+/g, ' ')
        .toLocaleLowerCase('es')
        .replace(/(^|[ '-])(\p{L})/gu, (_, separador, letra) => separador + letra.toLocaleUpperCase('es'));
}

export function limpiarDocumento(valor) {
    return texto(valor).replace(/[\s.-]/g, '').toUpperCase();
}

export function limpiarTelefono(valor) {
    return texto(valor).replace(/[\s()-]/g, '').replace(/^\+57/, '');
}

// ---- Reglas por campo -----------------------------------------------

export function errorNombre(valor, etiqueta, obligatorio) {
    const limpio = limpiarNombre(valor);

    if (!limpio) {
        return obligatorio ? `Escribe tu ${etiqueta}.` : null;
    }

    if (limpio.length > LARGO_MAXIMO_NOMBRE) {
        return `Máximo ${LARGO_MAXIMO_NOMBRE} caracteres.`;
    }

    if (!PATRON_NOMBRE.test(limpio)) {
        return 'Solo letras (sin números ni símbolos).';
    }

    if (limpio.length < 2) {
        return 'Escríbelo completo, no solo la inicial.';
    }

    return null;
}

// regla: el tipo de documento seleccionado ({ soloNumeros, largoMinimo, largoMaximo }).
export function errorDocumento(valor, regla) {
    const documento = limpiarDocumento(valor);

    if (!documento) {
        return 'Escribe tu número de documento.';
    }

    if (!regla) {
        return null;
    }

    const largo = `${regla.largoMinimo} a ${regla.largoMaximo}`;

    if (regla.soloNumeros) {
        if (!/^\d+$/.test(documento)) {
            return 'Este tipo de documento solo lleva números.';
        }

        if (documento.length < regla.largoMinimo || documento.length > regla.largoMaximo) {
            return `Debe tener de ${largo} dígitos.`;
        }

        return null;
    }

    if (!/^[A-Z0-9]+$/.test(documento)) {
        return 'Solo letras y números.';
    }

    if (documento.length < regla.largoMinimo || documento.length > regla.largoMaximo) {
        return `Debe tener de ${largo} caracteres.`;
    }

    return null;
}

export function ayudaDocumento(regla) {
    if (!regla) {
        return 'Primero elige el tipo de documento.';
    }

    return regla.soloNumeros
        ? `Solo números, de ${regla.largoMinimo} a ${regla.largoMaximo} dígitos.`
        : `Letras y números, de ${regla.largoMinimo} a ${regla.largoMaximo} caracteres.`;
}

export function errorCorreo(valor) {
    const correo = texto(valor).toLowerCase();

    if (!correo) {
        return 'Escribe tu correo.';
    }

    if (!PATRON_CORREO.test(correo) || correo.length > LARGO_MAXIMO_CORREO) {
        return 'Escribe un correo válido, por ejemplo nombre@correo.com.';
    }

    return null;
}

export function requisitosContrasena(contrasena) {
    return {
        largo: contrasena.length >= LARGO_MINIMO_CONTRASENA,
        letra: /\p{L}/u.test(contrasena),
        numero: /\d/.test(contrasena),
        especial: /[^\p{L}\d\s]/u.test(contrasena)
    };
}

export function errorContrasena(contrasena) {
    if (!contrasena) {
        return 'Escribe una contraseña.';
    }

    if (contrasena.length > LARGO_MAXIMO_CONTRASENA) {
        return `Máximo ${LARGO_MAXIMO_CONTRASENA} caracteres.`;
    }

    const cumple = Object.values(requisitosContrasena(contrasena)).every(Boolean);

    if (!cumple) {
        return 'La contraseña aún no cumple todos los requisitos.';
    }

    return null;
}

export function errorConfirmacion(contrasena, confirmacion) {
    if (!confirmacion) {
        return 'Repite la contraseña.';
    }

    return contrasena === confirmacion ? null : 'Las contraseñas no coinciden.';
}

export function errorTelefono(valor) {
    const telefono = limpiarTelefono(valor);

    if (!telefono) {
        return 'Escribe tu teléfono.';
    }

    if (!PATRON_TELEFONO.test(telefono)) {
        return 'Debe ser un celular (300 123 4567) o un fijo (604 123 4567) de 10 dígitos.';
    }

    return null;
}

export function errorDireccion(valor) {
    const direccion = texto(valor).replace(/\s+/g, ' ');

    if (!direccion) {
        return 'Escribe tu dirección.';
    }

    if (direccion.length < LARGO_MINIMO_DIRECCION) {
        return 'La dirección es muy corta.';
    }

    // La columna mide en bytes: una letra con tilde ocupa 2.
    if (new TextEncoder().encode(direccion).length > LARGO_MAXIMO_DIRECCION) {
        return `Máximo ${LARGO_MAXIMO_DIRECCION} caracteres.`;
    }

    return null;
}

export function calcularEdad(fechaNacimiento, hoy = new Date()) {
    const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);

    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const aunNoCumple =
        hoy.getMonth() < nacimiento.getMonth() ||
        (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());

    if (aunNoCumple) {
        edad--;
    }

    return edad;
}

function esFechaValida(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const convertida = new Date(`${fecha}T00:00:00Z`);
    return !Number.isNaN(convertida.getTime()) && convertida.toISOString().startsWith(fecha);
}

export function errorFechaNacimiento(fecha, hoy = new Date()) {
    if (!fecha) {
        return 'Escribe tu fecha de nacimiento.';
    }

    if (!esFechaValida(fecha)) {
        return 'La fecha no es válida.';
    }

    const edad = calcularEdad(fecha, hoy);

    if (edad < EDAD_MINIMA) {
        return `Debes ser mayor de edad (${EDAD_MINIMA} años) para registrarte.`;
    }

    if (edad > EDAD_MAXIMA) {
        return 'Revisa el año: la fecha es demasiado antigua.';
    }

    return null;
}

// Fecha de hoy menos N años, en formato AAAA-MM-DD (para el calendario).
export function fechaHaceAnios(anios, hoy = new Date()) {
    const fecha = new Date(hoy.getFullYear() - anios, hoy.getMonth(), hoy.getDate());
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// ---- Todo el formulario de registro ---------------------------------
// Devuelve { campo: mensaje } solo con los campos que tienen error.

export function validarRegistro(datos, reglaDocumento) {
    const errores = {
        idTipoDocumento: datos.idTipoDocumento ? null : 'Selecciona el tipo de documento.',
        documento: errorDocumento(datos.documento, reglaDocumento),
        primerNombre: errorNombre(datos.primerNombre, 'primer nombre', true),
        segundoNombre: errorNombre(datos.segundoNombre, 'segundo nombre', false),
        primerApellido: errorNombre(datos.primerApellido, 'primer apellido', true),
        segundoApellido: errorNombre(datos.segundoApellido, 'segundo apellido', false),
        correo: errorCorreo(datos.correo),
        contrasena: errorContrasena(datos.contrasena),
        confirmacion: errorConfirmacion(datos.contrasena, datos.confirmacion),
        telefono: errorTelefono(datos.telefono),
        fechaNacimiento: errorFechaNacimiento(datos.fechaNacimiento),
        idCiudad: datos.idCiudad ? null : 'Selecciona la ciudad.',
        direccion: errorDireccion(datos.direccion)
    };

    return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje));
}

// ---- Mi perfil ------------------------------------------------------

export function validarDatosPerfil(datos) {
    const errores = {
        primerNombre: errorNombre(datos.primerNombre, 'primer nombre', true),
        segundoNombre: errorNombre(datos.segundoNombre, 'segundo nombre', false),
        primerApellido: errorNombre(datos.primerApellido, 'primer apellido', true),
        segundoApellido: errorNombre(datos.segundoApellido, 'segundo apellido', false),
        correo: errorCorreo(datos.correo),
        telefono: errorTelefono(datos.telefono),
        idCiudad: datos.idCiudad ? null : 'Selecciona la ciudad.',
        direccion: errorDireccion(datos.direccion)
    };

    return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje));
}

export function validarCambioContrasena(datos) {
    const errores = {
        contrasenaActual: datos.contrasenaActual ? null : 'Escribe tu contraseña actual.',
        contrasenaNueva: errorContrasena(datos.contrasenaNueva)
            || (datos.contrasenaNueva === datos.contrasenaActual ? 'Debe ser distinta a la contraseña actual.' : null),
        confirmacion: errorConfirmacion(datos.contrasenaNueva, datos.confirmacion)
    };

    return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje));
}
