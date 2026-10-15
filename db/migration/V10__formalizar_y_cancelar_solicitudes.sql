-- =====================================================================
-- ADOPET - V10: formalizar y cancelar solicitudes.
--
-- El staff puede cancelar una solicitud que nunca se formalizo (estado
-- SOLICITUD), pero CK_SOL_FORMALIZADA exigia mascota, staff y fechas en
-- cualquier estado distinto de SOLICITUD. Se reemplaza por reglas que
-- la base puede garantizar:
--   1. Los datos de formalizacion van completos o vacios, nunca a medias.
--   2. Un tramite que avanzo (ACTIVO, EN_PRUEBA, FINALIZADO, FALLIDO,
--      VENCIDO) siempre tiene sus datos de formalizacion. SOLICITUD y las
--      canceladas pueden tenerlos o no.
--   3. Una solicitud cancelada siempre registra quien la cancelo, cuando
--      y por que (OBSERVACIONES).
-- =====================================================================

ALTER TABLE SOLICITUDES_ADOPCION DROP CONSTRAINT CK_SOL_FORMALIZADA;

ALTER TABLE SOLICITUDES_ADOPCION ADD CONSTRAINT CK_SOL_FORMALIZACION_COMPLETA CHECK (
  (    DOCUMENTO_STAFF_INICIO IS NULL
   AND FECHA_INICIO           IS NULL
   AND FECHA_VENCIMIENTO      IS NULL)
  OR
  (    DOCUMENTO_STAFF_INICIO IS NOT NULL
   AND FECHA_INICIO           IS NOT NULL
   AND FECHA_VENCIMIENTO      IS NOT NULL)
);

ALTER TABLE SOLICITUDES_ADOPCION ADD CONSTRAINT CK_SOL_FORMALIZADA CHECK (
  ID_ESTADO_PROCESO IN (1, 7, 8, 9) OR FECHA_INICIO IS NOT NULL
);

ALTER TABLE SOLICITUDES_ADOPCION ADD CONSTRAINT CK_SOL_CANCELACION CHECK (
  ID_ESTADO_PROCESO NOT IN (7, 8, 9)
  OR (    DOCUMENTO_STAFF_CIERRE IS NOT NULL
      AND FECHA_RESOLUCION       IS NOT NULL
      AND OBSERVACIONES          IS NOT NULL)
);
