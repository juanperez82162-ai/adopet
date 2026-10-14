CREATE OR REPLACE TRIGGER TRG_MASCOTAS_VALIDAR_INSERT
BEFORE INSERT ON MASCOTAS
FOR EACH ROW
BEGIN
    -- 1. Validar el nombre de la mascota
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

    -- 2. Validar la raza
    IF :NEW.ID_RAZA IS NULL OR :NEW.ID_RAZA <= 0 THEN
        RAISE_APPLICATION_ERROR(-20104,
            'Debe seleccionar una raza válida.');
    END IF;

    -- 3. Validar la edad en meses al ingreso
    IF :NEW.EDAD_MESES_INGRESO IS NULL
       OR :NEW.EDAD_MESES_INGRESO <= 0 THEN
        RAISE_APPLICATION_ERROR(-20105,
            'La edad de ingreso debe ser mayor que cero meses.');
    END IF;

    -- 4. Validar el tamaño
    IF :NEW.ID_TAMANIO IS NULL OR :NEW.ID_TAMANIO <= 0 THEN
        RAISE_APPLICATION_ERROR(-20106,
            'Debe seleccionar un tamaño válido.');
    END IF;

    -- 5. Validar el sexo
    IF :NEW.ID_SEXO IS NULL OR :NEW.ID_SEXO <= 0 THEN
        RAISE_APPLICATION_ERROR(-20107,
            'Debe seleccionar un sexo válido.');
    END IF;

    -- 6. Validar el nivel de energía
    IF :NEW.ID_NIVEL_ENERGIA IS NULL
       OR :NEW.ID_NIVEL_ENERGIA <= 0 THEN
        RAISE_APPLICATION_ERROR(-20108,
            'Debe seleccionar un nivel de energía válido.');
    END IF;

    -- 7. Validar compatibilidad con niños
    IF :NEW.COMPATIBLE_NINOS IS NULL THEN
        RAISE_APPLICATION_ERROR(-20109,
            'Debe indicar si la mascota es compatible con niños.');
    END IF;

    :NEW.COMPATIBLE_NINOS :=
        UPPER(TRIM(:NEW.COMPATIBLE_NINOS));

    IF :NEW.COMPATIBLE_NINOS NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20110,
            'COMPATIBLE_NINOS solo admite S o N.');
    END IF;

    -- 8. Validar compatibilidad con otras mascotas
    IF :NEW.COMPATIBLE_OTRAS_MASCOTAS IS NULL THEN
        RAISE_APPLICATION_ERROR(-20111,
            'Debe indicar si es compatible con otras mascotas.');
    END IF;

    :NEW.COMPATIBLE_OTRAS_MASCOTAS :=
        UPPER(TRIM(:NEW.COMPATIBLE_OTRAS_MASCOTAS));

    IF :NEW.COMPATIBLE_OTRAS_MASCOTAS NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20112,
            'COMPATIBLE_OTRAS_MASCOTAS solo admite S o N.');
    END IF;

    -- 9. Validar necesidades especiales
    IF :NEW.TIENE_NECESIDADES_ESPECIALES IS NULL THEN
        RAISE_APPLICATION_ERROR(-20113,
            'Debe indicar si la mascota tiene necesidades especiales.');
    END IF;

    :NEW.TIENE_NECESIDADES_ESPECIALES :=
        UPPER(TRIM(:NEW.TIENE_NECESIDADES_ESPECIALES));

    IF :NEW.TIENE_NECESIDADES_ESPECIALES NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20114,
            'TIENE_NECESIDADES_ESPECIALES solo admite S o N.');
    END IF;

    -- 10. Validar descripción de necesidades especiales
    IF :NEW.DESCRIPCION_NECESIDADES IS NOT NULL THEN
        :NEW.DESCRIPCION_NECESIDADES :=
            TRIM(:NEW.DESCRIPCION_NECESIDADES);
    END IF;

    IF :NEW.TIENE_NECESIDADES_ESPECIALES = 'S'
       AND :NEW.DESCRIPCION_NECESIDADES IS NULL THEN
        RAISE_APPLICATION_ERROR(-20115,
            'Debe describir las necesidades especiales de la mascota.');
    END IF;

    IF :NEW.DESCRIPCION_NECESIDADES IS NOT NULL
       AND LENGTH(:NEW.DESCRIPCION_NECESIDADES) > 500 THEN
        RAISE_APPLICATION_ERROR(-20116,
            'La descripción de necesidades no puede superar 500 caracteres.');
    END IF;

    -- 11. Validar fecha de ingreso
    IF :NEW.FECHA_INGRESO IS NULL THEN
        :NEW.FECHA_INGRESO := SYSDATE;
    END IF;

    IF :NEW.FECHA_INGRESO > SYSDATE THEN
        RAISE_APPLICATION_ERROR(-20117,
            'La fecha de ingreso no puede ser futura.');
    END IF;

    -- 12. Validar fecha de salida
    IF :NEW.FECHA_SALIDA IS NOT NULL
       AND :NEW.FECHA_SALIDA < :NEW.FECHA_INGRESO THEN
        RAISE_APPLICATION_ERROR(-20118,
            'La fecha de salida no puede ser anterior al ingreso.');
    END IF;

    IF :NEW.FECHA_SALIDA > SYSDATE THEN
        RAISE_APPLICATION_ERROR(-20119,
            'La fecha de salida no puede ser futura.');
    END IF;

    -- 13. Validar estado de la mascota
    IF :NEW.ID_ESTADO_MASCOTA IS NULL THEN
        :NEW.ID_ESTADO_MASCOTA := 1;
    ELSIF :NEW.ID_ESTADO_MASCOTA <= 0 THEN
        RAISE_APPLICATION_ERROR(-20120,
            'El estado de la mascota debe tener un ID válido.');
    END IF;

    -- 14. Validar campo ACTIVO
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

