-- =====================================================================
-- ADOPET - V17: triggers (Fase 8).
--
-- Solo lo que ninguna restriccion (CHECK, UNIQUE, FK) puede expresar:
-- normalizar el texto, comparar contra SYSDATE y consultar otras tablas.
-- Parten del borrador de Valeria (db/ADOPET-triger-borrador.sql).
--
-- Codigos de error (RAISE_APPLICATION_ERROR), uno por tabla:
--   MASCOTAS 201xx / PERFILES 202xx / SEGUIMIENTOS 203xx /
--   USUARIOS 205xx / SOLICITUDES 206xx / RESPUESTAS_SEGUIMIENTO 207xx
-- =====================================================================


-- =====================================================================
-- MASCOTAS
-- =====================================================================

CREATE OR REPLACE TRIGGER TRG_MASCOTAS_VALIDAR_INSERT
BEFORE INSERT ON MASCOTAS
FOR EACH ROW
BEGIN
    -- 1. Nombre
    :NEW.NOMBRE := TRIM(:NEW.NOMBRE);

    IF :NEW.NOMBRE IS NULL THEN
        RAISE_APPLICATION_ERROR(-20101,
            'El nombre de la mascota es obligatorio.');
    END IF;

    IF LENGTH(:NEW.NOMBRE) > 50 THEN
        RAISE_APPLICATION_ERROR(-20102,
            'El nombre no puede superar los 50 caracteres.');
    END IF;

    IF NOT REGEXP_LIKE(
        :NEW.NOMBRE,
        '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+)*$'
    ) THEN
        RAISE_APPLICATION_ERROR(-20103,
            'El nombre contiene caracteres no permitidos.');
    END IF;

    -- 2. Raza
    IF :NEW.ID_RAZA IS NULL OR :NEW.ID_RAZA <= 0 THEN
        RAISE_APPLICATION_ERROR(-20104,
            'Debe seleccionar una raza válida.');
    END IF;

    -- 3. Edad al ingreso
    IF :NEW.EDAD_MESES_INGRESO IS NULL
       OR :NEW.EDAD_MESES_INGRESO <= 0 THEN
        RAISE_APPLICATION_ERROR(-20105,
            'La edad de ingreso debe ser mayor que cero meses.');
    END IF;

    -- 4. Tamaño
    IF :NEW.ID_TAMANIO IS NULL OR :NEW.ID_TAMANIO <= 0 THEN
        RAISE_APPLICATION_ERROR(-20106,
            'Debe seleccionar un tamaño válido.');
    END IF;

    -- 5. Sexo
    IF :NEW.ID_SEXO IS NULL OR :NEW.ID_SEXO <= 0 THEN
        RAISE_APPLICATION_ERROR(-20107,
            'Debe seleccionar un sexo válido.');
    END IF;

    -- 6. Nivel de energía
    IF :NEW.ID_NIVEL_ENERGIA IS NULL
       OR :NEW.ID_NIVEL_ENERGIA <= 0 THEN
        RAISE_APPLICATION_ERROR(-20108,
            'Debe seleccionar un nivel de energía válido.');
    END IF;

    -- 7. Compatibilidad con niños
    IF :NEW.COMPATIBLE_NINOS IS NULL THEN
        RAISE_APPLICATION_ERROR(-20109,
            'Debe indicar si la mascota es compatible con niños.');
    END IF;

    :NEW.COMPATIBLE_NINOS := UPPER(TRIM(:NEW.COMPATIBLE_NINOS));

    IF :NEW.COMPATIBLE_NINOS NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20110,
            'COMPATIBLE_NINOS solo admite S o N.');
    END IF;

    -- 8. Compatibilidad con otras mascotas
    IF :NEW.COMPATIBLE_OTRAS_MASCOTAS IS NULL THEN
        RAISE_APPLICATION_ERROR(-20111,
            'Debe indicar si es compatible con otras mascotas.');
    END IF;

    :NEW.COMPATIBLE_OTRAS_MASCOTAS := UPPER(TRIM(:NEW.COMPATIBLE_OTRAS_MASCOTAS));

    IF :NEW.COMPATIBLE_OTRAS_MASCOTAS NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20112,
            'COMPATIBLE_OTRAS_MASCOTAS solo admite S o N.');
    END IF;

    -- 9. Necesidades especiales
    IF :NEW.TIENE_NECESIDADES_ESPECIALES IS NULL THEN
        RAISE_APPLICATION_ERROR(-20113,
            'Debe indicar si la mascota tiene necesidades especiales.');
    END IF;

    :NEW.TIENE_NECESIDADES_ESPECIALES := UPPER(TRIM(:NEW.TIENE_NECESIDADES_ESPECIALES));

    IF :NEW.TIENE_NECESIDADES_ESPECIALES NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20114,
            'TIENE_NECESIDADES_ESPECIALES solo admite S o N.');
    END IF;

    -- 10. Descripción de las necesidades
    IF :NEW.DESCRIPCION_NECESIDADES IS NOT NULL THEN
        :NEW.DESCRIPCION_NECESIDADES := TRIM(:NEW.DESCRIPCION_NECESIDADES);
    END IF;

    IF LENGTH(:NEW.DESCRIPCION_NECESIDADES) > 500 THEN
        RAISE_APPLICATION_ERROR(-20116,
            'La descripción de necesidades no puede superar 500 caracteres.');
    END IF;

    -- 11. Fecha de ingreso
    IF :NEW.FECHA_INGRESO IS NULL THEN
        :NEW.FECHA_INGRESO := SYSDATE;
    END IF;

    IF :NEW.FECHA_INGRESO > SYSDATE THEN
        RAISE_APPLICATION_ERROR(-20117,
            'La fecha de ingreso no puede ser futura.');
    END IF;

    -- 12. Fecha de salida
    IF :NEW.FECHA_SALIDA IS NOT NULL
       AND :NEW.FECHA_SALIDA < :NEW.FECHA_INGRESO THEN
        RAISE_APPLICATION_ERROR(-20118,
            'La fecha de salida no puede ser anterior al ingreso.');
    END IF;

    IF :NEW.FECHA_SALIDA > SYSDATE THEN
        RAISE_APPLICATION_ERROR(-20119,
            'La fecha de salida no puede ser futura.');
    END IF;

    -- 13. Estado: el staff solo registra mascotas DISPONIBLES o EN_TRATAMIENTO;
    -- los demas estados los pone el sistema al avanzar una adopcion.
    IF :NEW.ID_ESTADO_MASCOTA IS NULL THEN
        :NEW.ID_ESTADO_MASCOTA := 1;
    ELSIF :NEW.ID_ESTADO_MASCOTA <= 0 THEN
        RAISE_APPLICATION_ERROR(-20120,
            'El estado de la mascota debe tener un ID válido.');
    END IF;

    IF :NEW.ID_ESTADO_MASCOTA NOT IN (1, 2) THEN
        RAISE_APPLICATION_ERROR(-20122,
            'Una mascota nueva solo puede ingresar como DISPONIBLE o EN_TRATAMIENTO.');
    END IF;

    -- 14. Activo
    IF :NEW.ACTIVO IS NULL THEN
        :NEW.ACTIVO := 'S';
    ELSE
        :NEW.ACTIVO := UPPER(TRIM(:NEW.ACTIVO));
    END IF;

    IF :NEW.ACTIVO NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20121,
            'El campo ACTIVO solo admite S o N.');
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_UPDATE_MASCOTAS
BEFORE UPDATE ON MASCOTAS
FOR EACH ROW
BEGIN
    :NEW.NOMBRE := TRIM(:NEW.NOMBRE);

    IF :NEW.NOMBRE IS NULL THEN
        RAISE_APPLICATION_ERROR(-20131,
            'El nombre de la mascota no puede estar vacío.');
    END IF;

    IF :NEW.EDAD_MESES_INGRESO <= 0 THEN
        RAISE_APPLICATION_ERROR(-20132,
            'La edad de la mascota debe ser mayor que cero.');
    END IF;

    IF :NEW.COMPATIBLE_NINOS NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20133,
            'La compatibilidad con niños debe ser S o N.');
    END IF;

    IF :NEW.COMPATIBLE_OTRAS_MASCOTAS NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20134,
            'La compatibilidad con otras mascotas debe ser S o N.');
    END IF;

    IF :NEW.TIENE_NECESIDADES_ESPECIALES NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20135,
            'Las necesidades especiales deben indicarse con S o N.');
    END IF;

    IF :NEW.ACTIVO NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20136,
            'El estado activo debe ser S o N.');
    END IF;

    IF :NEW.DESCRIPCION_NECESIDADES IS NOT NULL THEN
        :NEW.DESCRIPCION_NECESIDADES := TRIM(:NEW.DESCRIPCION_NECESIDADES);
    END IF;

    IF LENGTH(:NEW.DESCRIPCION_NECESIDADES) > 500 THEN
        RAISE_APPLICATION_ERROR(-20137,
            'La descripción de necesidades no puede superar 500 caracteres.');
    END IF;

    IF :NEW.FECHA_SALIDA > SYSDATE THEN
        RAISE_APPLICATION_ERROR(-20138,
            'La fecha de salida no puede ser futura.');
    END IF;
