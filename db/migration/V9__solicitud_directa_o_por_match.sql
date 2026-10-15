-- =====================================================================
-- ADOPET - V9: la solicitud nace ligada a una mascota, con o sin
-- cuestionario de compatibilidad.
--
-- Hay dos caminos para empezar un proceso de adopcion:
--   1. Directo desde el catalogo (sin cuestionario).
--   2. Despues de responder el cuestionario de compatibilidad, que
--      recomienda mascotas; al elegir una se crea la misma solicitud.
--
-- Cambios:
--   1. ID_MASCOTA pasa a NOT NULL: toda solicitud nace con su mascota.
--      Esto NO reserva la mascota: solo el estado ACTIVO (staff) lo hace.
--   2. Las 7 columnas obligatorias del cuestionario pasan a NULL, con un
--      CHECK que obliga a "todas llenas o todas vacias".
--   3. Un adoptante no puede tener dos solicitudes abiertas (estado
--      SOLICITUD) para la misma mascota.
-- =====================================================================

-- 1. Mascota obligatoria desde el nacimiento de la solicitud.
ALTER TABLE SOLICITUDES_ADOPCION MODIFY (ID_MASCOTA NOT NULL);

-- 2. Cuestionario opcional, pero completo si se diligencia.
ALTER TABLE SOLICITUDES_ADOPCION MODIFY (
  ID_TIPO_VIVIENDA                 NULL,
  TIENE_ESPACIO_EXTERIOR           NULL,
  ID_TIEMPO_DISPONIBLE             NULL,
  EXPERIENCIA_PREVIA               NULL,
  DISPUESTO_NECESIDADES_ESPECIALES NULL,
  TIENE_NINOS_HOGAR                NULL,
  TIENE_OTRAS_MASCOTAS_HOGAR       NULL
);

ALTER TABLE SOLICITUDES_ADOPCION ADD CONSTRAINT CK_SOL_CUESTIONARIO_COMPLETO CHECK (
  (    ID_TIPO_VIVIENDA                 IS NULL
   AND TIENE_ESPACIO_EXTERIOR           IS NULL
   AND ID_TIEMPO_DISPONIBLE             IS NULL
   AND EXPERIENCIA_PREVIA               IS NULL
   AND DISPUESTO_NECESIDADES_ESPECIALES IS NULL
   AND TIENE_NINOS_HOGAR                IS NULL
   AND TIENE_OTRAS_MASCOTAS_HOGAR       IS NULL
   AND TIPO_VIVIENDA_OTRO                       IS NULL
   AND TIEMPO_DISPONIBLE_OTRO                   IS NULL
   AND EXPERIENCIA_PREVIA_OBSERVACIONES         IS NULL
   AND TIENE_OTRAS_MASCOTAS_HOGAR_OBSERVACIONES IS NULL)
  OR
  (    ID_TIPO_VIVIENDA                 IS NOT NULL
   AND TIENE_ESPACIO_EXTERIOR           IS NOT NULL
   AND ID_TIEMPO_DISPONIBLE             IS NOT NULL
   AND EXPERIENCIA_PREVIA               IS NOT NULL
   AND DISPUESTO_NECESIDADES_ESPECIALES IS NOT NULL
   AND TIENE_NINOS_HOGAR                IS NOT NULL
   AND TIENE_OTRAS_MASCOTAS_HOGAR       IS NOT NULL)
);

-- 3. Una solicitud abierta por adoptante y mascota.
-- Oracle ignora las filas donde todas las columnas del indice son NULL,
-- asi que solo cuentan las solicitudes en estado SOLICITUD (1).
CREATE UNIQUE INDEX UX_SOLICITUD_ABIERTA_POR_USUARIO_MASCOTA
  ON SOLICITUDES_ADOPCION (
    CASE WHEN ID_ESTADO_PROCESO = 1 THEN DOCUMENTO END,
    CASE WHEN ID_ESTADO_PROCESO = 1 THEN ID_MASCOTA END
  );
