-- =====================================================================
-- ADOPET — V4: catálogos ampliables desde la aplicación
--
-- 1. ID automático (secuencia) para los catálogos que tenían el ID
--    escrito a mano, para que el Admin pueda crear valores nuevos.
--    ESTADOS_PROCESO queda fijo: el flujo de adopción depende de él.
-- 2. Columna NIVEL (1 a 3) en los catálogos que usa el motor de match:
--    el match compara niveles, no nombres, así que un valor nuevo
--    funciona apenas se le asigna su nivel.
-- 3. Columna ES_OTRO en vivienda y tiempo: marca la opción "Otro",
--    que habilita el texto libre del cuestionario
--    (TIPO_VIVIENDA_OTRO / TIEMPO_DISPONIBLE_OTRO).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Secuencias para el ID. Empiezan en 100 para no chocar nunca con
--    los IDs sembrados a mano en la V2.
-- ---------------------------------------------------------------------

CREATE SEQUENCE SEQ_TIPOS_DOCUMENTO     START WITH 100;
CREATE SEQUENCE SEQ_ESPECIES            START WITH 100;
CREATE SEQUENCE SEQ_TAMANIOS            START WITH 100;
CREATE SEQUENCE SEQ_SEXOS               START WITH 100;
CREATE SEQUENCE SEQ_NIVELES_ENERGIA     START WITH 100;
CREATE SEQUENCE SEQ_TIPOS_VIVIENDA      START WITH 100;
CREATE SEQUENCE SEQ_TIEMPOS_DISPONIBLES START WITH 100;

ALTER TABLE TIPOS_DOCUMENTO     MODIFY (ID_TIPO_DOCUMENTO    DEFAULT SEQ_TIPOS_DOCUMENTO.NEXTVAL);
ALTER TABLE ESPECIES            MODIFY (ID_ESPECIE           DEFAULT SEQ_ESPECIES.NEXTVAL);
ALTER TABLE TAMANIOS            MODIFY (ID_TAMANIO           DEFAULT SEQ_TAMANIOS.NEXTVAL);
ALTER TABLE SEXOS               MODIFY (ID_SEXO              DEFAULT SEQ_SEXOS.NEXTVAL);
ALTER TABLE NIVELES_ENERGIA     MODIFY (ID_NIVEL_ENERGIA     DEFAULT SEQ_NIVELES_ENERGIA.NEXTVAL);
ALTER TABLE TIPOS_VIVIENDA      MODIFY (ID_TIPO_VIVIENDA     DEFAULT SEQ_TIPOS_VIVIENDA.NEXTVAL);
ALTER TABLE TIEMPOS_DISPONIBLES MODIFY (ID_TIEMPO_DISPONIBLE DEFAULT SEQ_TIEMPOS_DISPONIBLES.NEXTVAL);


-- ---------------------------------------------------------------------
-- 2. NIVEL para el motor de match.
--    Se agrega sin NOT NULL, se llenan los valores existentes y
--    después se vuelve obligatoria.
-- ---------------------------------------------------------------------

-- Tamaños: tamaño del animal
ALTER TABLE TAMANIOS ADD (NIVEL NUMBER(1));
UPDATE TAMANIOS SET NIVEL = 1 WHERE ID_TAMANIO = 1;   -- PEQUENO
UPDATE TAMANIOS SET NIVEL = 2 WHERE ID_TAMANIO = 2;   -- MEDIANO
UPDATE TAMANIOS SET NIVEL = 3 WHERE ID_TAMANIO = 3;   -- GRANDE
ALTER TABLE TAMANIOS MODIFY (NIVEL NOT NULL);
ALTER TABLE TAMANIOS ADD CONSTRAINT CK_TAMANIO_NIVEL CHECK (NIVEL BETWEEN 1 AND 3);

-- Niveles de energía: actividad que necesita el animal
ALTER TABLE NIVELES_ENERGIA ADD (NIVEL NUMBER(1));
UPDATE NIVELES_ENERGIA SET NIVEL = 1 WHERE ID_NIVEL_ENERGIA = 1;   -- BAJO
UPDATE NIVELES_ENERGIA SET NIVEL = 2 WHERE ID_NIVEL_ENERGIA = 2;   -- MEDIO
UPDATE NIVELES_ENERGIA SET NIVEL = 3 WHERE ID_NIVEL_ENERGIA = 3;   -- ALTO
ALTER TABLE NIVELES_ENERGIA MODIFY (NIVEL NOT NULL);
ALTER TABLE NIVELES_ENERGIA ADD CONSTRAINT CK_NIVENE_NIVEL CHECK (NIVEL BETWEEN 1 AND 3);