END;
/


-- =====================================================================
-- PERFILES
-- =====================================================================

CREATE OR REPLACE TRIGGER TRG_PERFILES_VALIDAR_INSERT
BEFORE INSERT ON PERFILES
FOR EACH ROW
BEGIN
    IF :NEW.ID_ROL IS NULL OR :NEW.ID_ROL <= 0 THEN
        RAISE_APPLICATION_ERROR(-20201,
            'El ID del rol es obligatorio y debe ser positivo.');
    END IF;

    :NEW.NOMBRE_PERFIL := TRIM(:NEW.NOMBRE_PERFIL);

    IF :NEW.NOMBRE_PERFIL IS NULL THEN
        RAISE_APPLICATION_ERROR(-20202,
            'El nombre del perfil es obligatorio.');
    END IF;

    IF LENGTH(:NEW.NOMBRE_PERFIL) > 50 THEN
        RAISE_APPLICATION_ERROR(-20203,
            'El nombre del perfil no puede superar los 50 caracteres.');
    END IF;

    IF NOT REGEXP_LIKE(
        :NEW.NOMBRE_PERFIL,
        '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+([ _-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+)*$'
    ) THEN
        RAISE_APPLICATION_ERROR(-20204,
            'El nombre del perfil solo puede contener letras, números, espacios, guiones y guiones bajos.');
    END IF;

    IF :NEW.ACTIVO IS NULL THEN
        :NEW.ACTIVO := 'S';
    ELSE
        :NEW.ACTIVO := UPPER(TRIM(:NEW.ACTIVO));
    END IF;

    IF :NEW.ACTIVO NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20205,
            'El campo ACTIVO solo puede contener S o N.');
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_UPDATE_PERFILES
BEFORE UPDATE ON PERFILES
FOR EACH ROW
BEGIN
    :NEW.NOMBRE_PERFIL := TRIM(:NEW.NOMBRE_PERFIL);

    IF :NEW.NOMBRE_PERFIL IS NULL THEN
        RAISE_APPLICATION_ERROR(-20211,
            'El nombre del perfil no puede estar vacío.');
    END IF;

    IF LENGTH(:NEW.NOMBRE_PERFIL) > 50 THEN
        RAISE_APPLICATION_ERROR(-20212,
            'El nombre del perfil no puede superar los 50 caracteres.');
    END IF;

    IF :NEW.ACTIVO NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20213,
            'El estado del perfil debe ser S o N.');
    END IF;

    IF :NEW.ID_ROL <= 0 THEN
        RAISE_APPLICATION_ERROR(-20214,
            'El ID del rol debe ser mayor que cero.');
    END IF;
