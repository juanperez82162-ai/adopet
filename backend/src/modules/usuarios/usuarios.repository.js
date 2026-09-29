import { obtenerConexion } from '../../config/database.js';

// Datos completos de un usuario, activo o no (el servicio decide qué hacer).
export async function buscarUsuarioPorDocumento(documento) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT u.DOCUMENTO, td.NOMBRE AS TIPO_DOCUMENTO,
                    u.PRIMER_NOMBRE, u.SEGUNDO_NOMBRE, u.PRIMER_APELLIDO, u.SEGUNDO_APELLIDO,
                    u.CORREO, u.TELEFONO, u.DIRECCION, u.ID_CIUDAD, c.NOMBRE AS CIUDAD,
                    TO_CHAR(u.FECHA_NACIMIENTO, 'YYYY-MM-DD') AS FECHA_NACIMIENTO,
                    TO_CHAR(u.FECHA_REGISTRO, 'YYYY-MM-DD') AS FECHA_REGISTRO,
                    u.ACTIVO, u.ID_PERFIL, p.NOMBRE_PERFIL, r.NOMBRE_ROL
               FROM USUARIOS u
               JOIN TIPOS_DOCUMENTO td ON td.ID_TIPO_DOCUMENTO = u.ID_TIPO_DOCUMENTO
               JOIN CIUDADES c         ON c.ID_CIUDAD         = u.ID_CIUDAD
               JOIN PERFILES p         ON p.ID_PERFIL         = u.ID_PERFIL
               JOIN ROLES r            ON r.ID_ROL            = p.ID_ROL
              WHERE u.DOCUMENTO = :documento`,
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

export async function actualizarDatosUsuario(documento, datos) {
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
              WHERE DOCUMENTO = :documento`,
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

// ---- Administración de usuarios --------------------------------------

// Quita tildes y pasa a minúsculas, para buscar "perez" y encontrar "Pérez".
const SIN_TILDES = (columna) => `TRANSLATE(LOWER(${columna}), 'áéíóúüñ', 'aeiouun')`;

// filtros: { buscar, idPerfil, activo }. Todos opcionales.
export async function listarUsuarios(filtros, limite) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const condiciones = [];
        const valores = { limite };

        if (filtros.buscar) {
            condiciones.push(`(
                   u.DOCUMENTO LIKE :patron
                OR ${SIN_TILDES('u.CORREO')} LIKE :patron
                OR ${SIN_TILDES("u.PRIMER_NOMBRE || ' ' || u.PRIMER_APELLIDO")} LIKE :patron
                OR ${SIN_TILDES(`u.PRIMER_NOMBRE || NVL2(u.SEGUNDO_NOMBRE, ' ' || u.SEGUNDO_NOMBRE, '')
                               || ' ' || u.PRIMER_APELLIDO || NVL2(u.SEGUNDO_APELLIDO, ' ' || u.SEGUNDO_APELLIDO, '')`)} LIKE :patron
            )`);
            valores.patron = `%${filtros.buscar}%`;
        }

        if (filtros.idPerfil) {
            condiciones.push('u.ID_PERFIL = :idPerfil');
            valores.idPerfil = filtros.idPerfil;
        }

        if (filtros.activo) {
            condiciones.push('u.ACTIVO = :activo');
            valores.activo = filtros.activo;
        }

        const donde = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

        const resultado = await conexion.execute(
            `SELECT u.DOCUMENTO, td.NOMBRE AS TIPO_DOCUMENTO,
                    u.PRIMER_NOMBRE, u.SEGUNDO_NOMBRE, u.PRIMER_APELLIDO, u.SEGUNDO_APELLIDO,
                    u.CORREO, u.TELEFONO, u.ACTIVO, u.ID_PERFIL, p.NOMBRE_PERFIL, r.NOMBRE_ROL,
                    TO_CHAR(u.FECHA_REGISTRO, 'YYYY-MM-DD') AS FECHA_REGISTRO
               FROM USUARIOS u
               JOIN TIPOS_DOCUMENTO td ON td.ID_TIPO_DOCUMENTO = u.ID_TIPO_DOCUMENTO
               JOIN PERFILES p         ON p.ID_PERFIL         = u.ID_PERFIL
               JOIN ROLES r            ON r.ID_ROL            = p.ID_ROL
               ${donde}
              ORDER BY u.FECHA_REGISTRO DESC, u.DOCUMENTO
              FETCH FIRST :limite ROWS ONLY`,
            valores
        );

        return resultado.rows;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function listarPerfilesActivos() {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT p.ID_PERFIL, p.NOMBRE_PERFIL, r.NOMBRE_ROL
               FROM PERFILES p
               JOIN ROLES r ON r.ID_ROL = p.ID_ROL
              WHERE p.ACTIVO = 'S'
              ORDER BY r.ID_ROL, p.ID_PERFIL`
        );

        return resultado.rows;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function actualizarPerfilUsuario(documento, idPerfil) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `UPDATE USUARIOS
                SET ID_PERFIL = :idPerfil
              WHERE DOCUMENTO = :documento`,
            { idPerfil, documento },
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

export async function actualizarEstadoUsuario(documento, activo) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `UPDATE USUARIOS
                SET ACTIVO = :activo
              WHERE DOCUMENTO = :documento`,
            { activo, documento },
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}
