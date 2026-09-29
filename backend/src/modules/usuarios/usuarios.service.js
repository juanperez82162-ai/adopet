import { ErrorNegocio } from '../../utils/errores.js';
import { normalizarUsuario, erroresDatosPerfil } from '../auth/auth.validaciones.js';
import { cambiarContrasena } from '../auth/auth.service.js';
import {
    buscarUsuarioPorDocumento,
    existeCiudadActiva,
    actualizarDatosUsuario,
    listarUsuarios,
    listarPerfilesActivos,
    actualizarPerfilUsuario,
    actualizarEstadoUsuario
} from './usuarios.repository.js';

const LIMITE_LISTA = 200;

// ---- Mi perfil -------------------------------------------------------
// Cada quien ve y edita SOLO su propio registro: el documento sale del
// token, nunca del cuerpo de la petición ni de la URL.

export async function obtenerMiPerfil(documento) {
    const fila = await buscarUsuarioPorDocumento(documento);

    if (!fila || fila.ACTIVO !== 'S') {
        throw new ErrorNegocio(404, 'USUARIO_NO_EXISTE', 'El usuario no existe o está desactivado.');
    }

    return aDetalle(fila);
}

export async function actualizarMiPerfil(documento, cuerpo) {
    await guardarDatos(documento, cuerpo);
    return obtenerMiPerfil(documento);
}

export async function cambiarMiContrasena(documento, cuerpo) {
    const actual = typeof cuerpo.contrasenaActual === 'string' ? cuerpo.contrasenaActual : '';
    const nueva = typeof cuerpo.contrasenaNueva === 'string' ? cuerpo.contrasenaNueva : '';

    if (!actual) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'Revisa los campos marcados.',
            { contrasenaActual: 'Escribe tu contraseña actual.' });
    }

    await cambiarContrasena(documento, actual, nueva);
}

// ---- Administración de usuarios (solo con permiso USUARIOS) ----------

export async function buscarUsuarios(consulta) {
    const filtros = {
        buscar: limpiarBusqueda(consulta.buscar),
        idPerfil: Number.isInteger(Number(consulta.idPerfil)) && Number(consulta.idPerfil) > 0
            ? Number(consulta.idPerfil) : null,
        activo: consulta.estado === 'activos' ? 'S' : consulta.estado === 'inactivos' ? 'N' : null
    };

    const filas = await listarUsuarios(filtros, LIMITE_LISTA + 1);

    // Se pide una fila de más solo para saber si hay más resultados.
    return {
        usuarios: filas.slice(0, LIMITE_LISTA).map(aResumen),
        hayMas: filas.length > LIMITE_LISTA
    };
}

export async function obtenerPerfiles() {
    const filas = await listarPerfilesActivos();

    return filas.map((fila) => ({
        id: fila.ID_PERFIL,
        nombre: fila.NOMBRE_PERFIL,
        rol: fila.NOMBRE_ROL
    }));
}

export async function obtenerUsuario(documento) {
    return aDetalle(await buscarExistente(documento));
}

export async function editarUsuario(documento, cuerpo) {
    await buscarExistente(documento);
    await guardarDatos(documento, cuerpo);
    return obtenerUsuario(documento);
}

export async function cambiarPerfilUsuario(documentoAdmin, documento, cuerpo) {
    // Regla: un Admin no se quita su propio perfil. Otro Admin sí puede
    // cambiárselo; así el sistema nunca queda sin quien lo administre.
    if (documento === documentoAdmin) {
        throw new ErrorNegocio(409, 'ACCION_SOBRE_SI_MISMO',
            'No puedes cambiar tu propio perfil. Pídeselo a otro administrador.');
    }

    const usuario = await buscarExistente(documento);
    const idPerfil = Number(cuerpo.idPerfil);
    const perfiles = await listarPerfilesActivos();

    if (!perfiles.some((perfil) => perfil.ID_PERFIL === idPerfil)) {
        throw new ErrorNegocio(400, 'PERFIL_INVALIDO', 'El perfil no es válido.', { idPerfil: 'Selecciona un perfil válido.' });
    }

    if (usuario.ID_PERFIL !== idPerfil) {
        await actualizarPerfilUsuario(documento, idPerfil);
    }

    return obtenerUsuario(documento);
}

