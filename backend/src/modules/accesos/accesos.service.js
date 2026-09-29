import { ErrorNegocio } from '../../utils/errores.js';
import {
    PERFIL_ADMIN,
    PERFIL_VETADO,
    PERFILES_BASE,
    OPCIONES_PROTEGIDAS_ADMIN
} from '../../utils/perfiles.js';
import {
    listarPerfiles,
    listarRoles,
    listarOpcionesActivas,
    listarPermisos,
    reemplazarPermisosPerfil,
    insertarPerfil,
    actualizarNombrePerfil,
    actualizarEstadoPerfil
} from './accesos.repository.js';

const LARGO_MAXIMO_NOMBRE_PERFIL = 25;
const PATRON_NOMBRE_PERFIL = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

// ---- Matriz de permisos ----------------------------------------------

// Todo lo que la pantalla necesita: roles, perfiles, módulos y la matriz
// actual, más qué está bloqueado y por qué.
export async function obtenerMatriz() {
    const [perfiles, roles, opciones, permisos] = await Promise.all([
        listarPerfiles(),
        listarRoles(),
        listarOpcionesActivas(),
        listarPermisos()
    ]);

    const idsOpcionesActivas = new Set(opciones.map((opcion) => opcion.ID_OPCION_MENU));

    return {
        roles: roles.map((rol) => ({ id: rol.ID_ROL, nombre: rol.NOMBRE_ROL })),
        perfiles: perfiles.map((perfil) => ({
            id: perfil.ID_PERFIL,
            nombre: perfil.NOMBRE_PERFIL,
            idRol: perfil.ID_ROL,
            rol: perfil.NOMBRE_ROL,
            activo: perfil.ACTIVO === 'S',
            totalUsuarios: perfil.TOTAL_USUARIOS,
            base: PERFILES_BASE.includes(perfil.NOMBRE_PERFIL),
            bloqueado: perfil.NOMBRE_PERFIL === PERFIL_VETADO,
            opcionesProtegidas: perfil.NOMBRE_PERFIL === PERFIL_ADMIN ? OPCIONES_PROTEGIDAS_ADMIN : []
        })),
        opciones: opciones.map((opcion) => ({
            id: opcion.ID_OPCION_MENU,
            nombre: opcion.NOMBRE_OPCION,
            etiqueta: opcion.ETIQUETA
        })),
        permisos: permisos
            .filter((permiso) => idsOpcionesActivas.has(permiso.ID_OPCION_MENU))
            .map((permiso) => ({
                idPerfil: permiso.ID_PERFIL,
                idOpcion: permiso.ID_OPCION_MENU,
                crear: permiso.CREAR === 'S',
                modificar: permiso.MODIFICAR === 'S',
                eliminar: permiso.ELIMINAR === 'S'
            }))
    };
}

// cuerpo.permisos: [{ idOpcion, crear, modificar, eliminar }] con SOLO las
// opciones que el perfil puede ver. Las que no vienen, se le quitan.
export async function guardarPermisos(idPerfilTexto, cuerpo) {
    const perfil = await buscarPerfil(idPerfilTexto);
    const opciones = await listarOpcionesActivas();

    if (!perfil.activo) {
        throw new ErrorNegocio(409, 'PERFIL_INACTIVO', 'Activa el perfil antes de cambiar sus accesos.');
    }

    if (perfil.nombre === PERFIL_VETADO) {
        throw new ErrorNegocio(409, 'PERFIL_BLOQUEADO', 'El perfil Vetado no puede tener accesos: esa es su razón de ser.');
    }

    if (!Array.isArray(cuerpo.permisos)) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'permisos: debe ser una lista.');
    }

    const opcionesPorId = new Map(opciones.map((opcion) => [opcion.ID_OPCION_MENU, opcion]));
    const vistas = new Set();

    const permisos = cuerpo.permisos.map((permiso) => {
        const idOpcion = Number(permiso?.idOpcion);
        const acciones = [permiso?.crear, permiso?.modificar, permiso?.eliminar];

        if (!opcionesPorId.has(idOpcion) || vistas.has(idOpcion) || acciones.some((valor) => typeof valor !== 'boolean')) {
            throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'La lista de permisos no es válida.');
        }

        vistas.add(idOpcion);

        return {
            idOpcion,
            crear: permiso.crear ? 'S' : 'N',
            modificar: permiso.modificar ? 'S' : 'N',
            eliminar: permiso.eliminar ? 'S' : 'N'
        };
    });

    // Regla: el perfil Admin conserva Usuarios y Accesos con todas sus acciones.
    if (perfil.nombre === PERFIL_ADMIN) {
        for (const nombreOpcion of OPCIONES_PROTEGIDAS_ADMIN) {
            const opcion = opciones.find((fila) => fila.NOMBRE_OPCION === nombreOpcion);
            const permiso = opcion && permisos.find((fila) => fila.idOpcion === opcion.ID_OPCION_MENU);
            const completo = permiso && permiso.crear === 'S' && permiso.modificar === 'S' && permiso.eliminar === 'S';

            if (opcion && !completo) {
                throw new ErrorNegocio(409, 'ACCESO_PROTEGIDO',
                    `El perfil Admin no puede perder el acceso completo a ${opcion.ETIQUETA}.`);
            }
        }
    }

    await reemplazarPermisosPerfil(perfil.id, permisos);

    return obtenerMatriz();
}

