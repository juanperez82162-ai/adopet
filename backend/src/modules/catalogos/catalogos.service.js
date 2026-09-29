import { ErrorNegocio } from '../../utils/errores.js';
import { CATALOGOS } from './catalogos.config.js';
import { LARGO_NOMBRE_RAZA } from './razas.service.js';
import {
    listarActivos,
    listarTodos,
    insertar,
    actualizar,
    actualizarActivo
} from './catalogos.repository.js';

// Qué catálogos existen y qué reglas tiene cada uno, para que la pantalla
// sepa qué mostrar. Nunca expone nombres de tablas ni columnas.
export function obtenerDefiniciones() {
    const simples = Object.entries(CATALOGOS).map(([clave, catalogo]) => ({
        clave,
        etiqueta: catalogo.etiqueta,
        largoNombre: catalogo.largoNombre,
        permiteCrear: catalogo.permiteCrear,
        permiteDesactivar: catalogo.permiteDesactivar,
        conNivel: catalogo.conNivel,
        descripcionNivel: catalogo.descripcionNivel || null,
        conOtro: catalogo.conOtro,
        dependeDeEspecie: false
    }));

    // Razas tiene su propio repositorio porque cuelga de una especie.
    const razas = {
        clave: 'razas',
        etiqueta: 'Razas',
        largoNombre: LARGO_NOMBRE_RAZA,
        permiteCrear: true,
        permiteDesactivar: true,
        conNivel: false,
        descripcionNivel: null,
        conOtro: false,
        dependeDeEspecie: true
    };

    return [...simples, razas];
}

function aValor(catalogo, fila, incluirActivo) {
    const valor = { id: fila.ID, nombre: fila.NOMBRE };

    if (incluirActivo) {
        valor.activo = fila.ACTIVO === 'S';
    }

    if (catalogo.conNivel) {
        valor.nivel = fila.NIVEL;
    }

    if (catalogo.conOtro) {
        valor.esOtro = fila.ES_OTRO === 'S';
    }

    return valor;
}

export async function obtenerActivos(catalogo) {
    const filas = await listarActivos(catalogo);
    return filas.map((fila) => aValor(catalogo, fila, false));
}

export async function obtenerTodos(catalogo) {
    const filas = await listarTodos(catalogo);
    return filas.map((fila) => aValor(catalogo, fila, true));
}

export async function crear(catalogo, datos) {
    if (!catalogo.permiteCrear) {
        throw new ErrorNegocio(
            409,
            'CATALOGO_SOLO_MIGRACION',
            'Este catálogo tiene valores fijos: el flujo del sistema depende de cada uno.'
        );
    }

    try {
        const id = await insertar(catalogo, datos);
        return { id, ...datos, activo: true };
    } catch (err) {
        traducirDuplicado(err);
        throw err;
    }
}

export async function modificar(catalogo, id, datos) {
    let filasAfectadas;

    try {
        filasAfectadas = await actualizar(catalogo, id, datos);
    } catch (err) {
        traducirDuplicado(err);
        throw err;
    }

    if (filasAfectadas === 0) {
        throw new ErrorNegocio(404, 'VALOR_NO_EXISTE', 'El valor del catálogo no existe.');
    }

    return { id, ...datos };
}

export async function cambiarEstado(catalogo, id, activo) {
    if (!activo && !catalogo.permiteDesactivar) {
        throw new ErrorNegocio(
            409,
            'CATALOGO_NO_DESACTIVABLE',
            'Los valores de este catálogo no se pueden desactivar: el flujo del sistema depende de ellos.'
        );
    }

    const filasAfectadas = await actualizarActivo(catalogo, id, activo ? 'S' : 'N');

    if (filasAfectadas === 0) {
        throw new ErrorNegocio(404, 'VALOR_NO_EXISTE', 'El valor del catálogo no existe.');
    }

    return { id, activo };
}

function traducirDuplicado(err) {
    if (err.errorNum === 1) {
        throw new ErrorNegocio(409, 'NOMBRE_DUPLICADO', 'Ya existe un valor con ese nombre en el catálogo.');
    }
}
