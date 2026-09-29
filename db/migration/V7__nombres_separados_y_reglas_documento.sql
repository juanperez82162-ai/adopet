-- =====================================================================
-- ADOPET - V7: nombre separado en sus partes, reglas de formato por
-- tipo de documento y restricciones de formato en USUARIOS.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Reglas de formato de cada tipo de documento
-- ---------------------------------------------------------------------

ALTER TABLE TIPOS_DOCUMENTO ADD (
  SOLO_NUMEROS  CHAR(1)    DEFAULT 'N' NOT NULL,
  LARGO_MINIMO  NUMBER(2)  DEFAULT 5   NOT NULL,
  LARGO_MAXIMO  NUMBER(2)  DEFAULT 20  NOT NULL
);

ALTER TABLE TIPOS_DOCUMENTO ADD CONSTRAINT CK_TIPDOC_SOLO_NUMEROS
  CHECK (SOLO_NUMEROS IN ('S','N'));

ALTER TABLE TIPOS_DOCUMENTO ADD CONSTRAINT CK_TIPDOC_LARGOS
  CHECK (LARGO_MINIMO >= 1 AND LARGO_MAXIMO <= 20 AND LARGO_MINIMO <= LARGO_MAXIMO);

UPDATE TIPOS_DOCUMENTO
   SET SOLO_NUMEROS = 'S', LARGO_MINIMO = 6, LARGO_MAXIMO = 10
 WHERE ID_TIPO_DOCUMENTO IN (1, 2);

UPDATE TIPOS_DOCUMENTO
   SET SOLO_NUMEROS = 'N', LARGO_MINIMO = 5, LARGO_MAXIMO = 20
 WHERE ID_TIPO_DOCUMENTO = 4;


-- ---------------------------------------------------------------------
-- 2. Nombre separado en primer nombre, segundo nombre y apellidos
-- ---------------------------------------------------------------------

ALTER TABLE USUARIOS ADD (
  PRIMER_NOMBRE     VARCHAR2(60),
  SEGUNDO_NOMBRE    VARCHAR2(60),
  PRIMER_APELLIDO   VARCHAR2(60),
  SEGUNDO_APELLIDO  VARCHAR2(60)
);

UPDATE USUARIOS
   SET PRIMER_NOMBRE   = SUBSTR(REGEXP_SUBSTR(TRIM(NOMBRE), '^[^ ]+'), 1, 30),
       PRIMER_APELLIDO = NVL(
                           SUBSTR(TRIM(SUBSTR(TRIM(NOMBRE), INSTR(TRIM(NOMBRE) || ' ', ' '))), 1, 30),
                           'Sin apellido'
                         );

ALTER TABLE USUARIOS MODIFY (
  PRIMER_NOMBRE    NOT NULL,
  PRIMER_APELLIDO  NOT NULL
);

ALTER TABLE USUARIOS DROP COLUMN NOMBRE;


-- ---------------------------------------------------------------------
-- 3. Restricciones de formato en USUARIOS
--    ENABLE NOVALIDATE: se aplican a toda fila nueva o modificada, sin
--    rechazar los usuarios de prueba que ya existían.
-- ---------------------------------------------------------------------

ALTER TABLE USUARIOS ADD CONSTRAINT CK_USUARIO_DOCUMENTO
  CHECK (REGEXP_LIKE(DOCUMENTO, '^[A-Z0-9]{5,20}$')) ENABLE NOVALIDATE;

ALTER TABLE USUARIOS ADD CONSTRAINT CK_USUARIO_TELEFONO
  CHECK (REGEXP_LIKE(TELEFONO, '^(3[0-9]{9}|60[0-9]{8})$')) ENABLE NOVALIDATE;

ALTER TABLE USUARIOS ADD CONSTRAINT CK_USUARIO_CORREO
  CHECK (REGEXP_LIKE(CORREO, '^[^@ ]+@[^@ ]+\.[^@ ]+$')) ENABLE NOVALIDATE;

ALTER TABLE USUARIOS ADD CONSTRAINT CK_USUARIO_PRIMER_NOMBRE
  CHECK (REGEXP_LIKE(PRIMER_NOMBRE, '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$')) ENABLE NOVALIDATE;

ALTER TABLE USUARIOS ADD CONSTRAINT CK_USUARIO_SEGUNDO_NOMBRE
  CHECK (REGEXP_LIKE(SEGUNDO_NOMBRE, '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$')) ENABLE NOVALIDATE;

ALTER TABLE USUARIOS ADD CONSTRAINT CK_USUARIO_PRIMER_APELLIDO
  CHECK (REGEXP_LIKE(PRIMER_APELLIDO, '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$')) ENABLE NOVALIDATE;

ALTER TABLE USUARIOS ADD CONSTRAINT CK_USUARIO_SEGUNDO_APELLIDO
  CHECK (REGEXP_LIKE(SEGUNDO_APELLIDO, '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$')) ENABLE NOVALIDATE;
