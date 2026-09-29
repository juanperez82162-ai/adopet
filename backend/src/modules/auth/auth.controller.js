import { registrar, iniciarSesion, obtenerMenu } from './auth.service.js';
import { exito } from '../../utils/respuesta.js';
import { ErrorNegocio } from '../../utils/errores.js';

export async function registro(req, res) {
    const datos = validarDatosRegistro(req.body);
    const usuario = await registrar(datos);
    return exito(res, usuario, 201);
}

export async function login(req, res) {
    const { correo, contrasena } = validarDatosLogin(req.body);
    const sesion = await iniciarSesion(correo, contrasena);
    return exito(res, sesion);
}

export async function menu(req, res) {
    const opciones = await obtenerMenu(req.usuario.documento);
    return exito(res, opciones);
}

function validarDatosRegistro(cuerpo = {}) {
    const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

    const datos = {
        documento: texto(cuerpo.documento),
        idTipoDocumento: Number(cuerpo.idTipoDocumento),
        nombre: texto(cuerpo.nombre),
        correo: texto(cuerpo.correo),
        contrasena: typeof cuerpo.contrasena === 'string' ? cuerpo.contrasena : '',
        telefono: texto(cuerpo.telefono),
        direccion: texto(cuerpo.direccion),
        idCiudad: Number(cuerpo.idCiudad),
        fechaNacimiento: texto(cuerpo.fechaNacimiento)
    };

    const reglas = [
        [/^[A-Za-z0-9]{5,20}$/.test(datos.documento), 'documento: solo letras y números, entre 5 y 20 caracteres'],
        [Number.isInteger(datos.idTipoDocumento) && datos.idTipoDocumento > 0, 'idTipoDocumento: es obligatorio'],
        [datos.nombre.length > 0 && datos.nombre.length <= 100, 'nombre: obligatorio, máximo 100 caracteres'],
        [/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo) && datos.correo.length <= 150, 'correo: no tiene un formato válido'],
        [datos.contrasena.length > 0 && datos.contrasena.length <= 72, 'contrasena: obligatoria, máximo 72 caracteres'],
        [/^[0-9+ ]{7,20}$/.test(datos.telefono), 'telefono: solo números, entre 7 y 20 caracteres'],
        [datos.direccion.length > 0 && datos.direccion.length <= 200, 'direccion: obligatoria, máximo 200 caracteres'],
        [Number.isInteger(datos.idCiudad) && datos.idCiudad > 0, 'idCiudad: es obligatoria'],
        [esFechaValida(datos.fechaNacimiento), 'fechaNacimiento: debe tener el formato AAAA-MM-DD']
    ];

    lanzarSiHayErrores(reglas);

    return datos;
}

function validarDatosLogin(cuerpo = {}) {
    const correo = typeof cuerpo.correo === 'string' ? cuerpo.correo.trim() : '';
    const contrasena = typeof cuerpo.contrasena === 'string' ? cuerpo.contrasena : '';

    const reglas = [
        [correo.length > 0, 'correo: es obligatorio'],
        [contrasena.length > 0, 'contrasena: es obligatoria']
    ];

    lanzarSiHayErrores(reglas);

    return { correo, contrasena };
}

function lanzarSiHayErrores(reglas) {
    const errores = reglas.filter(([cumple]) => !cumple).map(([, mensaje]) => mensaje);

    if (errores.length > 0) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', errores.join('; '));
    }
}

function esFechaValida(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const convertida = new Date(`${fecha}T00:00:00`);
    return !Number.isNaN(convertida.getTime()) && convertida.toISOString().startsWith(fecha);
}