COMMIT;


SELECT TRIGGER_NAME, STATUS
FROM USER_TRIGGERS
WHERE TABLE_NAME = 'MASCOTAS';

--PRUEBA DE TRIGGER--

INSERT INTO MASCOTAS (
    NOMBRE,
    ID_RAZA,
    EDAD_MESES_INGRESO,
    ID_TAMANIO,
    ID_SEXO,
    ID_NIVEL_ENERGIA,
    COMPATIBLE_NINOS,
    COMPATIBLE_OTRAS_MASCOTAS,
    TIENE_NECESIDADES_ESPECIALES,
    DESCRIPCION_NECESIDADES,
    ID_ESTADO_MASCOTA,
    ACTIVO
)
VALUES (
    'BRUNO',
    1,
    20,
    2,
    1,
    2,
    'S',
    'S',
    'N',
    NULL,
    1,
    'S'
);

SELECT * 
FROM MASCOTAS;



--TRIGER DE MI PERFIL--

CREATE OR REPLACE TRIGGER TRG_PERFILES_VALIDAR_INSERT
BEFORE INSERT ON PERFILES
FOR EACH ROW
BEGIN
    -- 1. Validar el ID del rol
    IF :NEW.ID_ROL IS NULL OR :NEW.ID_ROL <= 0 THEN
        RAISE_APPLICATION_ERROR(-20201,
            'El ID del rol es obligatorio y debe ser positivo.');
    END IF;

    -- 2. Validar el nombre del perfil
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

    -- 3. Validar el estado ACTIVO
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

--prbar trigger--

INSERT INTO PERFILES (
    ID_ROL,
    NOMBRE_PERFIL,
    ACTIVO
)
VALUES (
    2,
    'vetadisimo',
    'N'
);


-- SEGUIMIENTOS--

