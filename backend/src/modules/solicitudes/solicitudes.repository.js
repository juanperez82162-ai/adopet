// Capa de REPOSITORY de SOLICITUDES: el ÚNICO lugar con SQL del módulo.
// Solo lee de MASCOTAS y de los catálogos para armar el match; nunca
// modifica mascotas (eso es del módulo mascotas).

import oracledb from 'oracledb';
import { conConexion } from '../../config/database.js';

// Opciones del cuestionario: solo las activas.
export async function listarTiposVivienda() {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `SELECT ID_TIPO_VIVIENDA AS ID, NOMBRE, DESCRIPCION, NIVEL, ES_OTRO
               FROM TIPOS_VIVIENDA WHERE ACTIVO = 'S' ORDER BY ES_OTRO, NIVEL DESC, NOMBRE`
        );
        return r.rows;
    });
}

export async function listarTiemposDisponibles() {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `SELECT ID_TIEMPO_DISPONIBLE AS ID, NOMBRE, DESCRIPCION, NIVEL, ES_OTRO
               FROM TIEMPOS_DISPONIBLES WHERE ACTIVO = 'S' ORDER BY ES_OTRO, NIVEL, NOMBRE`
        );
        return r.rows;
    });
}

export async function listarEspecies() {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `SELECT ID_ESPECIE, NOMBRE FROM ESPECIES WHERE ACTIVO = 'S' ORDER BY NOMBRE`
        );
        return r.rows;
    });
}

// Mascotas que se pueden recomendar: activas y en un estado adoptable.
// idEspecie es opcional.
export async function listarMascotasAdoptables(idEspecie) {
    return conConexion(async (conexion) => {
        const valores = {};
        let filtroEspecie = '';

        if (idEspecie) {
            filtroEspecie = 'AND r.ID_ESPECIE = :idEspecie';
            valores.idEspecie = idEspecie;
        }

        const r = await conexion.execute(
            `SELECT m.ID_MASCOTA,
                    m.NOMBRE,
                    r.NOMBRE AS RAZA,
                    e.NOMBRE AS ESPECIE,
                    m.EDAD_MESES_INGRESO + FLOOR(MONTHS_BETWEEN(SYSDATE, m.FECHA_INGRESO)) AS EDAD_ACTUAL_MESES,
                    t.NOMBRE AS TAMANIO,
                    t.NIVEL  AS NIVEL_TAMANIO,
                    s.NOMBRE AS SEXO,
                    n.NOMBRE AS NIVEL_ENERGIA_NOMBRE,
                    n.NIVEL  AS NIVEL_ENERGIA,
                    m.COMPATIBLE_NINOS,
                    m.COMPATIBLE_OTRAS_MASCOTAS,
                    m.TIENE_NECESIDADES_ESPECIALES,
                    (SELECT f.ID_FOTO FROM FOTOS_MASCOTAS f
                      WHERE f.ID_MASCOTA = m.ID_MASCOTA AND f.ES_PRINCIPAL = 'S') AS ID_FOTO_PRINCIPAL
               FROM MASCOTAS m
               JOIN RAZAS r ON r.ID_RAZA = m.ID_RAZA
               JOIN ESPECIES e ON e.ID_ESPECIE = r.ID_ESPECIE
               JOIN TAMANIOS t ON t.ID_TAMANIO = m.ID_TAMANIO
               JOIN SEXOS s ON s.ID_SEXO = m.ID_SEXO
               JOIN NIVELES_ENERGIA n ON n.ID_NIVEL_ENERGIA = m.ID_NIVEL_ENERGIA
               JOIN ESTADOS_MASCOTA em ON em.ID_ESTADO_MASCOTA = m.ID_ESTADO_MASCOTA
              WHERE m.ACTIVO = 'S' AND em.ES_ADOPTABLE = 'S' ${filtroEspecie}
              ORDER BY m.NOMBRE, m.ID_MASCOTA`,
            valores
        );
        return r.rows;
    });
}

// Datos mínimos de la mascota para decidir si se puede solicitar.
export async function buscarMascotaParaSolicitud(idMascota) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `SELECT m.ID_MASCOTA, m.NOMBRE, m.ACTIVO, em.ES_ADOPTABLE
               FROM MASCOTAS m
               JOIN ESTADOS_MASCOTA em ON em.ID_ESTADO_MASCOTA = m.ID_ESTADO_MASCOTA
              WHERE m.ID_MASCOTA = :idMascota`,
            { idMascota }
        );
        return r.rows[0];
    });
}

