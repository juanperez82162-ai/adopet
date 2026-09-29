-- =====================================================================
-- ADOPET — V5: descripciones en los catálogos del match y más viviendas
--
-- Decisión: tamaños, niveles de energía, tipos de vivienda y tiempos
-- disponibles vuelven a ser catálogos PREDEFINIDOS (no se crean valores
-- desde la aplicación), pero cada valor lleva una DESCRIPCION que explica
-- qué significa, para el staff y para el adoptante.
-- Tipos de vivienda queda con una lista amplia para que la opción
-- "Otro" casi no haga falta.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Columna DESCRIPCION. Se agrega vacía, se llena y se vuelve
--    obligatoria: en estos catálogos todo valor debe explicarse.
-- ---------------------------------------------------------------------

ALTER TABLE TAMANIOS            ADD (DESCRIPCION VARCHAR2(150));
ALTER TABLE NIVELES_ENERGIA     ADD (DESCRIPCION VARCHAR2(150));
ALTER TABLE TIEMPOS_DISPONIBLES ADD (DESCRIPCION VARCHAR2(150));
ALTER TABLE TIPOS_VIVIENDA      ADD (DESCRIPCION VARCHAR2(150));


-- Tamaños (peso en edad adulta)
UPDATE TAMANIOS SET DESCRIPCION = 'Hasta 10 kg en edad adulta. Ej.: chihuahua, shih tzu, la mayoría de gatos.'
 WHERE NOMBRE = 'PEQUENO';
UPDATE TAMANIOS SET DESCRIPCION = 'Entre 10 y 25 kg en edad adulta. Ej.: beagle, schnauzer, criollo mediano.'
 WHERE NOMBRE = 'MEDIANO';
UPDATE TAMANIOS SET DESCRIPCION = 'Más de 25 kg en edad adulta. Ej.: labrador, pastor alemán, golden retriever.'
 WHERE NOMBRE = 'GRANDE';

-- Niveles de energía
UPDATE NIVELES_ENERGIA SET DESCRIPCION = 'Tranquilo: le bastan paseos cortos y pasa buena parte del día descansando.'
 WHERE NOMBRE = 'BAJO';
UPDATE NIVELES_ENERGIA SET DESCRIPCION = 'Moderado: necesita paseos diarios y ratos de juego.'
 WHERE NOMBRE = 'MEDIO';
UPDATE NIVELES_ENERGIA SET DESCRIPCION = 'Muy activo: necesita ejercicio intenso y juego todos los días.'
 WHERE NOMBRE = 'ALTO';

-- Tiempos disponibles (tiempo diario del adoptante)
UPDATE TIEMPOS_DISPONIBLES SET DESCRIPCION = 'Menos de 2 horas al día para compartir con la mascota.'
 WHERE NOMBRE = 'POCO';
UPDATE TIEMPOS_DISPONIBLES SET DESCRIPCION = 'Entre 2 y 5 horas al día para compartir con la mascota.'
 WHERE NOMBRE = 'MODERADO';
UPDATE TIEMPOS_DISPONIBLES SET DESCRIPCION = 'Más de 5 horas al día. Ej.: trabaja desde casa o hay alguien la mayor parte del día.'
 WHERE NOMBRE = 'MUCHO';
UPDATE TIEMPOS_DISPONIBLES SET DESCRIPCION = 'Mi situación es distinta a las anteriores y la describo.'
 WHERE NOMBRE = 'OTRO';

-- Tipos de vivienda existentes
UPDATE TIPOS_VIVIENDA SET DESCRIPCION = 'Casa independiente de uno o más pisos.'
 WHERE NOMBRE = 'CASA';
UPDATE TIPOS_VIVIENDA SET DESCRIPCION = 'Apartamento en edificio o conjunto residencial.'
 WHERE NOMBRE = 'APARTAMENTO';
UPDATE TIPOS_VIVIENDA SET DESCRIPCION = 'Una habitación dentro de una vivienda compartida.'
 WHERE NOMBRE = 'HABITACION';
UPDATE TIPOS_VIVIENDA SET DESCRIPCION = 'Vivienda rural con terreno amplio.'
 WHERE NOMBRE = 'FINCA';
UPDATE TIPOS_VIVIENDA SET DESCRIPCION = 'Mi vivienda no aparece en la lista y la describo.'
 WHERE NOMBRE = 'OTRO';


-- ---------------------------------------------------------------------
-- 2. Más tipos de vivienda. El NIVEL mide el espacio interior:
--    1 reducido, 2 medio, 3 amplio. Si hay patio o zona verde lo
--    responde aparte la pregunta TIENE_ESPACIO_EXTERIOR del cuestionario.
-- ---------------------------------------------------------------------

INSERT INTO TIPOS_VIVIENDA (NOMBRE, NIVEL, DESCRIPCION)
VALUES ('APARTAESTUDIO', 1, 'Apartamento pequeño de un solo ambiente.');

INSERT INTO TIPOS_VIVIENDA (NOMBRE, NIVEL, DESCRIPCION)
VALUES ('INQUILINATO', 1, 'Vivienda compartida por varios hogares, con espacios comunes.');

INSERT INTO TIPOS_VIVIENDA (NOMBRE, NIVEL, DESCRIPCION)
VALUES ('DUPLEX', 3, 'Apartamento o casa de dos pisos conectados por dentro.');

INSERT INTO TIPOS_VIVIENDA (NOMBRE, NIVEL, DESCRIPCION)
VALUES ('CASA CAMPESTRE', 3, 'Casa en zona rural o en las afueras de la ciudad, con zonas verdes.');

INSERT INTO TIPOS_VIVIENDA (NOMBRE, NIVEL, DESCRIPCION)
VALUES ('PARCELA', 3, 'Terreno rural con vivienda, más pequeño que una finca.');


-- ---------------------------------------------------------------------
-- 3. Ya todos tienen descripción: se vuelve obligatoria.
-- ---------------------------------------------------------------------

ALTER TABLE TAMANIOS            MODIFY (DESCRIPCION NOT NULL);
ALTER TABLE NIVELES_ENERGIA     MODIFY (DESCRIPCION NOT NULL);
ALTER TABLE TIEMPOS_DISPONIBLES MODIFY (DESCRIPCION NOT NULL);
ALTER TABLE TIPOS_VIVIENDA      MODIFY (DESCRIPCION NOT NULL);