CREATE OR REPLACE TRIGGER TRG_SEGUIMIENTOS_VALIDAR_INSERT
BEFORE INSERT ON SEGUIMIENTOS
FOR EACH ROW
BEGIN
    -- 1. Validar el ID de la solicitud
    IF :NEW.ID_SOLICITUD IS NULL
       OR :NEW.ID_SOLICITUD <= 0 THEN
        RAISE_APPLICATION_ERROR(-20301,
            'El ID de la solicitud es obligatorio y debe ser positivo.');
    END IF;

    -- 2. Validar el ID de la etapa
    IF :NEW.ID_ETAPA IS NULL
       OR :NEW.ID_ETAPA <= 0 THEN
        RAISE_APPLICATION_ERROR(-20302,
            'El ID de la etapa es obligatorio y debe ser positivo.');
    END IF;

    -- 3. Validar la fecha programada
      IF :NEW.FECHA_PROGRAMADA IS NULL THEN
        RAISE_APPLICATION_ERROR(-20303,
            'La fecha programada del seguimiento es obligatoria.');
    END IF;

    IF :NEW.FECHA_RESPUESTA > SYSDATE THEN
        RAISE_APPLICATION_ERROR(-20305,
            'La fecha de respuesta no puede ser futura.');
    END IF;

    -- 5. Validar si se solicita contacto
    IF :NEW.SOLICITA_CONTACTO IS NOT NULL THEN
        :NEW.SOLICITA_CONTACTO :=
            UPPER(TRIM(:NEW.SOLICITA_CONTACTO));
    END IF;

    IF :NEW.SOLICITA_CONTACTO NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(-20306,
            'SOLICITA_CONTACTO solo admite S o N.');
    END IF;

    -- 6. Validar el comentario
    IF :NEW.COMENTARIO IS NOT NULL THEN
        :NEW.COMENTARIO := TRIM(:NEW.COMENTARIO);
    END IF;

    IF :NEW.COMENTARIO IS NOT NULL
       AND LENGTH(:NEW.COMENTARIO) > 500 THEN
        RAISE_APPLICATION_ERROR(-20307,
            'El comentario no puede superar los 500 caracteres, elimina si tiene espacios al inicio a al final.');
    END IF;

    -- 7. Validar el puntaje
    IF :NEW.PUNTAJE IS NOT NULL THEN
        IF :NEW.PUNTAJE < 0 OR :NEW.PUNTAJE > 5 THEN
            RAISE_APPLICATION_ERROR(-20308,
                'El puntaje debe estar entre 0 y 5.');
        END IF;

        IF :NEW.PUNTAJE <> ROUND(:NEW.PUNTAJE, 2) THEN
            RAISE_APPLICATION_ERROR(-20309,
                'El puntaje solo puede tener dos decimales.');
        END IF;
    END IF;

    -- 8. Validar el semáforo
    IF :NEW.ID_SEMAFORO IS NOT NULL
       AND :NEW.ID_SEMAFORO <= 0 THEN
        RAISE_APPLICATION_ERROR(-20310,
            'El ID del semáforo debe ser positivo.');
    END IF;

    -- 9. Validar que un seguimiento respondido tenga sus datos
    IF :NEW.FECHA_RESPUESTA IS NOT NULL THEN

        IF :NEW.SOLICITA_CONTACTO IS NULL THEN
            RAISE_APPLICATION_ERROR(-20311,
                'Debe indicar si solicita contacto para registrar la respuesta.');
        END IF;

        IF :NEW.PUNTAJE IS NULL THEN
            RAISE_APPLICATION_ERROR(-20312,
                'Debe registrar un puntaje para un seguimiento respondido.');
        END IF;

        IF :NEW.ID_SEMAFORO IS NULL THEN
            RAISE_APPLICATION_ERROR(-20313,
                'Debe seleccionar un semáforo para un seguimiento respondido.');
        END IF;

    END IF;

END;
/

--prueba--

INSERT INTO SEGUIMIENTOS (
    ID_SOLICITUD,
    ID_ETAPA,
    FECHA_PROGRAMADA,
    fecha_respuesta,
    SOLICITA_CONTACTO,
    COMENTARIO,
    puntaje,
    id_semaforo
)
VALUES (
    1,
    1,
    TO_DATE('09/09/2026', 'DD/MM/YYYY'),
    TO_DATE('11/09/2026', 'DD/MM/YYYY'),
    'N',
    'Seguimiento inicial de la adopción.',
    '10',
    1
);

COMMIT;

--LLENAR TABLA DE SOLICITUDES ADOCPION PARA CREAR EL TRIGGER DE SOLICITUDES


INSERT INTO SOLICITUDES_ADOPCION (
    DOCUMENTO,
    ID_TIPO_VIVIENDA,
    TIPO_VIVIENDA_OTRO,
    TIENE_ESPACIO_EXTERIOR,
    ID_TIEMPO_DISPONIBLE,
    TIEMPO_DISPONIBLE_OTRO,
    EXPERIENCIA_PREVIA,
    EXPERIENCIA_PREVIA_OBSERVACIONES,
    DISPUESTO_NECESIDADES_ESPECIALES,
    TIENE_NINOS_HOGAR,
    TIENE_OTRAS_MASCOTAS_HOGAR,
    TIENE_OTRAS_MASCOTAS_HOGAR_OBSERVACIONES,
    FECHA_ENVIO,
    ID_ESTADO_PROCESO,
    OBSERVACIONES
) VALUES (
    '123456789',
    1,
    NULL,
    'S',
    2,
    NULL,
    'S',
    'Ha tenido perros anteriormente.',
    'S',
    'N',
    'N',
    NULL,
    TRUNC(SYSDATE),
    1,
    'Solicitud recibida y pendiente de evaluacion.'
);

