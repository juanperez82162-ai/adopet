import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { ErrorNegocio } from '../../utils/errores.js';
import {
    buscarPermiso,
    buscarMenu,
    buscarIdPerfil,
    verificarCatalogosRegistro,
    insertarUsuario,
    buscarUsuarioPorCorreo,
    buscarUsuarioPorDocumento,
    actualizarContrasena
} from './auth.repository.js';
import { enviarCorreo } from '../../utils/correo.js';

const ACCIONES = ['CONSULTAR', 'CREAR', 'MODIFICAR', 'ELIMINAR'];
const EDAD_MINIMA = 18;
const RONDAS_BCRYPT = 10;
const PROPOSITO_RECUPERAR = 'recuperar-contrasena';
const VIGENCIA_ENLACE = '15m';

// Hash de relleno: se compara contra él cuando el correo no existe,
// para que la respuesta tarde lo mismo exista o no el usuario.
const HASH_FICTICIO = bcrypt.hashSync('adopet-usuario-inexistente', RONDAS_BCRYPT);

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

export async function obtenerMenu(documento) {
    const filas = await buscarMenu(documento);

    return filas.map((fila) => ({
        opcion: fila.NOMBRE_OPCION,
        etiqueta: fila.ETIQUETA,
        ruta: fila.RUTA,
        orden: fila.ORDEN,
        permisos: {
            crear: fila.CREAR === 'S',
            modificar: fila.MODIFICAR === 'S',
            eliminar: fila.ELIMINAR === 'S'
        }
    }));
}

export async function registrar(datos) {
    return crearUsuario(datos, 'Adoptante');
}

export async function crearAdministrador(datos) {
    return crearUsuario(datos, 'Admin');
}

async function crearUsuario(datos, nombrePerfil) {
    validarContrasena(datos.contrasena);
    validarMayoriaEdad(datos.fechaNacimiento);

    const catalogos = await verificarCatalogosRegistro(datos.idTipoDocumento, datos.idCiudad);

    if (!catalogos.tipoDocumentoValido) {
        throw new ErrorNegocio(400, 'TIPO_DOCUMENTO_INVALIDO', 'El tipo de documento no es válido.');
    }

    if (!catalogos.ciudadValida) {
        throw new ErrorNegocio(400, 'CIUDAD_INVALIDA', 'La ciudad no es válida.');
    }

    const idPerfil = await buscarIdPerfil(nombrePerfil);

    if (!idPerfil) {
        throw new Error(`No existe el perfil ${nombrePerfil} activo. Revise los datos base.`);
    }

    const contrasenaHash = await bcrypt.hash(datos.contrasena, RONDAS_BCRYPT);

    try {
        await insertarUsuario({
            documento: datos.documento,
            idPerfil,
            nombre: datos.nombre,
            correo: datos.correo.toLowerCase(),
            contrasenaHash,
            idTipoDocumento: datos.idTipoDocumento,
            telefono: datos.telefono,
            direccion: datos.direccion,
            idCiudad: datos.idCiudad,
            fechaNacimiento: datos.fechaNacimiento
        });
    } catch (err) {
        traducirDuplicado(err);
        throw err;
    }

    return {
        documento: datos.documento,
        nombre: datos.nombre,
        correo: datos.correo.toLowerCase(),
        perfil: nombrePerfil
    };
}

