import { obtenerConexion } from '../../config/database.js';

export async function buscarPerfilPorDocumento(documento) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT u.DOCUMENTO, td.NOMBRE AS TIPO_DOCUMENTO,
                    u.PRIMER_NOMBRE, u.SEGUNDO_NOMBRE, u.PRIMER_APELLIDO, u.SEGUNDO_APELLIDO,
                    u.CORREO, u.TELEFONO, u.DIRECCION, u.ID_CIUDAD, c.NOMBRE AS CIUDAD,
                    TO_CHAR(u.FECHA_NACIMIENTO, 'YYYY-MM-DD') AS FECHA_NACIMIENTO,
                    TO_CHAR(u.FECHA_REGISTRO, 'YYYY-MM-DD') AS FECHA_REGISTRO,
                    p.NOMBRE_PERFIL
               FROM USUARIOS u
               JOIN TIPOS_DOCUMENTO td ON td.ID_TIPO_DOCUMENTO = u.ID_TIPO_DOCUMENTO
               JOIN CIUDADES c         ON c.ID_CIUDAD         = u.ID_CIUDAD
               JOIN PERFILES p         ON p.ID_PERFIL         = u.ID_PERFIL
              WHERE u.DOCUMENTO = :documento
                AND u.ACTIVO = 'S'`,
            { documento }
        );

        return resultado.rows[0] || null;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function existeCiudadActiva(idCiudad) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT COUNT(*) AS TOTAL
               FROM CIUDADES
              WHERE ID_CIUDAD = :idCiudad
                AND ACTIVO = 'S'`,
            { idCiudad }
        );

        return resultado.rows[0].TOTAL === 1;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function actualizarDatosPerfil(documento, datos) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `UPDATE USUARIOS
                SET PRIMER_NOMBRE    = :primerNombre,
                    SEGUNDO_NOMBRE   = :segundoNombre,
                    PRIMER_APELLIDO  = :primerApellido,
                    SEGUNDO_APELLIDO = :segundoApellido,
                    CORREO           = :correo,
                    TELEFONO         = :telefono,
                    DIRECCION        = :direccion,
                    ID_CIUDAD        = :idCiudad
              WHERE DOCUMENTO = :documento
                AND ACTIVO = 'S'`,
            {
                documento,
                primerNombre: datos.primerNombre,
                segundoNombre: datos.segundoNombre,
                primerApellido: datos.primerApellido,
                segundoApellido: datos.segundoApellido,
                correo: datos.correo,
                telefono: datos.telefono,
                direccion: datos.direccion,
                idCiudad: datos.idCiudad
            },
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}