-- SOLICITUD 3: PROCESO CON ENTREGA REGISTRADA


INSERT INTO SOLICITUDES_ADOPCION (
    DOCUMENTO,
    ID_TIPO_VIVIENDA,
    TIPO_VIVIENDA_OTRO,
    TIENE_ESPACIO_EXTERIOR,
    ID_TIEMPO_DISPONIBLE,
    TIEMPO_DISPONIBLE_OTRO,
    EXPERIENCIA_PREVIA,
    EXPERIENCIA_PREVIA_OBSERVACIONES,
    DISPUESTO_NECESIDADES_ESPECIALES,
    TIENE_NINOS_HOGAR,
    TIENE_OTRAS_MASCOTAS_HOGAR,
    TIENE_OTRAS_MASCOTAS_HOGAR_OBSERVACIONES,
    FECHA_ENVIO,
    ID_MASCOTA,
    DOCUMENTO_STAFF_INICIO,
    FECHA_INICIO,
    FECHA_VENCIMIENTO,
    FECHA_ENTREGA,
    ID_ESTADO_PROCESO,
    DOCUMENTO_STAFF_CIERRE,
    OBSERVACIONES
) VALUES (
    '123456789',
    1,
    NULL,
    'N',
    1,
    NULL,
    'S',
    'Experiencia previa con gatos.',
    'N',
    'N',
    'S',
    'Convive con un gato adulto.',
    TO_DATE('08/09/2026', 'DD/MM/YYYY'),
    3,
    '132658746',
    TO_DATE('09/09/2026', 'DD/MM/YYYY'),
    TO_DATE('15/09/2026', 'DD/MM/YYYY'),
    TO_DATE('09/09/2026', 'DD/MM/YYYY'),
    2,
    '1001234567',
    'Mascota entregada. Requiere seguimiento postadopcion.'
);

COMMIT;

COMMIT;

-- CONSULTAR LAS SOLICITUDES CREADAS

SELECT
    ID_SOLICITUD,
    DOCUMENTO,
    ID_MASCOTA,
    FECHA_ENVIO,
    FECHA_INICIO,
    FECHA_VENCIMIENTO,
    FECHA_ENTREGA,
    ID_ESTADO_PROCESO,
    OBSERVACIONES
FROM SOLICITUDES_ADOPCION
ORDER BY ID_SOLICITUD;

--TRIGGER SEGUIMIENTO

CREATE OR REPLACE TRIGGER TRG_SEGUIMIENTOS_VALIDAR_INSERT
BEFORE INSERT ON SEGUIMIENTOS
FOR EACH ROW
BEGIN
    -- 1. Validar ID_SOLICITUD
    IF :NEW.ID_SOLICITUD IS NULL
       OR :NEW.ID_SOLICITUD <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20401,
            'El ID de la solicitud debe ser mayor que cero.'
        );
    END IF;

    -- 2. Validar ID_ETAPA
    IF :NEW.ID_ETAPA IS NULL
       OR :NEW.ID_ETAPA <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20402,
            'El ID de la etapa debe ser mayor que cero.'
        );
    END IF;

    -- 3. Validar fecha programada
    IF :NEW.FECHA_PROGRAMADA IS NULL THEN
        RAISE_APPLICATION_ERROR(
            -20403,
            'La fecha programada es obligatoria.'
        );
    END IF;

    -- Debe ser una fecha posterior al dia actual
    IF TRUNC(:NEW.FECHA_PROGRAMADA) <= TRUNC(SYSDATE) THEN
        RAISE_APPLICATION_ERROR(
            -20404,
            'La fecha programada debe ser posterior al dia actual.'
        );
    END IF;

    -- 5. Validar si solicita contacto
    IF :NEW.SOLICITA_CONTACTO IS NOT NULL
       AND :NEW.SOLICITA_CONTACTO NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(
            -20407,
            'SOLICITA_CONTACTO solo admite S o N.'
        );
    END IF;

    -- 6. Validar comentario
    IF :NEW.COMENTARIO IS NOT NULL THEN
        :NEW.COMENTARIO := TRIM(:NEW.COMENTARIO);

        IF LENGTH(:NEW.COMENTARIO) = 0 THEN
            :NEW.COMENTARIO := NULL;
        END IF;
    END IF;

    -- 7. Validar puntaje
    IF :NEW.PUNTAJE IS NOT NULL THEN
        IF :NEW.PUNTAJE < 0 OR :NEW.PUNTAJE > 5 THEN
            RAISE_APPLICATION_ERROR(
                -20408,
                'El puntaje debe estar entre 0 y 5.'
            );
        END IF;

        IF :NEW.PUNTAJE * 100 <> TRUNC(:NEW.PUNTAJE * 100) THEN
            RAISE_APPLICATION_ERROR(
                -20409,
                'El puntaje admite como maximo dos decimales.'
            );
        END IF;
    END IF;

    -- 8. Validar ID_SEMAFORO
    IF :NEW.ID_SEMAFORO IS NOT NULL
       AND :NEW.ID_SEMAFORO <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20410,
            'El ID del semaforo debe ser mayor que cero.'
        );
    END IF;

    -- 9. Si ya respondio, exigir todos los datos de respuesta
    IF :NEW.FECHA_RESPUESTA IS NOT NULL THEN
        IF :NEW.SOLICITA_CONTACTO IS NULL
           OR :NEW.PUNTAJE IS NULL
           OR :NEW.ID_SEMAFORO IS NULL THEN
            RAISE_APPLICATION_ERROR(
                -20411,
                'Una respuesta debe incluir contacto, puntaje y semaforo.'
            );
        END IF;
    END IF;

