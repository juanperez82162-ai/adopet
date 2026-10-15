-- =====================================================================
-- ADOPET - V14: cierre del periodo de prueba.
--
-- Un tramite FINALIZADO (4) o FALLIDO (5) lo cierra una persona del staff,
-- asi que siempre registra cuando (FECHA_RESOLUCION) y quien
-- (DOCUMENTO_STAFF_CIERRE). Un tramite FALLIDO ademas explica por que la
-- mascota volvio al albergue (OBSERVACIONES).
-- =====================================================================

ALTER TABLE SOLICITUDES_ADOPCION ADD CONSTRAINT CK_SOL_CIERRE_PRUEBA CHECK (
  ID_ESTADO_PROCESO NOT IN (4, 5)
  OR (FECHA_RESOLUCION IS NOT NULL AND DOCUMENTO_STAFF_CIERRE IS NOT NULL)
);

ALTER TABLE SOLICITUDES_ADOPCION ADD CONSTRAINT CK_SOL_FALLIDA_MOTIVO CHECK (
  ID_ESTADO_PROCESO <> 5 OR OBSERVACIONES IS NOT NULL
);
