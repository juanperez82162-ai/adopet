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
