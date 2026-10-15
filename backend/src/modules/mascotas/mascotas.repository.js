// Capa de REPOSITORY de MASCOTAS: el ÚNICO lugar con SQL del módulo.
// - Cada función hace una consulta y devuelve filas tal como las da Oracle.
// - No decide nada: las reglas van en mascotas.service.js.
// - Los valores SIEMPRE van como bind variables (:nombre).
// - La especie NO está en MASCOTAS: se obtiene por JOIN a través de RAZAS.
// - La edad actual no se guarda: se calcula sobre FECHA_INGRESO.

import oracledb from 'oracledb';
import { conConexion, enTransaccion } from '../../config/database.js';

const SIN_TILDES = (columna) =>
    `TRANSLATE(UPPER(${columna}), 'ÁÉÍÓÚÜ', 'AEIOUU')`;

// Las fotos se piden por su id (endpoint con sesión): aquí solo se
// devuelve el id de la principal, nunca la ruta del archivo.
const SELECT_MASCOTA = `
    SELECT m.ID_MASCOTA,
           m.NOMBRE,
           m.ID_RAZA,
           r.NOMBRE AS RAZA,
           r.ID_ESPECIE,
           e.NOMBRE AS ESPECIE,
           m.EDAD_MESES_INGRESO,
           m.EDAD_MESES_INGRESO + FLOOR(MONTHS_BETWEEN(SYSDATE, m.FECHA_INGRESO)) AS EDAD_ACTUAL_MESES,
           m.ID_TAMANIO,
           t.NOMBRE AS TAMANIO,
           m.ID_SEXO,
           s.NOMBRE AS SEXO,
           m.ID_NIVEL_ENERGIA,
           n.NOMBRE AS NIVEL_ENERGIA,
           m.COMPATIBLE_NINOS,
           m.COMPATIBLE_OTRAS_MASCOTAS,
           m.TIENE_NECESIDADES_ESPECIALES,
           m.DESCRIPCION_NECESIDADES,
           m.FECHA_INGRESO,
           m.FECHA_SALIDA,
           m.ID_ESTADO_MASCOTA,
           em.NOMBRE AS ESTADO,
           em.ES_VISIBLE,
           em.ES_ADOPTABLE,
           m.ACTIVO,
           m.OBSERVACIONES_ESTADO,
           (SELECT f.ID_FOTO
              FROM FOTOS_MASCOTAS f
             WHERE f.ID_MASCOTA = m.ID_MASCOTA
               AND f.ES_PRINCIPAL = 'S') AS ID_FOTO_PRINCIPAL
      FROM MASCOTAS m
      JOIN RAZAS r ON r.ID_RAZA = m.ID_RAZA
      JOIN ESPECIES e ON e.ID_ESPECIE = r.ID_ESPECIE
      JOIN TAMANIOS t ON t.ID_TAMANIO = m.ID_TAMANIO
      JOIN SEXOS s ON s.ID_SEXO = m.ID_SEXO
      JOIN NIVELES_ENERGIA n ON n.ID_NIVEL_ENERGIA = m.ID_NIVEL_ENERGIA
      JOIN ESTADOS_MASCOTA em ON em.ID_ESTADO_MASCOTA = m.ID_ESTADO_MASCOTA`;

// filtros: { texto, estado ('todos'|'activos'|'inactivos'), idEspecie,
// idEstadoMascota, soloVisibles }. soloVisibles es para el adoptante:
// animales activos cuyo estado es visible en el catálogo.
export async function listarMascotas(filtros) {
    return conConexion(async (conexion) => {
        const condiciones = [];
        const valores = {};

        if (filtros.texto) {
            condiciones.push(`${SIN_TILDES('m.NOMBRE')} LIKE '%' || ${SIN_TILDES(':texto')} || '%'`);
            valores.texto = filtros.texto;
        }

        if (filtros.estado !== 'todos') {
            condiciones.push('m.ACTIVO = :activo');
            valores.activo = filtros.estado === 'activos' ? 'S' : 'N';
        }

        if (filtros.idEspecie) {
            condiciones.push('r.ID_ESPECIE = :idEspecie');
            valores.idEspecie = filtros.idEspecie;
        }

        if (filtros.idEstadoMascota) {
            condiciones.push('m.ID_ESTADO_MASCOTA = :idEstadoMascota');
            valores.idEstadoMascota = filtros.idEstadoMascota;
        }

        if (filtros.soloVisibles) {
            condiciones.push("m.ACTIVO = 'S' AND em.ES_VISIBLE = 'S'");
        }

        const donde = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

        const resultado = await conexion.execute(
            `${SELECT_MASCOTA} ${donde} ORDER BY m.NOMBRE, m.ID_MASCOTA`,
            valores
        );

        return resultado.rows;
    });
}

