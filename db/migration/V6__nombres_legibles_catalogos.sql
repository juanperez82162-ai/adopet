-- =====================================================================
-- ADOPET — V6: nombres legibles en los catálogos
--
-- Los valores se sembraron como códigos (PEQUENO, HABITACION...), pero
-- son el texto que ven el staff y el adoptante en los formularios.
-- Se reescriben con mayúscula inicial y tildes. Va en migración (y no
-- desde la pantalla) para que quede igual en todas las bases.
--
-- ESTADOS_PROCESO no se toca: se revisa cuando se construya el módulo
-- de solicitudes.
-- =====================================================================

-- Tipos de documento (CC y CE son siglas y se quedan así)
UPDATE TIPOS_DOCUMENTO SET NOMBRE = 'Pasaporte' WHERE NOMBRE = 'PASAPORTE';

-- Especies
UPDATE ESPECIES SET NOMBRE = 'Perro' WHERE NOMBRE = 'PERRO';
UPDATE ESPECIES SET NOMBRE = 'Gato'  WHERE NOMBRE = 'GATO';

-- Sexos
UPDATE SEXOS SET NOMBRE = 'Macho'  WHERE NOMBRE = 'MACHO';
UPDATE SEXOS SET NOMBRE = 'Hembra' WHERE NOMBRE = 'HEMBRA';

-- Tamaños
UPDATE TAMANIOS SET NOMBRE = 'Pequeño' WHERE NOMBRE = 'PEQUENO';
UPDATE TAMANIOS SET NOMBRE = 'Mediano' WHERE NOMBRE = 'MEDIANO';
UPDATE TAMANIOS SET NOMBRE = 'Grande'  WHERE NOMBRE = 'GRANDE';

-- Niveles de energía
UPDATE NIVELES_ENERGIA SET NOMBRE = 'Bajo'  WHERE NOMBRE = 'BAJO';
UPDATE NIVELES_ENERGIA SET NOMBRE = 'Medio' WHERE NOMBRE = 'MEDIO';
UPDATE NIVELES_ENERGIA SET NOMBRE = 'Alto'  WHERE NOMBRE = 'ALTO';

-- Tiempos disponibles
UPDATE TIEMPOS_DISPONIBLES SET NOMBRE = 'Poco'     WHERE NOMBRE = 'POCO';
UPDATE TIEMPOS_DISPONIBLES SET NOMBRE = 'Moderado' WHERE NOMBRE = 'MODERADO';
UPDATE TIEMPOS_DISPONIBLES SET NOMBRE = 'Mucho'    WHERE NOMBRE = 'MUCHO';
UPDATE TIEMPOS_DISPONIBLES SET NOMBRE = 'Otro'     WHERE NOMBRE = 'OTRO';

-- Tipos de vivienda
UPDATE TIPOS_VIVIENDA SET NOMBRE = 'Casa'           WHERE NOMBRE = 'CASA';
UPDATE TIPOS_VIVIENDA SET NOMBRE = 'Apartamento'    WHERE NOMBRE = 'APARTAMENTO';
UPDATE TIPOS_VIVIENDA SET NOMBRE = 'Habitación'     WHERE NOMBRE = 'HABITACION';
UPDATE TIPOS_VIVIENDA SET NOMBRE = 'Finca'          WHERE NOMBRE = 'FINCA';
UPDATE TIPOS_VIVIENDA SET NOMBRE = 'Otro'           WHERE NOMBRE = 'OTRO';
UPDATE TIPOS_VIVIENDA SET NOMBRE = 'Apartaestudio'  WHERE NOMBRE = 'APARTAESTUDIO';
UPDATE TIPOS_VIVIENDA SET NOMBRE = 'Inquilinato'    WHERE NOMBRE = 'INQUILINATO';
UPDATE TIPOS_VIVIENDA SET NOMBRE = 'Dúplex'         WHERE NOMBRE = 'DUPLEX';
UPDATE TIPOS_VIVIENDA SET NOMBRE = 'Casa campestre' WHERE NOMBRE = 'CASA CAMPESTRE';
UPDATE TIPOS_VIVIENDA SET NOMBRE = 'Parcela'        WHERE NOMBRE = 'PARCELA';