export async function cambiarEstadoUsuario(documentoAdmin, documento, cuerpo) {
    if (typeof cuerpo.activo !== 'boolean') {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'activo: debe ser true o false.');
    }

    // Regla: un Admin no se desactiva a sí mismo.
    if (documento === documentoAdmin && !cuerpo.activo) {
        throw new ErrorNegocio(409, 'ACCION_SOBRE_SI_MISMO',
            'No puedes desactivar tu propia cuenta. Pídeselo a otro administrador.');
    }

    await buscarExistente(documento);
    await actualizarEstadoUsuario(documento, cuerpo.activo ? 'S' : 'N');

    return obtenerUsuario(documento);
}

// ---- Apoyo -----------------------------------------------------------

async function buscarExistente(documento) {
    const fila = await buscarUsuarioPorDocumento(documento);

    if (!fila) {
        throw new ErrorNegocio(404, 'USUARIO_NO_EXISTE', 'El usuario no existe.');
    }

    return fila;
}

// Valida y guarda los datos editables. Lo usan Mi perfil y Usuarios:
// las reglas son las mismas del registro.
async function guardarDatos(documento, cuerpo) {
    // Solo se toman los campos editables; lo demás que llegue se ignora.
    const datos = normalizarUsuario({
        primerNombre: cuerpo.primerNombre,
        segundoNombre: cuerpo.segundoNombre,
        primerApellido: cuerpo.primerApellido,
        segundoApellido: cuerpo.segundoApellido,
        correo: cuerpo.correo,
        telefono: cuerpo.telefono,
        direccion: cuerpo.direccion,
        idCiudad: cuerpo.idCiudad
    });

    const errores = erroresDatosPerfil(datos);

    if (!errores.idCiudad && !(await existeCiudadActiva(datos.idCiudad))) {
        errores.idCiudad = 'La ciudad no es válida.';
    }

    if (Object.keys(errores).length > 0) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'Revisa los campos marcados.', errores);
    }

    try {
        await actualizarDatosUsuario(documento, datos);
    } catch (err) {
        traducirCorreoDuplicado(err);
        throw err;
    }
}

// "  Pérez  " -> "perez" (la consulta compara sin tildes y en minúsculas).
function limpiarBusqueda(valor) {
    if (typeof valor !== 'string') {
        return null;
    }

    const limpio = valor
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .slice(0, 100);

    return limpio || null;
}

function nombreCompleto(fila) {
    return [fila.PRIMER_NOMBRE, fila.SEGUNDO_NOMBRE, fila.PRIMER_APELLIDO, fila.SEGUNDO_APELLIDO]
        .filter(Boolean)
        .join(' ');
}

function aResumen(fila) {
    return {
        documento: fila.DOCUMENTO,
        tipoDocumento: fila.TIPO_DOCUMENTO,
        nombreCompleto: nombreCompleto(fila),
        correo: fila.CORREO,
        telefono: fila.TELEFONO,
        idPerfil: fila.ID_PERFIL,
        perfil: fila.NOMBRE_PERFIL,
        rol: fila.NOMBRE_ROL,
        activo: fila.ACTIVO === 'S',
        fechaRegistro: fila.FECHA_REGISTRO
    };
}

function aDetalle(fila) {
    return {
        documento: fila.DOCUMENTO,
        tipoDocumento: fila.TIPO_DOCUMENTO,
        primerNombre: fila.PRIMER_NOMBRE,
        segundoNombre: fila.SEGUNDO_NOMBRE || '',
        primerApellido: fila.PRIMER_APELLIDO,
        segundoApellido: fila.SEGUNDO_APELLIDO || '',
        nombre: `${fila.PRIMER_NOMBRE} ${fila.PRIMER_APELLIDO}`,
        nombreCompleto: nombreCompleto(fila),
        correo: fila.CORREO,
        telefono: fila.TELEFONO,
        direccion: fila.DIRECCION,
        idCiudad: fila.ID_CIUDAD,
        ciudad: fila.CIUDAD,
        fechaNacimiento: fila.FECHA_NACIMIENTO,
        fechaRegistro: fila.FECHA_REGISTRO,
        idPerfil: fila.ID_PERFIL,
        perfil: fila.NOMBRE_PERFIL,
        rol: fila.NOMBRE_ROL,
        activo: fila.ACTIVO === 'S'
    };
}

function traducirCorreoDuplicado(err) {
    if (err.errorNum === 1 && err.message.includes('UX_USUARIOS_CORREO_LOWER')) {
        throw new ErrorNegocio(409, 'CORREO_REGISTRADO', 'Ya existe una cuenta con ese correo.',
            { correo: 'Ya existe una cuenta con este correo.' });
    }
}
