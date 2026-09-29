import { obtenerConexion } from '../../config/database.js';

export async function buscarPermiso(documento, nombreOpcion) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT po.CREAR, po.MODIFICAR, po.ELIMINAR
               FROM USUARIOS u
               JOIN PERFILES p           ON p.ID_PERFIL      = u.ID_PERFIL
               JOIN PERFILES_OPCIONES po ON po.ID_PERFIL     = p.ID_PERFIL
               JOIN OPCIONES_MENU o      ON o.ID_OPCION_MENU = po.ID_OPCION_MENU
              WHERE u.DOCUMENTO     = :documento
                AND o.NOMBRE_OPCION = :nombreOpcion
                AND u.ACTIVO = 'S'
                AND p.ACTIVO = 'S'
                AND o.ACTIVO = 'S'`,
            { documento, nombreOpcion }
        );

        return resultado.rows[0] || null;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function buscarMenu(documento) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT o.NOMBRE_OPCION, o.ETIQUETA, o.RUTA, o.ORDEN,
                    po.CREAR, po.MODIFICAR, po.ELIMINAR
               FROM USUARIOS u
               JOIN PERFILES p           ON p.ID_PERFIL      = u.ID_PERFIL
               JOIN PERFILES_OPCIONES po ON po.ID_PERFIL     = p.ID_PERFIL
               JOIN OPCIONES_MENU o      ON o.ID_OPCION_MENU = po.ID_OPCION_MENU
              WHERE u.DOCUMENTO = :documento
                AND u.ACTIVO = 'S'
                AND p.ACTIVO = 'S'
                AND o.ACTIVO = 'S'
              ORDER BY o.ORDEN`,
            { documento }
        );

        return resultado.rows;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function buscarIdPerfil(nombrePerfil) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT ID_PERFIL
               FROM PERFILES
              WHERE NOMBRE_PERFIL = :nombrePerfil
                AND ACTIVO = 'S'`,
            { nombrePerfil }
        );

        return resultado.rows[0]?.ID_PERFIL ?? null;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function verificarCatalogosRegistro(idTipoDocumento, idCiudad) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT (SELECT COUNT(*) FROM TIPOS_DOCUMENTO
                      WHERE ID_TIPO_DOCUMENTO = :idTipoDocumento AND ACTIVO = 'S') AS TIPO_DOCUMENTO_OK,
                    (SELECT COUNT(*) FROM CIUDADES
                      WHERE ID_CIUDAD = :idCiudad AND ACTIVO = 'S') AS CIUDAD_OK
               FROM DUAL`,
            { idTipoDocumento, idCiudad }
        );

        const fila = resultado.rows[0];

        return {
            tipoDocumentoValido: fila.TIPO_DOCUMENTO_OK === 1,
            ciudadValida: fila.CIUDAD_OK === 1
        };
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function insertarUsuario(usuario) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        await conexion.execute(
            `INSERT INTO USUARIOS (
                 DOCUMENTO, ID_PERFIL, NOMBRE, CORREO, CONTRASENA_HASH,
                 ID_TIPO_DOCUMENTO, TELEFONO, DIRECCION, ID_CIUDAD, FECHA_NACIMIENTO
             ) VALUES (
                 :documento, :idPerfil, :nombre, :correo, :contrasenaHash,
                 :idTipoDocumento, :telefono, :direccion, :idCiudad,
                 TO_DATE(:fechaNacimiento, 'YYYY-MM-DD')
             )`,
            usuario,
            { autoCommit: true }
        );
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function buscarUsuarioPorCorreo(correo) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT u.DOCUMENTO, u.NOMBRE, u.CORREO, u.CONTRASENA_HASH, u.ACTIVO,
                    u.ID_PERFIL, p.NOMBRE_PERFIL, r.NOMBRE_ROL
               FROM USUARIOS u
               JOIN PERFILES p ON p.ID_PERFIL = u.ID_PERFIL
               JOIN ROLES r    ON r.ID_ROL    = p.ID_ROL
              WHERE LOWER(u.CORREO) = LOWER(:correo)`,
            { correo }
        );

        return resultado.rows[0] || null;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}
export async function buscarUsuarioPorDocumento(documento) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT DOCUMENTO, NOMBRE, CORREO, CONTRASENA_HASH, ACTIVO
               FROM USUARIOS
              WHERE DOCUMENTO = :documento`,
            { documento }
        );

        return resultado.rows[0] || null;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function actualizarContrasena(documento, contrasenaHash) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `UPDATE USUARIOS
                SET CONTRASENA_HASH = :contrasenaHash
              WHERE DOCUMENTO = :documento`,
            { contrasenaHash, documento },
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}
