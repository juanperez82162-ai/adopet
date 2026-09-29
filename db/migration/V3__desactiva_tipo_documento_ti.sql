-- =====================================================================
-- ADOPET — V3: desactiva el tipo de documento TI
-- La tarjeta de identidad es de menores de edad y el registro exige
-- 18 años. No se borra: se desactiva, como todo en ADOPET.
-- =====================================================================

UPDATE TIPOS_DOCUMENTO
   SET ACTIVO = 'N'
 WHERE ID_TIPO_DOCUMENTO = 3;