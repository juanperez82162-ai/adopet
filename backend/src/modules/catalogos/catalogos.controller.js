import { exito } from '../../utils/respuesta.js';
import { ErrorNegocio } from '../../utils/errores.js';
import { CATALOGOS } from './catalogos.config.js';
import {
    obtenerDefiniciones,
    obtenerActivos,
    obtenerTodos,
    crear,
    modificar,
    cambiarEstado
} from './catalogos.service.js';

// Se ejecuta antes de cualquier ruta que tenga :catalogo en la URL.
// Si el catálogo no está en la lista blanca, responde 404 sin tocar Oracle.
export function resolverCatalogo(req, res, next, clave) {
    const catalogo = CATALOGOS[clave];

    if (!catalogo) {
        return next(new ErrorNegocio(404, 'CATALOGO_NO_EXISTE', 'El catálogo solicitado no existe.'));
    }

    req.catalogo = catalogo;
    return next();
}

export function listarDefiniciones(req, res) {
    return exito(res, obtenerDefiniciones());
}

export async function listarPublico(req, res) {
    return exito(res, await obtenerActivos(req.catalogo));
}

export async function listarAdmin(req, res) {
    return exito(res, await obtenerTodos(req.catalogo));
}

export async function crearValor(req, res) {
    const datos = validarDatos(req.body, req.catalogo);
    return exito(res, await crear(req.catalogo, datos), 201);
}

export async function modificarValor(req, res) {
    const id = validarId(req.params.id);
    const datos = validarDatos(req.body, req.catalogo);
    return exito(res, await modificar(req.catalogo, id, datos));
}

export async function cambiarEstadoValor(req, res) {
    const id = validarId(req.params.id);
    const activo = req.body?.activo;

    if (typeof activo !== 'boolean') {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'activo: debe ser true o false');
    }

    return exito(res, await cambiarEstado(req.catalogo, id, activo));
}

function validarDatos(cuerpo = {}, catalogo) {
    const errores = [];
    const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';

    if (nombre.length === 0 || nombre.length > catalogo.largoNombre) {
        errores.push(`nombre: obligatorio, máximo ${catalogo.largoNombre} caracteres`);
    }

    const datos = { nombre };

    if (catalogo.conNivel) {
        const nivel = Number(cuerpo.nivel);

        if (!Number.isInteger(nivel) || nivel < 1 || nivel > 3) {
            errores.push('nivel: obligatorio, debe ser 1, 2 o 3');
        }

        datos.nivel = nivel;
    }

    if (errores.length > 0) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', errores.join('; '));
    }

    return datos;
}

function validarId(valor) {
    const id = Number(valor);

    if (!Number.isInteger(id) || id <= 0) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'id: debe ser un número entero positivo');
    }

    return id;
}