END;
/

INSERT INTO SEGUIMIENTOS (
    ID_SOLICITUD,
    ID_ETAPA,
    FECHA_PROGRAMADA,
    FECHA_RESPUESTA,
    SOLICITA_CONTACTO,
    COMENTARIO,
    PUNTAJE,
    ID_SEMAFORO
) VALUES (
    2,
    2,
    TO_DATE('12/10/2026', 'DD/MM/YYYY'),
    TO_DATE('12/10/2026', 'DD/MM/YYYY'),
    'N',
    NULL,
    '4',
    2
);
-- INSERT 1: SEMAFORO VERDE
INSERT INTO SEMAFOROS (
    ID_SEMAFORO,
    NOMBRE,
    PUNTAJE_MIN,
    PUNTAJE_MAX,
    ACTIVO
) VALUES (
    1,
    'VERDE',
    4.00,
    5.00,
    'S'
);

-- INSERT 2: SEMAFORO ROJO
INSERT INTO SEMAFOROS (
    ID_SEMAFORO,
    NOMBRE,
    PUNTAJE_MIN,
    PUNTAJE_MAX,
    ACTIVO
) VALUES (
    2,
    'ROJO',
    0.00,
    2.99,
    'S'
);

COMMIT;
SELECT * FROM TIPOS_VIVIENDA;
SELECT * FROM TIEMPOS_DISPONIBLES;
SELECT * FROM MASCOTAS;
SELECT * FROM ESTADOS_PROCESO;
SELECT * FROM USUARIOS;
SELECT * FROM SEGUIMIENTOS;

---TRIGGER UPDATE USUARIO