// Devuelve la fila o undefined si no existe.
export async function buscarPorId(id) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `${SELECT_MASCOTA} WHERE m.ID_MASCOTA = :id`,
            { id }
        );

        return resultado.rows[0];
    });
}

// Devuelve el id que Oracle generó. FECHA_INGRESO usa su DEFAULT SYSDATE.
export async function insertarMascota(d) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `INSERT INTO MASCOTAS
                    (NOMBRE, ID_RAZA, EDAD_MESES_INGRESO, ID_TAMANIO, ID_SEXO,
                     ID_NIVEL_ENERGIA, COMPATIBLE_NINOS, COMPATIBLE_OTRAS_MASCOTAS,
                     TIENE_NECESIDADES_ESPECIALES, DESCRIPCION_NECESIDADES,
                     ID_ESTADO_MASCOTA)
             VALUES (:nombre, :idRaza, :edadMesesIngreso, :idTamanio, :idSexo,
                     :idNivelEnergia, :compatibleNinos, :compatibleOtrasMascotas,
                     :tieneNecesidadesEspeciales, :descripcionNecesidades,
                     :idEstadoMascota)
             RETURNING ID_MASCOTA INTO :id`,
            { ...d, id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
            { autoCommit: true }
        );

        return resultado.outBinds.id[0];
    });
}

// No toca FECHA_INGRESO, FECHA_SALIDA, ACTIVO ni OBSERVACIONES_ESTADO:
// esos cambian solo con la desactivación o con el proceso de adopción.
export async function actualizarMascota(id, d) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `UPDATE MASCOTAS
                SET NOMBRE = :nombre,
                    ID_RAZA = :idRaza,
                    EDAD_MESES_INGRESO = :edadMesesIngreso,
                    ID_TAMANIO = :idTamanio,
                    ID_SEXO = :idSexo,
                    ID_NIVEL_ENERGIA = :idNivelEnergia,
                    COMPATIBLE_NINOS = :compatibleNinos,
                    COMPATIBLE_OTRAS_MASCOTAS = :compatibleOtrasMascotas,
                    TIENE_NECESIDADES_ESPECIALES = :tieneNecesidadesEspeciales,
                    DESCRIPCION_NECESIDADES = :descripcionNecesidades,
                    ID_ESTADO_MASCOTA = :idEstadoMascota
              WHERE ID_MASCOTA = :id`,
            { ...d, id },
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    });
}

// Desactiva: ACTIVO = 'N', con motivo y fecha de salida. Si no llega
// fecha, es ahora; si llega una del mismo día del ingreso, GREATEST
// evita que quede antes de la hora de ingreso (lo exige un CHECK).
export async function desactivarMascota(id, { observaciones, fechaSalida }) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `UPDATE MASCOTAS
                SET ACTIVO = 'N',
                    OBSERVACIONES_ESTADO = :observaciones,
                    FECHA_SALIDA = GREATEST(
                        NVL(TO_DATE(:fechaSalida, 'YYYY-MM-DD'), SYSDATE),
                        FECHA_INGRESO)
              WHERE ID_MASCOTA = :id`,
            { observaciones, fechaSalida, id },
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    });
}

// Reactiva: la mascota vuelve al albergue. Es la MISMA fila (conserva id,
// fotos y fecha de ingreso original, así la edad sigue bien). Se limpia
// la fecha de salida y el estado vuelve a uno visible; el motivo del
// regreso reemplaza al de la salida.
export async function reactivarMascota(id, { idEstadoMascota, observaciones }) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `UPDATE MASCOTAS
                SET ACTIVO = 'S',
                    FECHA_SALIDA = NULL,
                    ID_ESTADO_MASCOTA = :idEstadoMascota,
                    OBSERVACIONES_ESTADO = :observaciones
              WHERE ID_MASCOTA = :id`,
            { idEstadoMascota, observaciones, id },
            { autoCommit: true }
        );

        return resultado.rowsAffected;
    });
}

// ---- Fotos -----------------------------------------------------------

