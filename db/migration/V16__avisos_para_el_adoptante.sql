-- =====================================================================
-- ADOPET - V16: avisos dirigidos al adoptante.
--
-- Mismos criterios que V15 (ID fijo, PRIORIDAD 1 alta - 3 baja), pero con
-- ES_PARA_STAFF = 'N': llegan a la bandeja personal de cada adoptante
-- (NOTIFICACIONES.DOCUMENTO con su documento).
-- =====================================================================

INSERT INTO TIPOS_NOTIFICACION (ID_TIPO_NOTIFICACION, NOMBRE, ES_PARA_STAFF, PRIORIDAD)
  SELECT 7, 'SOLICITUD_FORMALIZADA',  'N', 2 FROM DUAL
  UNION ALL SELECT 8,  'PRUEBA_INICIADA',        'N', 3 FROM DUAL
  UNION ALL SELECT 9,  'CHECKPOINT_DISPONIBLE',  'N', 1 FROM DUAL
  UNION ALL SELECT 10, 'ADOPCION_CONFIRMADA',    'N', 2 FROM DUAL
  UNION ALL SELECT 11, 'TRAMITE_CERRADO',        'N', 2 FROM DUAL;
