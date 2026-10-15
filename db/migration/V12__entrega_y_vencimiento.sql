-- =====================================================================
-- ADOPET - V12: entrega y vencimiento de los tramites.
--
-- Reglas que la base puede garantizar:
--   1. Un tramite EN_PRUEBA (3), FINALIZADO (4) o FALLIDO (5) paso por
--      una entrega: siempre tiene FECHA_ENTREGA.
--   2. Un tramite VENCIDO (6) registra cuando se cerro (FECHA_RESOLUCION).
--      Lo cierra el sistema, por eso no lleva staff de cierre.
-- =====================================================================

ALTER TABLE SOLICITUDES_ADOPCION ADD CONSTRAINT CK_SOL_ENTREGA_REGISTRADA CHECK (
  ID_ESTADO_PROCESO NOT IN (3, 4, 5) OR FECHA_ENTREGA IS NOT NULL
);

ALTER TABLE SOLICITUDES_ADOPCION ADD CONSTRAINT CK_SOL_VENCIDA CHECK (
  ID_ESTADO_PROCESO <> 6 OR FECHA_RESOLUCION IS NOT NULL
);