// ---- Perfiles ------------------------------------------------------------
// Los roles (STAFF y ADOPTANTE) son fijos: el sistema está programado
// sobre ellos. Los perfiles sí se crean: cada uno pertenece a un rol y
// nace SIN permisos; se le dan en la matriz.

export async function crearPerfil(cuerpo) {
    const nombre = limpiarNombrePerfil(cuerpo.nombre);
    const idRol = Number(cuerpo.idRol);
    const errores = {};

    const errorNombre = validarNombrePerfil(nombre);

    if (errorNombre) {
        errores.nombre = errorNombre;
    }

    const roles = await listarRoles();

    if (!roles.some((rol) => rol.ID_ROL === idRol)) {
        errores.idRol = 'Selecciona un rol.';
    }

    if (Object.keys(errores).length > 0) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'Revisa los campos marcados.', errores);
    }

    let idPerfil;

    try {
        idPerfil = await insertarPerfil(nombre, idRol);
    } catch (err) {
        traducirNombreDuplicado(err);
        throw err;
    }

    return { idPerfil, matriz: await obtenerMatriz() };
}

export async function renombrarPerfil(idPerfilTexto, cuerpo) {
    const perfil = await buscarPerfil(idPerfilTexto);

    if (perfil.base) {
        throw new ErrorNegocio(409, 'PERFIL_BASE', `El perfil ${perfil.nombre} es de base del sistema y no se renombra.`);
    }

    const nombre = limpiarNombrePerfil(cuerpo.nombre);
    const errorNombre = validarNombrePerfil(nombre);

    if (errorNombre) {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'Revisa los campos marcados.', { nombre: errorNombre });
    }

    try {
        await actualizarNombrePerfil(perfil.id, nombre);
    } catch (err) {
        traducirNombreDuplicado(err);
        throw err;
    }

    return obtenerMatriz();
}

export async function cambiarEstadoPerfil(idPerfilTexto, cuerpo) {
    const perfil = await buscarPerfil(idPerfilTexto);

    if (typeof cuerpo.activo !== 'boolean') {
        throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'activo: debe ser true o false.');
    }

    if (perfil.base) {
        throw new ErrorNegocio(409, 'PERFIL_BASE', `El perfil ${perfil.nombre} es de base del sistema y no se desactiva.`);
    }

    // Regla: no se desactiva un perfil que alguien tiene asignado, para no
    // dejar usuarios con un perfil apagado. Primero se les cambia el perfil.
    if (!cuerpo.activo && perfil.totalUsuarios > 0) {
        const cuantos = perfil.totalUsuarios === 1 ? '1 usuario lo tiene' : `${perfil.totalUsuarios} usuarios lo tienen`;
        throw new ErrorNegocio(409, 'PERFIL_EN_USO',
            `No se puede desactivar: ${cuantos} asignado. Cámbiales el perfil primero en Usuarios.`);
    }

    await actualizarEstadoPerfil(perfil.id, cuerpo.activo ? 'S' : 'N');

    return obtenerMatriz();
}

// ---- Apoyo -----------------------------------------------------------

async function buscarPerfil(idPerfilTexto) {
    const idPerfil = Number(idPerfilTexto);
    const fila = (await listarPerfiles()).find((perfil) => perfil.ID_PERFIL === idPerfil);

    if (!fila) {
        throw new ErrorNegocio(404, 'PERFIL_NO_EXISTE', 'El perfil no existe.');
    }

    return {
        id: fila.ID_PERFIL,
        nombre: fila.NOMBRE_PERFIL,
        activo: fila.ACTIVO === 'S',
        totalUsuarios: fila.TOTAL_USUARIOS,
        base: PERFILES_BASE.includes(fila.NOMBRE_PERFIL)
    };
}

// "  voluntario   de  campo " -> "Voluntario de campo"
function limpiarNombrePerfil(valor) {
    const texto = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
    return texto ? texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1) : '';
}

function validarNombrePerfil(nombre) {
    if (nombre.length < 3) {
        return 'Escribe un nombre de al menos 3 letras.';
    }

    if (nombre.length > LARGO_MAXIMO_NOMBRE_PERFIL) {
        return `Máximo ${LARGO_MAXIMO_NOMBRE_PERFIL} caracteres.`;
    }

    if (!PATRON_NOMBRE_PERFIL.test(nombre)) {
        return 'Solo letras y espacios.';
    }

    return null;
}

function traducirNombreDuplicado(err) {
    if (err.errorNum === 1 && err.message.includes('UX_PERFILES_NOMBRE_LOWER')) {
        throw new ErrorNegocio(409, 'NOMBRE_DUPLICADO', 'Ya existe un perfil con ese nombre.',
            { nombre: 'Ya existe un perfil con ese nombre.' });
    }
}
