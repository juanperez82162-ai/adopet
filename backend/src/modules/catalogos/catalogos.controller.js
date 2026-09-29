import { exito } from '../../utils/respuesta.js';
import { ErrorNegocio } from '../../utils/errores.js';
import { CATALOGOS } from './catalogos.config.js';
import {
    obtenerActivos,
    obtenerTodos,
    crear,
    renombrar,
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

export async function listarPublico(req, res) {
    const valores = await obtenerActivos(req.catalogo);
    return exito(res, valores);
}

export async function listarAdmin(req, res) {
    const valores = await obtenerTodos(req.catalogo);
    return exito(res, valores);
}

export async function crearValor(req, res) {
    const nombre = validarNombre(req.body, req.catalogo);
    const valor = await crear(req.catalogo, nombre);
    return exito(res, valor, 201);
}

export async function renombrarValor(req, res) {
    const id = validarId(req.params.id);
    const nombre = validarNombre(req.body, req.catalogo);
    const valor = await renombrar(req.catalogo, id, nombre);
    return exito(res, valor);
}

export async function cambiarEstadoValor(req, res) {
    const id = validarId(req.params.id);
    const activo = req.body?.activo;

    if (typeof activo !== 'boolean') {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'activo: debe ser true o false');
    }

    const valor = await cambiarEstado(req.catalogo, id, activo);
    return exito(res, valor);
}

function validarNombre(cuerpo = {}, catalogo) {
    const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';

    if (nombre.length === 0 || nombre.length > catalogo.largoNombre) {
        throw new ErrorNegocio(
            400,
            'DATOS_INVALIDOS',
            `nombre: obligatorio, máximo ${catalogo.largoNombre} caracteres`
        );
    }

    return nombre;
}

function validarId(valor) {
    const id = Number(valor);

    if (!Number.isInteger(id) || id <= 0) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'id: debe ser un número entero positivo');
    }

    return id;
}
