-- =====================================================================
-- ADOPET - V11: el adoptante puede cancelar su propia solicitud.
--
-- CK_SOL_CANCELACION (V10) exigia siempre un staff que cerrara la
-- solicitud. Cuando cancela el propio adoptante (estado 7) no hay staff:
--   - CANCELADO_ADOPTANTE (7): exige la fecha; el staff y el motivo
--     son opcionales (si lo cancela el staff por el adoptante, queda su
--     documento).
--   - CANCELADO_STAFF (8) y CANCELADO_OTROS (9): exigen fecha, staff y
--     motivo, como antes.
-- =====================================================================

ALTER TABLE SOLICITUDES_ADOPCION DROP CONSTRAINT CK_SOL_CANCELACION;

ALTER TABLE SOLICITUDES_ADOPCION ADD CONSTRAINT CK_SOL_CANCELACION CHECK (
  ID_ESTADO_PROCESO NOT IN (7, 8, 9)
  OR (    FECHA_RESOLUCION IS NOT NULL
      AND (   ID_ESTADO_PROCESO = 7
           OR (DOCUMENTO_STAFF_CIERRE IS NOT NULL AND OBSERVACIONES IS NOT NULL)))
);