END;
/


-- =====================================================================
-- USUARIOS
-- =====================================================================

CREATE OR REPLACE TRIGGER TRG_USUARIOS_VALIDAR_INSERT
BEFORE INSERT ON USUARIOS
FOR EACH ROW
BEGIN
    :NEW.DOCUMENTO       := UPPER(TRIM(:NEW.DOCUMENTO));
    :NEW.PRIMER_NOMBRE   := TRIM(:NEW.PRIMER_NOMBRE);
    :NEW.SEGUNDO_NOMBRE  := TRIM(:NEW.SEGUNDO_NOMBRE);
    :NEW.PRIMER_APELLIDO := TRIM(:NEW.PRIMER_APELLIDO);
    :NEW.SEGUNDO_APELLIDO := TRIM(:NEW.SEGUNDO_APELLIDO);
    :NEW.CORREO          := TRIM(:NEW.CORREO);
    :NEW.TELEFONO        := TRIM(:NEW.TELEFONO);
    :NEW.DIRECCION       := TRIM(:NEW.DIRECCION);

    IF :NEW.DOCUMENTO IS NULL
       OR NOT REGEXP_LIKE(:NEW.DOCUMENTO, '^[A-Z0-9]{5,20}$') THEN
        RAISE_APPLICATION_ERROR(-20521,
            'El documento debe tener entre 5 y 20 caracteres alfanuméricos.');
    END IF;

    IF :NEW.PRIMER_NOMBRE IS NULL
       OR NOT REGEXP_LIKE(
           :NEW.PRIMER_NOMBRE,
           '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       ) THEN
        RAISE_APPLICATION_ERROR(-20522,
            'El primer nombre es obligatorio y solo debe contener letras, espacios, apóstrofes o guiones.');
    END IF;

    IF :NEW.SEGUNDO_NOMBRE IS NOT NULL
       AND NOT REGEXP_LIKE(
           :NEW.SEGUNDO_NOMBRE,
           '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       ) THEN
        RAISE_APPLICATION_ERROR(-20523,
            'El segundo nombre contiene caracteres no permitidos.');
    END IF;

    IF :NEW.PRIMER_APELLIDO IS NULL
       OR NOT REGEXP_LIKE(
           :NEW.PRIMER_APELLIDO,
           '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       ) THEN
        RAISE_APPLICATION_ERROR(-20524,
            'El primer apellido es obligatorio y contiene caracteres no permitidos.');
    END IF;

    IF :NEW.SEGUNDO_APELLIDO IS NOT NULL
       AND NOT REGEXP_LIKE(
           :NEW.SEGUNDO_APELLIDO,
           '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       ) THEN
        RAISE_APPLICATION_ERROR(-20525,
            'El segundo apellido contiene caracteres no permitidos.');
    END IF;

    IF :NEW.CORREO IS NULL
       OR NOT REGEXP_LIKE(:NEW.CORREO, '^[^@ ]+@[^@ ]+\.[^@ ]+$') THEN
        RAISE_APPLICATION_ERROR(-20526,
            'Ingrese un correo electrónico válido.');
    END IF;

    IF :NEW.TELEFONO IS NULL
       OR NOT REGEXP_LIKE(:NEW.TELEFONO, '^(3[0-9]{9}|60[0-9]{8})$') THEN
        RAISE_APPLICATION_ERROR(-20527,
            'El teléfono debe tener un formato colombiano válido.');
    END IF;

    IF :NEW.DIRECCION IS NULL OR LENGTH(:NEW.DIRECCION) = 0 THEN
        RAISE_APPLICATION_ERROR(-20528,
            'La dirección es obligatoria.');
    END IF;

    IF :NEW.ACTIVO IS NULL THEN
        :NEW.ACTIVO := 'S';
    END IF;

    IF :NEW.ACTIVO NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20529,
            'El estado ACTIVO solo admite S o N.');
    END IF;

    -- Mayoría de edad: ningún CHECK puede usar SYSDATE.
    IF :NEW.FECHA_NACIMIENTO IS NULL THEN
        RAISE_APPLICATION_ERROR(-20530,
            'La fecha de nacimiento es obligatoria.');
    END IF;

    IF :NEW.FECHA_NACIMIENTO > ADD_MONTHS(TRUNC(SYSDATE), -216) THEN
        RAISE_APPLICATION_ERROR(-20531,
            'Debes ser mayor de 18 años para registrarte.');
    END IF;

    IF :NEW.FECHA_REGISTRO IS NULL THEN
        :NEW.FECHA_REGISTRO := SYSDATE;
    END IF;

    IF :NEW.FECHA_REGISTRO > SYSDATE THEN
        RAISE_APPLICATION_ERROR(-20532,
            'La fecha de registro no puede ser futura.');
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_USUARIOS_VALIDAR_UPDATE
BEFORE UPDATE ON USUARIOS
FOR EACH ROW
BEGIN
    IF :NEW.DOCUMENTO <> :OLD.DOCUMENTO THEN
        RAISE_APPLICATION_ERROR(-20501,
            'No se permite modificar el documento del usuario.');
    END IF;

    IF :NEW.DOCUMENTO IS NULL
       OR NOT REGEXP_LIKE(:NEW.DOCUMENTO, '^[A-Z0-9]{5,20}$') THEN
        RAISE_APPLICATION_ERROR(-20502,
            'El documento debe tener entre 5 y 20 caracteres alfanuméricos en mayúscula.');
    END IF;

    IF :NEW.PRIMER_NOMBRE IS NULL
       OR NOT REGEXP_LIKE(
           TRIM(:NEW.PRIMER_NOMBRE),
           '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       ) THEN
        RAISE_APPLICATION_ERROR(-20503,
            'El primer nombre es obligatorio y solo debe contener letras, espacios, apóstrofes o guiones.');
    END IF;

    IF :NEW.SEGUNDO_NOMBRE IS NOT NULL
       AND NOT REGEXP_LIKE(
           TRIM(:NEW.SEGUNDO_NOMBRE),
           '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       ) THEN
        RAISE_APPLICATION_ERROR(-20504,
            'El segundo nombre contiene caracteres no permitidos.');
    END IF;

    IF :NEW.PRIMER_APELLIDO IS NULL
       OR NOT REGEXP_LIKE(
           TRIM(:NEW.PRIMER_APELLIDO),
           '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       ) THEN
        RAISE_APPLICATION_ERROR(-20505,
            'El primer apellido es obligatorio y contiene caracteres no permitidos.');
    END IF;

    IF :NEW.SEGUNDO_APELLIDO IS NOT NULL
       AND NOT REGEXP_LIKE(
           TRIM(:NEW.SEGUNDO_APELLIDO),
           '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       ) THEN
        RAISE_APPLICATION_ERROR(-20506,
            'El segundo apellido contiene caracteres no permitidos.');
    END IF;

    IF :NEW.CORREO IS NULL
       OR NOT REGEXP_LIKE(TRIM(:NEW.CORREO), '^[^@ ]+@[^@ ]+\.[^@ ]+$') THEN
        RAISE_APPLICATION_ERROR(-20507,
            'Ingrese un correo electrónico válido.');
    END IF;

    IF :NEW.TELEFONO IS NULL
       OR NOT REGEXP_LIKE(:NEW.TELEFONO, '^(3[0-9]{9}|60[0-9]{8})$') THEN
        RAISE_APPLICATION_ERROR(-20508,
            'El teléfono debe tener un formato colombiano válido.');
    END IF;

    IF :NEW.DIRECCION IS NULL OR LENGTH(TRIM(:NEW.DIRECCION)) = 0 THEN
        RAISE_APPLICATION_ERROR(-20509,
            'La dirección es obligatoria.');
    END IF;

    IF :NEW.ACTIVO IS NULL OR :NEW.ACTIVO NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20510,
            'El estado ACTIVO solo admite S o N.');
    END IF;

    IF :NEW.FECHA_NACIMIENTO IS NULL
       OR TRUNC(:NEW.FECHA_NACIMIENTO) >= TRUNC(SYSDATE) THEN
        RAISE_APPLICATION_ERROR(-20511,
            'La fecha de nacimiento debe ser anterior al día actual.');
    END IF;

    IF :NEW.FECHA_REGISTRO IS NULL OR :NEW.FECHA_REGISTRO > SYSDATE THEN
        RAISE_APPLICATION_ERROR(-20512,
            'La fecha de registro no puede ser futura.');
    END IF;
END;
/


-- =====================================================================
-- SOLICITUDES_ADOPCION
-- =====================================================================

CREATE OR REPLACE TRIGGER TRG_SOLICITUDES_VALIDAR_INSERT
BEFORE INSERT ON SOLICITUDES_ADOPCION
FOR EACH ROW
DECLARE
    v_adoptable NUMBER;
BEGIN
    -- Toda solicitud nace en estado SOLICITUD (1).
    IF :NEW.ID_ESTADO_PROCESO IS NULL THEN
        :NEW.ID_ESTADO_PROCESO := 1;
    END IF;

    IF :NEW.ID_ESTADO_PROCESO <> 1 THEN
        RAISE_APPLICATION_ERROR(-20611,
            'Una solicitud nueva siempre nace en estado SOLICITUD.');
    END IF;

    -- La mascota debe seguir en el albergue y admitir solicitudes.
    SELECT COUNT(*)
      INTO v_adoptable
      FROM MASCOTAS m
      JOIN ESTADOS_MASCOTA em ON em.ID_ESTADO_MASCOTA = m.ID_ESTADO_MASCOTA
     WHERE m.ID_MASCOTA = :NEW.ID_MASCOTA
       AND m.ACTIVO = 'S'
       AND em.ES_ADOPTABLE = 'S';

    IF v_adoptable = 0 THEN
        RAISE_APPLICATION_ERROR(-20612,
            'La mascota no está disponible para recibir solicitudes de adopción.');
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_SOLICITUDES_VALIDAR_UPDATE
BEFORE UPDATE ON SOLICITUDES_ADOPCION
FOR EACH ROW
DECLARE
    v_existe          NUMBER;
    v_estado_mascota  NUMBER;
    v_dias_periodo    NUMBER;
BEGIN
    IF :NEW.ID_ESTADO_PROCESO <> :OLD.ID_ESTADO_PROCESO THEN

        -- 1. Una solicitud cerrada nunca se reactiva.
        IF :OLD.ID_ESTADO_PROCESO >= 4 THEN
            RAISE_APPLICATION_ERROR(-20601,
                'Una solicitud cerrada no se puede reactivar.');
        END IF;

        -- 2. Solo se permiten los pasos del ciclo de vida.
        IF NOT (   (:OLD.ID_ESTADO_PROCESO = 1 AND :NEW.ID_ESTADO_PROCESO IN (2, 7, 8, 9))
                OR (:OLD.ID_ESTADO_PROCESO = 2 AND :NEW.ID_ESTADO_PROCESO IN (3, 6, 7, 8, 9))
                OR (:OLD.ID_ESTADO_PROCESO = 3 AND :NEW.ID_ESTADO_PROCESO IN (4, 5))) THEN
            RAISE_APPLICATION_ERROR(-20602,
                'Ese cambio de estado no está permitido en el ciclo de la solicitud.');
        END IF;

        -- 3. La mascota debe estar en el estado que corresponde:
        --    ACTIVO -> EN_PROCESO, EN_PRUEBA -> EN_PRUEBA, FINALIZADO -> ADOPTADA.
        IF :NEW.ID_ESTADO_PROCESO IN (2, 3, 4) THEN
            v_estado_mascota := CASE :NEW.ID_ESTADO_PROCESO
                                    WHEN 2 THEN 3
                                    WHEN 3 THEN 4
                                    ELSE 5
                                END;

            SELECT COUNT(*)
              INTO v_existe
              FROM MASCOTAS
             WHERE ID_MASCOTA = :NEW.ID_MASCOTA
               AND ID_ESTADO_MASCOTA = v_estado_mascota;

            IF v_existe = 0 THEN
                RAISE_APPLICATION_ERROR(-20603,
                    'La mascota no está en el estado que exige este paso de la solicitud.');
            END IF;
        END IF;

        -- 4. La adopción solo se confirma cuando el periodo de prueba se cumplió.
        IF :NEW.ID_ESTADO_PROCESO = 4 THEN
            SELECT MAX(DIAS_DESDE_ENTREGA)
              INTO v_dias_periodo
              FROM ETAPAS_SEGUIMIENTO
             WHERE ACTIVO = 'S';

            IF :NEW.FECHA_ENTREGA IS NULL
               OR SYSDATE < :NEW.FECHA_ENTREGA + v_dias_periodo THEN
                RAISE_APPLICATION_ERROR(-20604,
                    'El periodo de prueba todavía no se cumple.');
            END IF;
        END IF;
    END IF;

    -- 5. Quien formaliza o cierra debe ser del staff.
    IF :NEW.DOCUMENTO_STAFF_INICIO IS NOT NULL
       AND (:OLD.DOCUMENTO_STAFF_INICIO IS NULL
            OR :NEW.DOCUMENTO_STAFF_INICIO <> :OLD.DOCUMENTO_STAFF_INICIO) THEN
        SELECT COUNT(*)
          INTO v_existe
          FROM USUARIOS u
          JOIN PERFILES p ON p.ID_PERFIL = u.ID_PERFIL
          JOIN ROLES r ON r.ID_ROL = p.ID_ROL
         WHERE u.DOCUMENTO = :NEW.DOCUMENTO_STAFF_INICIO
           AND r.NOMBRE_ROL = 'STAFF';

        IF v_existe = 0 THEN
            RAISE_APPLICATION_ERROR(-20605,
                'Quien formaliza la solicitud debe ser parte del staff.');
        END IF;
    END IF;

    IF :NEW.DOCUMENTO_STAFF_CIERRE IS NOT NULL
       AND (:OLD.DOCUMENTO_STAFF_CIERRE IS NULL
            OR :NEW.DOCUMENTO_STAFF_CIERRE <> :OLD.DOCUMENTO_STAFF_CIERRE) THEN
        SELECT COUNT(*)
          INTO v_existe
          FROM USUARIOS u
          JOIN PERFILES p ON p.ID_PERFIL = u.ID_PERFIL
          JOIN ROLES r ON r.ID_ROL = p.ID_ROL
         WHERE u.DOCUMENTO = :NEW.DOCUMENTO_STAFF_CIERRE
           AND r.NOMBRE_ROL = 'STAFF';

        IF v_existe = 0 THEN
            RAISE_APPLICATION_ERROR(-20606,
                'Quien cierra la solicitud debe ser parte del staff.');
        END IF;
    END IF;
END;
/


-- =====================================================================
-- SEGUIMIENTOS
-- =====================================================================

CREATE OR REPLACE TRIGGER TRG_SEGUIMIENTOS_VALIDAR_INSERT
BEFORE INSERT ON SEGUIMIENTOS
FOR EACH ROW
DECLARE
    v_en_prueba NUMBER;
BEGIN
    IF :NEW.ID_SOLICITUD IS NULL OR :NEW.ID_SOLICITUD <= 0 THEN
        RAISE_APPLICATION_ERROR(-20301,
            'El ID de la solicitud es obligatorio y debe ser positivo.');
    END IF;

    IF :NEW.ID_ETAPA IS NULL OR :NEW.ID_ETAPA <= 0 THEN
        RAISE_APPLICATION_ERROR(-20302,
            'El ID de la etapa es obligatorio y debe ser positivo.');
    END IF;

    IF :NEW.FECHA_PROGRAMADA IS NULL THEN
        RAISE_APPLICATION_ERROR(-20303,
            'La fecha programada del seguimiento es obligatoria.');
    END IF;

    -- El checkpoint nace agendado y vacío: se responde después.
    IF :NEW.FECHA_RESPUESTA IS NOT NULL
       OR :NEW.PUNTAJE IS NOT NULL
       OR :NEW.ID_SEMAFORO IS NOT NULL
       OR :NEW.SOLICITA_CONTACTO IS NOT NULL THEN
        RAISE_APPLICATION_ERROR(-20304,
            'Un seguimiento nuevo nace sin respuesta.');
    END IF;

    IF :NEW.COMENTARIO IS NOT NULL THEN
        :NEW.COMENTARIO := TRIM(:NEW.COMENTARIO);

        IF LENGTH(:NEW.COMENTARIO) = 0 THEN
            :NEW.COMENTARIO := NULL;
        END IF;
    END IF;

    IF LENGTH(:NEW.COMENTARIO) > 500 THEN
        RAISE_APPLICATION_ERROR(-20307,
            'El comentario no puede superar los 500 caracteres.');
    END IF;

    -- Solo se agendan checkpoints de adopciones en periodo de prueba.
    SELECT COUNT(*)
      INTO v_en_prueba
      FROM SOLICITUDES_ADOPCION
     WHERE ID_SOLICITUD = :NEW.ID_SOLICITUD
       AND ID_ESTADO_PROCESO = 3;

    IF v_en_prueba = 0 THEN
        RAISE_APPLICATION_ERROR(-20305,
            'Solo se programan seguimientos de adopciones en periodo de prueba.');
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_UPDATE_SEGUIMIENTOS
BEFORE UPDATE ON SEGUIMIENTOS
FOR EACH ROW
DECLARE
    v_respuestas NUMBER;
    v_preguntas  NUMBER;
BEGIN
    IF :NEW.FECHA_PROGRAMADA IS NULL THEN
        RAISE_APPLICATION_ERROR(-20321,
            'La fecha programada es obligatoria.');
    END IF;

    -- El puntaje es el promedio de opciones de 1 a 4.
    IF :NEW.PUNTAJE IS NOT NULL
       AND (:NEW.PUNTAJE < 1 OR :NEW.PUNTAJE > 4) THEN
        RAISE_APPLICATION_ERROR(-20322,
            'El puntaje debe estar entre 1 y 4.');
    END IF;

    IF :NEW.COMENTARIO IS NOT NULL THEN
        :NEW.COMENTARIO := TRIM(:NEW.COMENTARIO);
    END IF;

    IF LENGTH(:NEW.COMENTARIO) > 500 THEN
        RAISE_APPLICATION_ERROR(-20323,
            'El comentario no puede superar los 500 caracteres.');
    END IF;

    IF :NEW.FECHA_RESPUESTA > SYSDATE THEN
        RAISE_APPLICATION_ERROR(-20324,
            'La fecha de respuesta no puede ser futura.');
    END IF;

    IF :NEW.FECHA_RESPUESTA IS NOT NULL THEN
        IF :NEW.SOLICITA_CONTACTO IS NULL THEN
            RAISE_APPLICATION_ERROR(-20325,
                'Debe indicar si solicita contacto.');
        END IF;

        IF :NEW.PUNTAJE IS NULL THEN
            RAISE_APPLICATION_ERROR(-20326,
                'Debe ingresar un puntaje para registrar la respuesta.');
        END IF;

        IF :NEW.ID_SEMAFORO IS NULL THEN
            RAISE_APPLICATION_ERROR(-20327,
                'Debe seleccionar un semáforo para registrar la respuesta.');
        END IF;
    END IF;

    -- Al responder, el checkpoint debe traer una respuesta por cada pregunta activa.
    IF :OLD.FECHA_RESPUESTA IS NULL AND :NEW.FECHA_RESPUESTA IS NOT NULL THEN
        SELECT COUNT(*)
          INTO v_respuestas
          FROM RESPUESTAS_SEGUIMIENTO
         WHERE ID_SEGUIMIENTO = :NEW.ID_SEGUIMIENTO;

        SELECT COUNT(*)
          INTO v_preguntas
          FROM PREGUNTAS_CHECKPOINT
         WHERE ACTIVO = 'S';

        IF v_respuestas <> v_preguntas THEN
            RAISE_APPLICATION_ERROR(-20328,
                'El seguimiento debe tener una respuesta por cada pregunta.');
        END IF;
    END IF;

    -- Un checkpoint respondido es historia: ya no se modifica.
    IF :OLD.FECHA_RESPUESTA IS NOT NULL
       AND (   :NEW.FECHA_RESPUESTA IS NULL
            OR :NEW.FECHA_RESPUESTA <> :OLD.FECHA_RESPUESTA
            OR :NEW.PUNTAJE IS NULL
            OR :NEW.PUNTAJE <> :OLD.PUNTAJE
            OR :NEW.ID_SEMAFORO IS NULL
            OR :NEW.ID_SEMAFORO <> :OLD.ID_SEMAFORO
            OR :NEW.SOLICITA_CONTACTO IS NULL
            OR :NEW.SOLICITA_CONTACTO <> :OLD.SOLICITA_CONTACTO
            OR NVL(:NEW.COMENTARIO, '~') <> NVL(:OLD.COMENTARIO, '~')) THEN
        RAISE_APPLICATION_ERROR(-20329,
            'Un seguimiento respondido no se puede modificar.');
    END IF;
END;
/


-- =====================================================================
-- RESPUESTAS_SEGUIMIENTO
-- =====================================================================

CREATE OR REPLACE TRIGGER TRG_RESPUESTAS_VALIDAR_INSERT
BEFORE INSERT ON RESPUESTAS_SEGUIMIENTO
FOR EACH ROW
DECLARE
    v_abierto NUMBER;
BEGIN
    -- Solo se responde un checkpoint sin responder de una adopción en prueba.
    SELECT COUNT(*)
      INTO v_abierto
      FROM SEGUIMIENTOS s
      JOIN SOLICITUDES_ADOPCION so ON so.ID_SOLICITUD = s.ID_SOLICITUD
     WHERE s.ID_SEGUIMIENTO = :NEW.ID_SEGUIMIENTO
       AND s.FECHA_RESPUESTA IS NULL
       AND so.ID_ESTADO_PROCESO = 3;

    IF v_abierto = 0 THEN
        RAISE_APPLICATION_ERROR(-20701,
            'Este seguimiento ya fue respondido o su adopción ya no está en periodo de prueba.');
    END IF;
END;
/
