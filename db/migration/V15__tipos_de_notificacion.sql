-- =====================================================================
-- ADOPET - V15: tipos de notificacion (alertas al staff, RF10).
--
-- Los IDs son fijos porque el backend los referencia por valor.
-- PRIORIDAD: 1 alta, 2 media, 3 baja (ordena la bandeja).
-- Todas son para el staff como equipo (DOCUMENTO NULL en NOTIFICACIONES).
-- =====================================================================

INSERT INTO TIPOS_NOTIFICACION (ID_TIPO_NOTIFICACION, NOMBRE, ES_PARA_STAFF, PRIORIDAD)
  SELECT 1, 'SEGUIMIENTO_ROJO',        'S', 1 FROM DUAL
  UNION ALL SELECT 2, 'CONTACTO_SOLICITADO',    'S', 1 FROM DUAL
  UNION ALL SELECT 3, 'CHECKPOINT_NO_ATENDIDO', 'S', 2 FROM DUAL
  UNION ALL SELECT 4, 'TRAMITE_POR_VENCER',     'S', 2 FROM DUAL
  UNION ALL SELECT 5, 'PRUEBA_CUMPLIDA',        'S', 2 FROM DUAL
  UNION ALL SELECT 6, 'CHECKPOINT_RESPONDIDO',  'S', 3 FROM DUAL;
