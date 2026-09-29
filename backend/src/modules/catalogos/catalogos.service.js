import { ErrorNegocio } from '../../utils/errores.js';
import { CATALOGOS, LARGO_DESCRIPCION } from './catalogos.config.js';
import { LARGO_NOMBRE_RAZA } from './razas.service.js';
import {
    listarActivos,
    listarTodos,
    insertar,
    actualizar,
    actualizarActivo,
    contarOtrosActivos
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
        conDescripcion: Boolean(catalogo.conDescripcion),
        largoDescripcion: LARGO_DESCRIPCION,
        conNivel: Boolean(catalogo.conNivel),
        niveles: catalogo.niveles || null,
        conOtro: Boolean(catalogo.conOtro),
        dependeDeEspecie: false
    }));

    // Razas tiene su propio repositorio porque cuelga de una especie.
    const razas = {
        clave: 'razas',
        etiqueta: 'Razas',
        largoNombre: LARGO_NOMBRE_RAZA,
        permiteCrear: true,
        permiteDesactivar: true,
        conDescripcion: false,
        largoDescripcion: LARGO_DESCRIPCION,
        conNivel: false,
        niveles: null,
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

    if (catalogo.conDescripcion) {
        valor.descripcion = fila.DESCRIPCION;
    }

    if (catalogo.conNivel) {
        valor.nivel = fila.NIVEL;
        valor.etiquetaNivel = catalogo.niveles?.[fila.NIVEL] || null;
    }

    if (catalogo.conOtro) {
        valor.esOtro = fila.ES_OTRO === 'S';
    }

    if (catalogo.conReglasDocumento) {
        valor.soloNumeros = fila.SOLO_NUMEROS === 'S';
        valor.largoMinimo = fila.LARGO_MINIMO;
        valor.largoMaximo = fila.LARGO_MAXIMO;
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
            'Este catálogo es predefinido: sus valores se definen en la base de datos, no desde la aplicación.'
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

    // Si se desactivara el último valor activo, el formulario que usa
    // este catálogo quedaría sin opciones y nadie podría llenarlo.
    if (!activo && (await contarOtrosActivos(catalogo, id)) === 0) {
        throw new ErrorNegocio(
            409,
            'ULTIMO_VALOR_ACTIVO',
            'No se puede desactivar: es el último valor activo del catálogo y los formularios quedarían sin opciones.'
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
