// Reglas de formato de los datos de un usuario.
// Las usan el registro público, el script crear-admin y el cambio de
// contraseña: así ningún camino puede saltarse una validación.
// Cada función devuelve el mensaje de error, o null si el dato es válido.

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

// ---- Limpieza (se aplica antes de validar) --------------------------

function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

// "  juan   CARLOS " -> "Juan Carlos"
export function limpiarNombre(valor) {
    return texto(valor)
        .replace(/\s+/g, ' ')
        .toLocaleLowerCase('es')
        .replace(/(^|[ '-])(\p{L})/gu, (_, separador, letra) => separador + letra.toLocaleUpperCase('es'));
}

// "1.036.123.456" -> "1036123456"; "ab 12345" -> "AB12345"
export function limpiarDocumento(valor) {
    return texto(valor).replace(/[\s.-]/g, '').toUpperCase();
}

// "+57 300 123 4567" -> "3001234567"
export function limpiarTelefono(valor) {
    return texto(valor).replace(/[\s()-]/g, '').replace(/^\+57/, '');
}

export function normalizarUsuario(cuerpo = {}) {
    return {
        documento: limpiarDocumento(cuerpo.documento),
        idTipoDocumento: Number(cuerpo.idTipoDocumento),
        primerNombre: limpiarNombre(cuerpo.primerNombre),
        segundoNombre: limpiarNombre(cuerpo.segundoNombre) || null,
        primerApellido: limpiarNombre(cuerpo.primerApellido),
        segundoApellido: limpiarNombre(cuerpo.segundoApellido) || null,
        correo: texto(cuerpo.correo).toLowerCase(),
        contrasena: typeof cuerpo.contrasena === 'string' ? cuerpo.contrasena : '',
        telefono: limpiarTelefono(cuerpo.telefono),
        direccion: texto(cuerpo.direccion).replace(/\s+/g, ' '),
        idCiudad: Number(cuerpo.idCiudad),
        fechaNacimiento: texto(cuerpo.fechaNacimiento)
    };
}

// ---- Reglas por campo -----------------------------------------------

export function errorNombre(valor, etiqueta, obligatorio) {
    if (!valor) {
        return obligatorio ? `Escribe tu ${etiqueta}.` : null;
    }

    if (valor.length > LARGO_MAXIMO_NOMBRE) {
        return `Máximo ${LARGO_MAXIMO_NOMBRE} caracteres.`;
    }

    if (!PATRON_NOMBRE.test(valor)) {
        return 'Solo letras (sin números ni símbolos).';
    }

    if (valor.length < 2) {
        return 'Escríbelo completo, no solo la inicial.';
    }

    return null;
}

// regla: { soloNumeros, largoMinimo, largoMaximo } del tipo de documento.
export function errorDocumento(documento, regla) {
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

export function errorCorreo(correo) {
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
        return 'Mínimo 8 caracteres, con letras, números y al menos un carácter especial (!@#$%...).';
    }

    return null;
}

export function errorTelefono(telefono) {
    if (!telefono) {
        return 'Escribe tu teléfono.';
    }

    if (!PATRON_TELEFONO.test(telefono)) {
        return 'Debe ser un celular (300 123 4567) o un fijo (604 123 4567) de 10 dígitos.';
    }

    return null;
}

export function errorDireccion(direccion) {
    if (!direccion) {
        return 'Escribe tu dirección.';
    }

    if (direccion.length < LARGO_MINIMO_DIRECCION) {
        return 'La dirección es muy corta.';
    }

    // La columna mide en bytes: una letra con tilde ocupa 2.
    if (Buffer.byteLength(direccion, 'utf8') > LARGO_MAXIMO_DIRECCION) {
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

// ---- Grupos de reglas ------------------------------------------------
// Cada uno devuelve { campo: mensaje } solo con los campos que tienen error.

function soloConError(errores) {
    return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje));
}

// Los datos que el usuario puede cambiar después, desde Mi perfil o
// desde Usuarios: nombre, correo, teléfono, dirección y ciudad.
export function erroresDatosPerfil(datos) {
    return soloConError({
        primerNombre: errorNombre(datos.primerNombre, 'primer nombre', true),
        segundoNombre: errorNombre(datos.segundoNombre, 'segundo nombre', false),
        primerApellido: errorNombre(datos.primerApellido, 'primer apellido', true),
        segundoApellido: errorNombre(datos.segundoApellido, 'segundo apellido', false),
        correo: errorCorreo(datos.correo),
        telefono: errorTelefono(datos.telefono),
        direccion: errorDireccion(datos.direccion),
        idCiudad: Number.isInteger(datos.idCiudad) && datos.idCiudad > 0
            ? null : 'Selecciona la ciudad.'
    });
}

// Todo el registro. El documento se revisa aparte, porque su regla sale de la base.
export function erroresFormatoUsuario(datos) {
    return {
        ...erroresDatosPerfil(datos),
        ...soloConError({
            idTipoDocumento: Number.isInteger(datos.idTipoDocumento) && datos.idTipoDocumento > 0
                ? null : 'Selecciona el tipo de documento.',
            contrasena: errorContrasena(datos.contrasena),
            fechaNacimiento: errorFechaNacimiento(datos.fechaNacimiento)
        })
    };
}