export async function buscarOpcionVivienda(id) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `SELECT ID_TIPO_VIVIENDA AS ID, NIVEL, ES_OTRO FROM TIPOS_VIVIENDA
              WHERE ID_TIPO_VIVIENDA = :id AND ACTIVO = 'S'`, { id });
        return r.rows[0];
    });
}

export async function buscarOpcionTiempo(id) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `SELECT ID_TIEMPO_DISPONIBLE AS ID, NIVEL, ES_OTRO FROM TIEMPOS_DISPONIBLES
              WHERE ID_TIEMPO_DISPONIBLE = :id AND ACTIVO = 'S'`, { id });
        return r.rows[0];
    });
}

// d.cuestionario puede ser null (solicitud directa): las columnas del
// cuestionario quedan en NULL, que es lo que acepta CK_SOL_CUESTIONARIO_COMPLETO.
export async function insertarSolicitud(d) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `INSERT INTO SOLICITUDES_ADOPCION
                    (DOCUMENTO, ID_MASCOTA,
                     ID_TIPO_VIVIENDA, TIPO_VIVIENDA_OTRO, TIENE_ESPACIO_EXTERIOR,
                     ID_TIEMPO_DISPONIBLE, TIEMPO_DISPONIBLE_OTRO,
                     EXPERIENCIA_PREVIA, EXPERIENCIA_PREVIA_OBSERVACIONES,
                     DISPUESTO_NECESIDADES_ESPECIALES, TIENE_NINOS_HOGAR,
                     TIENE_OTRAS_MASCOTAS_HOGAR, TIENE_OTRAS_MASCOTAS_HOGAR_OBSERVACIONES)
             VALUES (:documento, :idMascota,
                     :idTipoVivienda, :tipoViviendaOtro, :tieneEspacioExterior,
                     :idTiempoDisponible, :tiempoDisponibleOtro,
                     :experienciaPrevia, :experienciaObservaciones,
                     :dispuestoNecesidades, :tieneNinos,
                     :tieneOtrasMascotas, :otrasMascotasObservaciones)
             RETURNING ID_SOLICITUD, FECHA_ENVIO INTO :id, :fecha`,
            {
                ...d,
                id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                fecha: { dir: oracledb.BIND_OUT, type: oracledb.DATE }
            },
            { autoCommit: true }
        );

        return { idSolicitud: r.outBinds.id[0], fechaEnvio: r.outBinds.fecha[0] };
    });
}

// ---- Consulta y gestión (staff) ----------------------------------------

// Los segundos nombre/apellido pueden ser NULL: se colapsan los espacios dobles.
const NOMBRE_ADOPTANTE = `REGEXP_REPLACE(TRIM(u.PRIMER_NOMBRE || ' ' || u.SEGUNDO_NOMBRE || ' ' || u.PRIMER_APELLIDO || ' ' || u.SEGUNDO_APELLIDO), ' +', ' ')`;