-- Tiempos disponibles: tiempo que puede dedicar el adoptante
ALTER TABLE TIEMPOS_DISPONIBLES ADD (NIVEL NUMBER(1));
UPDATE TIEMPOS_DISPONIBLES SET NIVEL = 1 WHERE ID_TIEMPO_DISPONIBLE = 1;   -- POCO
UPDATE TIEMPOS_DISPONIBLES SET NIVEL = 2 WHERE ID_TIEMPO_DISPONIBLE = 2;   -- MODERADO
UPDATE TIEMPOS_DISPONIBLES SET NIVEL = 3 WHERE ID_TIEMPO_DISPONIBLE = 3;   -- MUCHO
ALTER TABLE TIEMPOS_DISPONIBLES MODIFY (NIVEL NOT NULL);
ALTER TABLE TIEMPOS_DISPONIBLES ADD CONSTRAINT CK_TIEDIS_NIVEL CHECK (NIVEL BETWEEN 1 AND 3);

-- Tipos de vivienda: espacio disponible
ALTER TABLE TIPOS_VIVIENDA ADD (NIVEL NUMBER(1));
UPDATE TIPOS_VIVIENDA SET NIVEL = 3 WHERE ID_TIPO_VIVIENDA = 1;   -- CASA
UPDATE TIPOS_VIVIENDA SET NIVEL = 2 WHERE ID_TIPO_VIVIENDA = 2;   -- APARTAMENTO
ALTER TABLE TIPOS_VIVIENDA MODIFY (NIVEL NOT NULL);
ALTER TABLE TIPOS_VIVIENDA ADD CONSTRAINT CK_TIPVIV_NIVEL CHECK (NIVEL BETWEEN 1 AND 3);


-- ---------------------------------------------------------------------
-- 3. Opción "Otro" en vivienda y tiempo.
--    El índice único condicional permite UNA sola opción "Otro"
--    por catálogo (Oracle ignora los NULL en índices únicos).
-- ---------------------------------------------------------------------

ALTER TABLE TIPOS_VIVIENDA ADD (ES_OTRO CHAR(1) DEFAULT 'N' NOT NULL);
ALTER TABLE TIPOS_VIVIENDA ADD CONSTRAINT CK_TIPVIV_OTRO CHECK (ES_OTRO IN ('S','N'));
CREATE UNIQUE INDEX UX_TIPVIV_UNA_OPCION_OTRO
  ON TIPOS_VIVIENDA (CASE WHEN ES_OTRO = 'S' THEN 'S' END);

ALTER TABLE TIEMPOS_DISPONIBLES ADD (ES_OTRO CHAR(1) DEFAULT 'N' NOT NULL);
ALTER TABLE TIEMPOS_DISPONIBLES ADD CONSTRAINT CK_TIEDIS_OTRO CHECK (ES_OTRO IN ('S','N'));
CREATE UNIQUE INDEX UX_TIEDIS_UNA_OPCION_OTRO
  ON TIEMPOS_DISPONIBLES (CASE WHEN ES_OTRO = 'S' THEN 'S' END);


-- ---------------------------------------------------------------------
-- 4. Datos nuevos. Tipos de vivienda basados en la clasificación del
--    censo del DANE, adaptados a la adopción. El ID lo pone la secuencia.
-- ---------------------------------------------------------------------

INSERT INTO TIPOS_VIVIENDA (NOMBRE, NIVEL) VALUES ('HABITACION', 1);
INSERT INTO TIPOS_VIVIENDA (NOMBRE, NIVEL) VALUES ('FINCA', 3);
INSERT INTO TIPOS_VIVIENDA (NOMBRE, NIVEL, ES_OTRO) VALUES ('OTRO', 2, 'S');

INSERT INTO TIEMPOS_DISPONIBLES (NOMBRE, NIVEL, ES_OTRO) VALUES ('OTRO', 2, 'S');