export async function contarFotos(idMascota) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            'SELECT COUNT(*) AS TOTAL FROM FOTOS_MASCOTAS WHERE ID_MASCOTA = :idMascota',
            { idMascota }
        );

        return resultado.rows[0].TOTAL;
    });
}

// La principal primero, luego por orden de subida.
export async function listarFotos(idMascota) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `SELECT ID_FOTO, ES_PRINCIPAL
               FROM FOTOS_MASCOTAS
              WHERE ID_MASCOTA = :idMascota
              ORDER BY CASE ES_PRINCIPAL WHEN 'S' THEN 0 ELSE 1 END, ID_FOTO`,
            { idMascota }
        );

        return resultado.rows;
    });
}

// La foto con lo necesario para decidir si quien la pide puede verla:
// si la mascota está activa y si su estado es visible.
export async function buscarFoto(idFoto) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `SELECT f.ID_FOTO, f.ID_MASCOTA, f.RUTA_ARCHIVO, f.ES_PRINCIPAL,
                    m.ACTIVO, em.ES_VISIBLE
               FROM FOTOS_MASCOTAS f
               JOIN MASCOTAS m ON m.ID_MASCOTA = f.ID_MASCOTA
               JOIN ESTADOS_MASCOTA em ON em.ID_ESTADO_MASCOTA = m.ID_ESTADO_MASCOTA
              WHERE f.ID_FOTO = :idFoto`,
            { idFoto }
        );

        return resultado.rows[0];
    });
}

export async function insertarFoto({ idMascota, ruta, esPrincipal }) {
    return conConexion(async (conexion) => {
        const resultado = await conexion.execute(
            `INSERT INTO FOTOS_MASCOTAS (ID_MASCOTA, RUTA_ARCHIVO, ES_PRINCIPAL)
             VALUES (:idMascota, :ruta, :esPrincipal)
             RETURNING ID_FOTO INTO :id`,
            {
                idMascota,
                ruta,
                esPrincipal: esPrincipal ? 'S' : 'N',
                id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            },
            { autoCommit: true }
        );

        return resultado.outBinds.id[0];
    });
}

// Cambia la principal en UNA transacción: primero se quita la actual y
// luego se marca la nueva, porque el índice único no admite dos a la vez.
export async function marcarPrincipal(idFoto, idMascota) {
    return enTransaccion(async (conexion) => {
        await conexion.execute(
            "UPDATE FOTOS_MASCOTAS SET ES_PRINCIPAL = 'N' WHERE ID_MASCOTA = :idMascota AND ES_PRINCIPAL = 'S'",
            { idMascota }
        );

        await conexion.execute(
            "UPDATE FOTOS_MASCOTAS SET ES_PRINCIPAL = 'S' WHERE ID_FOTO = :idFoto",
            { idFoto }
        );
    });
}

// Los estados que el staff puede elegir a mano (el resto lo pone el sistema).
export async function listarEstadosElegibles(ids) {
    return conConexion(async (conexion) => {
        const marcas = ids.map((_, i) => `:id${i}`).join(', ');
        const valores = Object.fromEntries(ids.map((id, i) => [`id${i}`, id]));

        const resultado = await conexion.execute(
            `SELECT ID_ESTADO_MASCOTA, NOMBRE
               FROM ESTADOS_MASCOTA
              WHERE ACTIVO = 'S' AND ID_ESTADO_MASCOTA IN (${marcas})
              ORDER BY ID_ESTADO_MASCOTA`,
            valores
        );

        return resultado.rows;
    });
}

// Borra la foto (fila). Si era la principal y quedan otras, la más antigua
// pasa a serlo, todo en UNA transacción: nunca queda una mascota con fotos
// y sin principal. Ninguna otra tabla referencia a FOTOS_MASCOTAS.
export async function eliminarFoto(idFoto, idMascota, eraPrincipal) {
    return enTransaccion(async (conexion) => {
        await conexion.execute(
            'DELETE FROM FOTOS_MASCOTAS WHERE ID_FOTO = :idFoto',
            { idFoto }
        );

        if (eraPrincipal) {
            await conexion.execute(
                `UPDATE FOTOS_MASCOTAS
                    SET ES_PRINCIPAL = 'S'
                  WHERE ID_FOTO = (SELECT MIN(ID_FOTO)
                                     FROM FOTOS_MASCOTAS
                                    WHERE ID_MASCOTA = :idMascota)`,
                { idMascota }
            );
        }
    });
}
