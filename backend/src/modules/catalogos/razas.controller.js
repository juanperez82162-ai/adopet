import { exito } from '../../utils/respuesta.js';
import { ErrorNegocio } from '../../utils/errores.js';
import {
    LARGO_NOMBRE_RAZA,
    obtenerRazasActivas,
    obtenerRazasAdmin,
    crearRaza,
    renombrarRaza,
    cambiarEstadoRaza
} from './razas.service.js';

export async function listarRazasPublico(req, res) {
    const idEspecie = validarEntero(req.query.especie, 'especie');
    return exito(res, await obtenerRazasActivas(idEspecie));
}

export async function listarRazasAdmin(req, res) {
    const idEspecie = validarEntero(req.query.especie, 'especie');
    return exito(res, await obtenerRazasAdmin(idEspecie));
}

export async function crearRazaValor(req, res) {
    const idEspecie = validarEntero(req.body?.idEspecie, 'idEspecie');
    const nombre = validarNombre(req.body);
    return exito(res, await crearRaza(idEspecie, nombre), 201);
}

export async function renombrarRazaValor(req, res) {
    const id = validarEntero(req.params.id, 'id');
    const nombre = validarNombre(req.body);
    return exito(res, await renombrarRaza(id, nombre));
}

export async function cambiarEstadoRazaValor(req, res) {
    const id = validarEntero(req.params.id, 'id');
    const activo = req.body?.activo;

    if (typeof activo !== 'boolean') {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'activo: debe ser true o false');
    }

    return exito(res, await cambiarEstadoRaza(id, activo));
}

function validarNombre(cuerpo = {}) {
    const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';

    if (nombre.length === 0 || nombre.length > LARGO_NOMBRE_RAZA) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', `nombre: obligatorio, máximo ${LARGO_NOMBRE_RAZA} caracteres`);
    }

    return nombre;
}

function validarEntero(valor, campo) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', `${campo}: debe ser un número entero positivo`);
    }

    return numero;
}
