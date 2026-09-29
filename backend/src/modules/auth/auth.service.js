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
    buscarUsuarioPorCorreo
} from './auth.repository.js';

const ACCIONES = ['CONSULTAR', 'CREAR', 'MODIFICAR', 'ELIMINAR'];
const EDAD_MINIMA = 18;
const RONDAS_BCRYPT = 10;

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