CREATE OR REPLACE TRIGGER TRG_USUARIOS_VALIDAR_UPDATE
BEFORE UPDATE ON USUARIOS
FOR EACH ROW
BEGIN
    -- 1. Evitar modificar el documento
    IF :NEW.DOCUMENTO <> :OLD.DOCUMENTO THEN
        RAISE_APPLICATION_ERROR(
            -20501,
            'No se permite modificar el documento del usuario.'
        );
    END IF;

    -- 2. Validar documento
    IF :NEW.DOCUMENTO IS NULL
       OR NOT REGEXP_LIKE(:NEW.DOCUMENTO, '^[A-Z0-9]{5,20}$') THEN
        RAISE_APPLICATION_ERROR(
            -20502,
            'El documento debe tener entre 5 y 20 caracteres alfanumericos en mayuscula.'
        );
    END IF;

    -- 3. Validar primer nombre
    IF :NEW.PRIMER_NOMBRE IS NULL
       OR NOT REGEXP_LIKE(
           TRIM(:NEW.PRIMER_NOMBRE),
           '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       ) THEN
        RAISE_APPLICATION_ERROR(
            -20503,
            'El primer nombre es obligatorio y solo debe contener letras, espacios, apostrofes o guiones.'
        );
    END IF;

    -- 4. Validar segundo nombre si se proporciona
    IF :NEW.SEGUNDO_NOMBRE IS NOT NULL
       AND NOT REGEXP_LIKE(
           TRIM(:NEW.SEGUNDO_NOMBRE),
           '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       ) THEN
        RAISE_APPLICATION_ERROR(
            -20504,
            'El segundo nombre contiene caracteres no permitidos.'
        );
    END IF;

    -- 5. Validar primer apellido
    IF :NEW.PRIMER_APELLIDO IS NULL
       OR NOT REGEXP_LIKE(
           TRIM(:NEW.PRIMER_APELLIDO),
           '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       ) THEN
        RAISE_APPLICATION_ERROR(
            -20505,
            'El primer apellido es obligatorio y contiene caracteres no permitidos.'
        );
    END IF;

    -- 6. Validar segundo apellido si se proporciona
    IF :NEW.SEGUNDO_APELLIDO IS NOT NULL
       AND NOT REGEXP_LIKE(
           TRIM(:NEW.SEGUNDO_APELLIDO),
           '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ ''-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       ) THEN
        RAISE_APPLICATION_ERROR(
            -20506,
            'El segundo apellido contiene caracteres no permitidos.'
        );
    END IF;

    -- 7. Validar correo
    IF :NEW.CORREO IS NULL
       OR NOT REGEXP_LIKE(
           TRIM(:NEW.CORREO),
           '^[^@ ]+@[^@ ]+\.[^@ ]+$'
       ) THEN
        RAISE_APPLICATION_ERROR(
            -20507,
            'Ingrese un correo electronico valido.'
        );
    END IF;

    -- 8. Validar telefono
    IF :NEW.TELEFONO IS NULL
       OR NOT REGEXP_LIKE(
           :NEW.TELEFONO,
           '^(3[0-9]{9}|60[0-9]{8})$'
       ) THEN
        RAISE_APPLICATION_ERROR(
            -20508,
            'El telefono debe tener un formato colombiano valido.'
        );
    END IF;

    -- 9. Validar direccion
    IF :NEW.DIRECCION IS NULL
       OR LENGTH(TRIM(:NEW.DIRECCION)) = 0 THEN
        RAISE_APPLICATION_ERROR(
            -20509,
            'La direccion es obligatoria.'
        );
    END IF;

    -- 10. Validar estado activo
    IF :NEW.ACTIVO NOT IN ('S', 'N')
       OR :NEW.ACTIVO IS NULL THEN
        RAISE_APPLICATION_ERROR(
            -20510,
            'El estado ACTIVO solo admite S o N.'
        );
    END IF;

    -- 11. Validar fecha de nacimiento
    IF :NEW.FECHA_NACIMIENTO IS NULL
       OR TRUNC(:NEW.FECHA_NACIMIENTO) >= TRUNC(SYSDATE) THEN
        RAISE_APPLICATION_ERROR(
            -20511,
            'La fecha de nacimiento debe ser anterior al dia actual.'
        );
    END IF;

    -- 12. Validar fecha de registro
    IF :NEW.FECHA_REGISTRO IS NULL
       OR :NEW.FECHA_REGISTRO > SYSDATE THEN
        RAISE_APPLICATION_ERROR(
            -20512,
            'La fecha de registro no puede ser futura.'
        );
    END IF;

END;
/

--PROBAR
UPDATE USUARIOS
SET DIRECCION = 'Calle 20 # 15-30'
WHERE DOCUMENTO = '132658746';

UPDATE USUARIOS
SET TELEFONO = '3152308888'
WHERE DOCUMENTO = '13658746';


COMMIT;

--UPDATE MASCOTAS VALIDAR DATOS--

CREATE OR REPLACE TRIGGER TRG_UPDATE_MASCOTAS
BEFORE UPDATE ON MASCOTAS
FOR EACH ROW
BEGIN
    -- Validar y limpiar el nombre
    :NEW.NOMBRE := TRIM(:NEW.NOMBRE);

    IF :NEW.NOMBRE IS NULL THEN
        RAISE_APPLICATION_ERROR(
            -20001,
            'El nombre de la mascota no puede estar vacio.'
        );
    END IF;

    -- Validar la edad
    IF :NEW.EDAD_MESES_INGRESO <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20002,
            'La edad de la mascota debe ser mayor que cero.'
        );
    END IF;

    -- Validar compatibilidad con niños
    IF :NEW.COMPATIBLE_NINOS NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(
            -20003,
            'La compatibilidad con niños debe ser S o N.'
        );
    END IF;

    -- Validar compatibilidad con otras mascotas
    IF :NEW.COMPATIBLE_OTRAS_MASCOTAS NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(
            -20004,
            'La compatibilidad con otras mascotas debe ser S o N.'
        );
    END IF;

    -- Validar necesidades especiales
    IF :NEW.TIENE_NECESIDADES_ESPECIALES NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(
            -20005,
            'Las necesidades especiales deben indicarse con S o N.'
        );
    END IF;

    -- Validar estado activo
    IF :NEW.ACTIVO NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(
            -20006,
            'El estado activo debe ser S o N.'
        );
    END IF;

END;
/

--PRUBEA POSITIVA--
UPDATE MASCOTAS
SET NOMBRE = ' Mia '
WHERE ID_MASCOTA = 1;


--UPDATE VALIDACION DE PERFILES--

CREATE OR REPLACE TRIGGER TRG_UPDATE_PERFILES
BEFORE UPDATE ON PERFILES
FOR EACH ROW
BEGIN
    -- Validar y limpiar el nombre del perfil
    :NEW.NOMBRE_PERFIL := TRIM(:NEW.NOMBRE_PERFIL);

    IF :NEW.NOMBRE_PERFIL IS NULL THEN
        RAISE_APPLICATION_ERROR(
            -20001,
            'El nombre del perfil no puede estar vacio.'
        );
    END IF;

    -- Validar que el nombre no supere los 50 caracteres
    IF LENGTH(:NEW.NOMBRE_PERFIL) > 50 THEN
        RAISE_APPLICATION_ERROR(
            -20002,
            'El nombre del perfil no puede superar los 50 caracteres.'
        );
    END IF;

    -- Validar el estado del perfil
    IF :NEW.ACTIVO NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(
            -20003,
            'El estado del perfil debe ser S o N.'
        );
    END IF;

    -- Validar que el ID del rol sea válido
    IF :NEW.ID_ROL <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20004,
            'El ID del rol debe ser mayor que cero.'
        );
    END IF;

END;
/
--PRUEBA 
UPDATE PERFILES
SET NOMBRE_PERFIL = '  Administrador  '
WHERE ID_PERFIL = 1;

--PRUEBA INVALIDA
UPDATE PERFILES
SET NOMBRE_PERFIL = '    '
WHERE ID_PERFIL = 1;

--UPDATE DE SEGUIMIENTOS

CREATE OR REPLACE TRIGGER TRG_UPDATE_SEGUIMIENTOS
BEFORE UPDATE ON SEGUIMIENTOS
FOR EACH ROW
BEGIN
    -- Validar que la fecha programada exista
    IF :NEW.FECHA_PROGRAMADA IS NULL THEN
        RAISE_APPLICATION_ERROR(
            -20001,
            'La fecha programada es obligatoria.'
        );
    END IF;

    -- Validar que el puntaje esté entre 0 y 5
    IF :NEW.PUNTAJE IS NOT NULL
       AND (:NEW.PUNTAJE < 0 OR :NEW.PUNTAJE > 5) THEN
        RAISE_APPLICATION_ERROR(
            -20004,
            'El puntaje debe estar entre 0 y 5.'
        );
    END IF;

    -- Validar que el comentario no supere 500 caracteres
    IF LENGTH(:NEW.COMENTARIO) > 500 THEN
        RAISE_APPLICATION_ERROR(
            -20005,
            'El comentario no puede superar los 500 caracteres.'
        );
    END IF;

    -- Validar los datos obligatorios al registrar una respuesta
    IF :NEW.FECHA_RESPUESTA IS NOT NULL THEN

        IF :NEW.SOLICITA_CONTACTO IS NULL THEN
            RAISE_APPLICATION_ERROR(
                -20006,
                'Debe indicar si solicita contacto.'
            );
        END IF;

        IF :NEW.PUNTAJE IS NULL THEN
            RAISE_APPLICATION_ERROR(
                -20007,
                'Debe ingresar un puntaje para registrar la respuesta.'
            );
        END IF;



    END IF;

END;
/
--PRUEBA
UPDATE SEGUIMIENTOS
SET PUNTAJE = 8
WHERE ID_SEGUIMIENTO = 1;