const SELECT_SOLICITUD = `
    SELECT s.ID_SOLICITUD,
           s.DOCUMENTO,
           ${NOMBRE_ADOPTANTE} AS NOMBRE_ADOPTANTE,
           u.TELEFONO,
           u.CORREO,
           u.ACTIVO AS USUARIO_ACTIVO,
           p.NOMBRE_PERFIL,
           s.ID_MASCOTA,
           m.NOMBRE AS MASCOTA,
           m.ACTIVO AS MASCOTA_ACTIVA,
           m.ID_ESTADO_MASCOTA,
           (SELECT f.ID_FOTO FROM FOTOS_MASCOTAS f
             WHERE f.ID_MASCOTA = m.ID_MASCOTA AND f.ES_PRINCIPAL = 'S') AS ID_FOTO_PRINCIPAL,
           t.NIVEL AS NIVEL_TAMANIO,
           n.NIVEL AS NIVEL_ENERGIA,
           m.COMPATIBLE_NINOS,
           m.COMPATIBLE_OTRAS_MASCOTAS,
           m.TIENE_NECESIDADES_ESPECIALES,
           s.ID_ESTADO_PROCESO,
           ep.NOMBRE AS ESTADO,
           s.FECHA_ENVIO,
           s.FECHA_INICIO,
           s.FECHA_VENCIMIENTO,
           s.FECHA_RESOLUCION,
           s.OBSERVACIONES,
           s.ID_TIPO_VIVIENDA,
           tv.NOMBRE AS TIPO_VIVIENDA,
           tv.NIVEL AS NIVEL_VIVIENDA,
           s.TIPO_VIVIENDA_OTRO,
           s.TIENE_ESPACIO_EXTERIOR,
           s.ID_TIEMPO_DISPONIBLE,
           td.NOMBRE AS TIEMPO_DISPONIBLE,
           td.NIVEL AS NIVEL_TIEMPO,
           s.TIEMPO_DISPONIBLE_OTRO,
           s.EXPERIENCIA_PREVIA,
           s.EXPERIENCIA_PREVIA_OBSERVACIONES,
           s.DISPUESTO_NECESIDADES_ESPECIALES,
           s.TIENE_NINOS_HOGAR,
           s.TIENE_OTRAS_MASCOTAS_HOGAR,
           s.TIENE_OTRAS_MASCOTAS_HOGAR_OBSERVACIONES
      FROM SOLICITUDES_ADOPCION s
      JOIN USUARIOS u ON u.DOCUMENTO = s.DOCUMENTO
      JOIN PERFILES p ON p.ID_PERFIL = u.ID_PERFIL
      JOIN MASCOTAS m ON m.ID_MASCOTA = s.ID_MASCOTA
      JOIN TAMANIOS t ON t.ID_TAMANIO = m.ID_TAMANIO
      JOIN NIVELES_ENERGIA n ON n.ID_NIVEL_ENERGIA = m.ID_NIVEL_ENERGIA
      JOIN ESTADOS_PROCESO ep ON ep.ID_ESTADO_PROCESO = s.ID_ESTADO_PROCESO
      LEFT JOIN TIPOS_VIVIENDA tv ON tv.ID_TIPO_VIVIENDA = s.ID_TIPO_VIVIENDA
      LEFT JOIN TIEMPOS_DISPONIBLES td ON td.ID_TIEMPO_DISPONIBLE = s.ID_TIEMPO_DISPONIBLE`;

const SIN_TILDES = (columna) => `TRANSLATE(UPPER(${columna}), 'ÁÉÍÓÚÜ', 'AEIOUU')`;

// filtros: { idEstadoProceso, texto (adoptante, documento o mascota),
// documento (si se pasa, solo las de esa persona: así ve el adoptante las suyas) }.
export async function listarSolicitudes(filtros) {
    return conConexion(async (conexion) => {
        const condiciones = [];
        const valores = {};

        if (filtros.documento) {
            condiciones.push('s.DOCUMENTO = :documento');
            valores.documento = filtros.documento;
        }

        if (filtros.idEstadoProceso) {
            condiciones.push('s.ID_ESTADO_PROCESO = :idEstadoProceso');
            valores.idEstadoProceso = filtros.idEstadoProceso;
        }

        if (filtros.texto) {
            condiciones.push(`(${SIN_TILDES(NOMBRE_ADOPTANTE)} LIKE '%' || ${SIN_TILDES(':texto')} || '%'
                          OR ${SIN_TILDES('m.NOMBRE')} LIKE '%' || ${SIN_TILDES(':texto')} || '%'
                          OR s.DOCUMENTO LIKE '%' || :texto || '%')`);
            valores.texto = filtros.texto;
        }

        const donde = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

        const r = await conexion.execute(
            `${SELECT_SOLICITUD} ${donde} ORDER BY s.FECHA_ENVIO DESC, s.ID_SOLICITUD DESC`,
            valores
        );
        return r.rows;
    });
}

export async function buscarSolicitud(idSolicitud) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(`${SELECT_SOLICITUD} WHERE s.ID_SOLICITUD = :idSolicitud`, { idSolicitud });
        return r.rows[0];
    });
}

// Solo formaliza si la solicitud sigue en SOLICITUD (1). Devuelve las filas
// cambiadas. Los índices UX_PROCESO_VIGENTE_* de la base impiden dos trámites
// vigentes de la misma persona o de la misma mascota.
export async function formalizarSolicitud(idSolicitud, documentoStaff, dias, observaciones) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `UPDATE SOLICITUDES_ADOPCION
                SET ID_ESTADO_PROCESO = 2,
                    DOCUMENTO_STAFF_INICIO = :documentoStaff,
                    FECHA_INICIO = SYSDATE,
                    FECHA_VENCIMIENTO = SYSDATE + :dias,
                    OBSERVACIONES = :observaciones
              WHERE ID_SOLICITUD = :idSolicitud
                AND ID_ESTADO_PROCESO = 1`,
            { idSolicitud, documentoStaff, dias, observaciones },
            { autoCommit: true }
        );
        return r.rowsAffected;
    });
}