export async function iniciarSesion(correo, contrasena) {
    const usuario = await buscarUsuarioPorCorreo(correo);

    const hashAComparar = usuario ? usuario.CONTRASENA_HASH : HASH_FICTICIO;
    const contrasenaCorrecta = await bcrypt.compare(contrasena, hashAComparar);

    if (!usuario || !contrasenaCorrecta) {
        throw new ErrorNegocio(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.');
    }

    if (usuario.ACTIVO !== 'S') {
        throw new ErrorNegocio(403, 'USUARIO_INACTIVO', 'La cuenta está desactivada. Comuníquese con la fundación.');
    }

    const datosToken = {
        documento: usuario.DOCUMENTO,
        nombre: usuario.NOMBRE,
        idPerfil: usuario.ID_PERFIL,
        rol: usuario.NOMBRE_ROL
    };

    const token = jwt.sign(datosToken, config.jwt.secreto, { expiresIn: config.jwt.expira });

    return {
        token,
        usuario: {
            documento: usuario.DOCUMENTO,
            nombre: usuario.NOMBRE,
            correo: usuario.CORREO,
            perfil: usuario.NOMBRE_PERFIL,
            rol: usuario.NOMBRE_ROL
        }
    };
}

// ---- Recuperación de contraseña -------------------------------------
// El enlace lleva un token firmado con la clave del backend MÁS el hash
// actual de la contraseña. Al cambiarla, el hash cambia y el enlace deja
// de servir: por eso es de un solo uso sin guardar nada en la base.

function claveEnlace(contrasenaHash) {
    return config.jwt.secreto + contrasenaHash;
}

export async function solicitarRecuperacion(correo) {
    const usuario = await buscarUsuarioPorCorreo(correo);

    // Si no existe o está desactivado, no se hace nada, pero la respuesta
    // al usuario es la misma: así nadie averigua qué correos tienen cuenta.
    if (!usuario || usuario.ACTIVO !== 'S') {
        return;
    }

    const token = jwt.sign(
        { documento: usuario.DOCUMENTO, proposito: PROPOSITO_RECUPERAR },
        claveEnlace(usuario.CONTRASENA_HASH),
        { expiresIn: VIGENCIA_ENLACE }
    );

    const enlace = `${config.frontendUrl}/restablecer?token=${encodeURIComponent(token)}`;
    const primerNombre = usuario.NOMBRE.split(' ')[0];

    await enviarCorreo({
        para: usuario.CORREO,
        asunto: 'ADOPET · Crea una nueva contraseña',
        texto:
            `Hola, ${primerNombre}.\n\n` +
            'Recibimos una solicitud para cambiar la contraseña de tu cuenta en ADOPET.\n' +
            `Abre este enlace para crear una nueva (vence en 15 minutos):\n\n${enlace}\n\n` +
            'Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.\n\n' +
            'Fundación Bello Animal',
        html: plantillaCorreoRecuperacion(primerNombre, enlace)
    });
}

export async function restablecerContrasena(token, contrasenaNueva) {
    const invalido = new ErrorNegocio(
        400,
        'ENLACE_INVALIDO',
        'El enlace no es válido o ya venció. Solicita uno nuevo.'
    );

    // decode solo LEE el token (sin verificar) para saber de quién es;
    // la verificación real viene después, con la clave de ese usuario.
    const contenido = jwt.decode(token);

    if (!contenido?.documento || contenido.proposito !== PROPOSITO_RECUPERAR) {
        throw invalido;
    }

    const usuario = await buscarUsuarioPorDocumento(contenido.documento);

    if (!usuario || usuario.ACTIVO !== 'S') {
        throw invalido;
    }

    try {
        jwt.verify(token, claveEnlace(usuario.CONTRASENA_HASH));
    } catch {
        throw invalido;
    }

    validarContrasena(contrasenaNueva);

    const nuevoHash = await bcrypt.hash(contrasenaNueva, RONDAS_BCRYPT);
    await actualizarContrasena(usuario.DOCUMENTO, nuevoHash);
}

function plantillaCorreoRecuperacion(nombre, enlace) {
    return `
<div style="font-family: Arial, sans-serif; background: #fff8f0; padding: 32px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 32px; border: 1px solid #eedfd1;">
    <p style="margin: 0 0 16px; font-size: 22px; font-weight: bold; color: #e8743b;">ADOPET</p>
    <p style="color: #3d2c22; font-size: 16px;">Hola, ${nombre}.</p>
    <p style="color: #3d2c22; font-size: 15px; line-height: 1.5;">
      Recibimos una solicitud para cambiar la contraseña de tu cuenta.
      Haz clic en el botón para crear una nueva. El enlace vence en 15 minutos.
    </p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${enlace}" style="background: #e8743b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-weight: bold;">
        Crear nueva contraseña
      </a>
    </p>
    <p style="color: #806a5c; font-size: 13px; line-height: 1.5;">
      Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.
    </p>
    <p style="color: #806a5c; font-size: 13px;">Fundación Bello Animal</p>
  </div>
</div>`;
}

function validarContrasena(contrasena) {
    const cumple = contrasena.length >= 8
        && /[A-Za-z]/.test(contrasena)
        && /[0-9]/.test(contrasena);

    if (!cumple) {
        throw new ErrorNegocio(
            400,
            'CONTRASENA_DEBIL',
            'La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número.'
        );
    }
}

function validarMayoriaEdad(fechaNacimiento) {
    const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
    const hoy = new Date();

    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const aunNoCumple =
        hoy.getMonth() < nacimiento.getMonth() ||
        (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());

    if (aunNoCumple) {
        edad--;
    }

    if (edad < EDAD_MINIMA) {
        throw new ErrorNegocio(400, 'MENOR_DE_EDAD', 'Debe ser mayor de 18 años para registrarse.');
    }
}

function traducirDuplicado(err) {
    if (err.errorNum !== 1) {
        return;
    }

    if (err.message.includes('PK_USUARIOS')) {
        throw new ErrorNegocio(409, 'DOCUMENTO_REGISTRADO', 'Ya existe una cuenta con ese documento.');
    }

    if (err.message.includes('UX_USUARIOS_CORREO_LOWER')) {
        throw new ErrorNegocio(409, 'CORREO_REGISTRADO', 'Ya existe una cuenta con ese correo.');
    }
}
