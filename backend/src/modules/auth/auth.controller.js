import {
    registrar,
    iniciarSesion,
    obtenerMenu,
    solicitarRecuperacion,
    restablecerContrasena
} from './auth.service.js';
import { exito } from '../../utils/respuesta.js';
import { ErrorNegocio } from '../../utils/errores.js';

// El registro no valida aquí: el servicio limpia y valida todos los
// campos, para que el script crear-admin pase por las mismas reglas.
export async function registro(req, res) {
    const usuario = await registrar(req.body ?? {});
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

export async function recuperar(req, res) {
    const correo = typeof req.body?.correo === 'string' ? req.body.correo.trim() : '';

    if (correo.length === 0) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'correo: es obligatorio');
    }

    await solicitarRecuperacion(correo);

    // Siempre la misma respuesta, exista o no el correo.
    return exito(res, {
        mensaje: 'Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña.'
    });
}

export async function restablecer(req, res) {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const contrasena = typeof req.body?.contrasena === 'string' ? req.body.contrasena : '';

    const reglas = [
        [token.length > 0, 'token: es obligatorio'],
        [contrasena.length > 0 && contrasena.length <= 72, 'contrasena: obligatoria, máximo 72 caracteres']
    ];

    lanzarSiHayErrores(reglas);

    await restablecerContrasena(token, contrasena);

    return exito(res, { mensaje: 'Tu contraseña se cambió. Ya puedes iniciar sesión.' });
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