// Cancela una solicitud que sigue en el estado esperado (1 o 2).
export async function cancelarSolicitud(idSolicitud, estadoActual, idEstadoNuevo, documentoStaff, observaciones) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `UPDATE SOLICITUDES_ADOPCION
                SET ID_ESTADO_PROCESO = :idEstadoNuevo,
                    DOCUMENTO_STAFF_CIERRE = :documentoStaff,
                    FECHA_RESOLUCION = SYSDATE,
                    OBSERVACIONES = :observaciones
              WHERE ID_SOLICITUD = :idSolicitud
                AND ID_ESTADO_PROCESO = :estadoActual`,
            { idSolicitud, estadoActual, idEstadoNuevo, documentoStaff, observaciones },
            { autoCommit: true }
        );
        return r.rowsAffected;
    });
}

// ---- Entrega, plazo y vencimiento ---------------------------------------

// ACTIVO → EN_PRUEBA con la fecha de entrega de ahora. Solo si sigue ACTIVO y
// el plazo no se ha cumplido. Devuelve { filas, fechaEntrega } (la fecha exacta
// que quedó guardada, para programar los checkpoints sobre ella).
export async function registrarEntrega(idSolicitud) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `UPDATE SOLICITUDES_ADOPCION
                SET ID_ESTADO_PROCESO = 3,
                    FECHA_ENTREGA = SYSDATE
              WHERE ID_SOLICITUD = :idSolicitud
                AND ID_ESTADO_PROCESO = 2
                AND FECHA_VENCIMIENTO >= SYSDATE
             RETURNING FECHA_ENTREGA INTO :fecha`,
            { idSolicitud, fecha: { dir: oracledb.BIND_OUT, type: oracledb.DATE } },
            { autoCommit: true }
        );

        return { filas: r.rowsAffected, fechaEntrega: r.rowsAffected === 1 ? r.outBinds.fecha[0] : null };
    });
}

// Deshace una entrega que no se pudo completar (vuelve a ACTIVO).
export async function revertirEntrega(idSolicitud) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `UPDATE SOLICITUDES_ADOPCION
                SET ID_ESTADO_PROCESO = 2,
                    FECHA_ENTREGA = NULL
              WHERE ID_SOLICITUD = :idSolicitud
                AND ID_ESTADO_PROCESO = 3`,
            { idSolicitud },
            { autoCommit: true }
        );
        return r.rowsAffected;
    });
}

// Suma días a la fecha de vencimiento de un trámite ACTIVO.
export async function extenderPlazo(idSolicitud, dias, observaciones) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `UPDATE SOLICITUDES_ADOPCION
                SET FECHA_VENCIMIENTO = FECHA_VENCIMIENTO + :dias,
                    OBSERVACIONES = :observaciones
              WHERE ID_SOLICITUD = :idSolicitud
                AND ID_ESTADO_PROCESO = 2`,
            { idSolicitud, dias, observaciones },
            { autoCommit: true }
        );
        return r.rowsAffected;
    });
}

// Trámites ACTIVO cuyo plazo ya se cumplió (los toma el job de vencimiento).
export async function listarVencidas() {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `SELECT ID_SOLICITUD, ID_MASCOTA
               FROM SOLICITUDES_ADOPCION
              WHERE ID_ESTADO_PROCESO = 2
                AND FECHA_VENCIMIENTO < SYSDATE
              ORDER BY ID_SOLICITUD`
        );
        return r.rows;
    });
}

// ACTIVO → VENCIDO, solo si sigue ACTIVO y vencida (así un staff que extendió
// el plazo justo antes no pierde el trámite). Lo cierra el sistema: sin staff.
export async function marcarVencida(idSolicitud) {
    return conConexion(async (conexion) => {
        const r = await conexion.execute(
            `UPDATE SOLICITUDES_ADOPCION
                SET ID_ESTADO_PROCESO = 6,
                    FECHA_RESOLUCION = SYSDATE
              WHERE ID_SOLICITUD = :idSolicitud
                AND ID_ESTADO_PROCESO = 2
                AND FECHA_VENCIMIENTO < SYSDATE`,
            { idSolicitud },
            { autoCommit: true }
        );
        return r.rowsAffected;
    });
}
