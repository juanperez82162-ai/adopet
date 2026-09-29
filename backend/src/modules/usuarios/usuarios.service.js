import { ErrorNegocio } from '../../utils/errores.js';
import { normalizarUsuario, erroresDatosPerfil } from '../auth/auth.validaciones.js';
import { cambiarContrasena } from '../auth/auth.service.js';
import {
    buscarPerfilPorDocumento,
    existeCiudadActiva,
    actualizarDatosPerfil
} from './usuarios.repository.js';

// ---- Mi perfil -------------------------------------------------------
// Cada quien ve y edita SOLO su propio registro: el documento sale del
// token, nunca del cuerpo de la petición.

export async function obtenerMiPerfil(documento) {
    const fila = await buscarPerfilPorDocumento(documento);

    if (!fila) {
        throw new ErrorNegocio(404, 'USUARIO_NO_EXISTE', 'El usuario no existe o está desactivado.');
    }

    return aPerfil(fila);
}

export async function actualizarMiPerfil(documento, cuerpo) {
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
        const filas = await actualizarDatosPerfil(documento, datos);

        if (filas === 0) {
            throw new ErrorNegocio(404, 'USUARIO_NO_EXISTE', 'El usuario no existe o está desactivado.');
        }
    } catch (err) {
        traducirCorreoDuplicado(err);
        throw err;
    }

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

// ---- Apoyo -----------------------------------------------------------

function aPerfil(fila) {
    return {
        documento: fila.DOCUMENTO,
        tipoDocumento: fila.TIPO_DOCUMENTO,
        primerNombre: fila.PRIMER_NOMBRE,
        segundoNombre: fila.SEGUNDO_NOMBRE || '',
        primerApellido: fila.PRIMER_APELLIDO,
        segundoApellido: fila.SEGUNDO_APELLIDO || '',
        nombre: `${fila.PRIMER_NOMBRE} ${fila.PRIMER_APELLIDO}`,
        correo: fila.CORREO,
        telefono: fila.TELEFONO,
        direccion: fila.DIRECCION,
        idCiudad: fila.ID_CIUDAD,
        ciudad: fila.CIUDAD,
        fechaNacimiento: fila.FECHA_NACIMIENTO,
        fechaRegistro: fila.FECHA_REGISTRO,
        perfil: fila.NOMBRE_PERFIL
    };
}

function traducirCorreoDuplicado(err) {
    if (err.errorNum === 1 && err.message.includes('UX_USUARIOS_CORREO_LOWER')) {
        throw new ErrorNegocio(409, 'CORREO_REGISTRADO', 'Ya existe una cuenta con ese correo.',
            { correo: 'Ya existe una cuenta con este correo.' });
    }
}
