# ADOPET — Modelo de datos completo (Fase 0)

**Proyecto pedagógico integrador** — Politécnico Colombiano Jaime Isaza Cadavid
**Docente:** José Ignacio Botero · **Periodo:** 2026-2
**Integrantes:** Juan Sebastián Pérez Morales / Valeria Piedrahita Arbeláez
**Motor:** Oracle XE 21c (Docker, `gvenzl/oracle-xe:21-full`)

**Estado:** 13 tablas cerradas y revisadas. Queda pendiente únicamente la tabla de errores, que se diseña en la Fase 8 cuando el profesor explique triggers.

---

## Índice de tablas

| # | Tabla | Para qué sirve |
|---|---|---|
| 1 | `ROLES` | Los dos tipos de usuario del sistema |
| 2 | `PERFILES` | Niveles dentro de cada rol |
| 3 | `OPCIONES` | Módulos del sistema sobre los que se dan permisos |
| 4 | `PERMISOS` | Una acción concreta sobre un módulo |
| 5 | `PERFILES_PERMISOS` | Qué permisos tiene cada perfil |
| 6 | `USUARIOS` | Cuentas de acceso, comunes a adoptantes y staff |
| 7 | `ADOPTANTES` | Datos adicionales de quien puede adoptar |
| 8 | `MASCOTAS` | Los animales del albergue |
| 9 | `FOTOS_MASCOTAS` | Las fotos de cada animal |
| 10 | `CUESTIONARIOS` | Respuestas de compatibilidad del adoptante |
| 11 | `PROCESOS_ADOPCION` | El proceso formal de adopción, de principio a fin |
| 12 | `SEGUIMIENTOS` | Los tres checkpoints del período de prueba |
| 13 | `NOTIFICACIONES` | Avisos al adoptante y al staff |

---

## Normas de modelado aplicadas

Normas del profesor, aplicadas sin excepción en todo el modelo:

1. Solo los tipos de dato realmente necesarios, nada sobredimensionado ni "raro" sin razón.
2. Nombres de tabla en MAYÚSCULAS y en PLURAL.
3. Estricto con las formas de normalización: ningún dato derivable se guarda dos veces.
4. Tablas intermedias solo si la relación es genuinamente muchos-a-muchos. Si en el fondo es 1:N, va como FK simple.
5. Nunca una llave natural como PK. Siempre PK subrogada `NUMBER GENERATED AS IDENTITY`; el dato natural (documento, correo) va como columna con restricción de unicidad.
6. Tablas intermedias con PK compuesta, salvo que otra tabla necesite referenciar esa fila o que necesite llevar historial.
7. Cada NULL y cada NOT NULL con justificación de negocio real, documentada aquí y **nunca** como comentario dentro del script SQL.

## Convenciones propias del proyecto

- **Booleanos:** `CHAR(1)` con `CHECK IN ('S','N')`. Oracle 21c no admite `BOOLEAN` como tipo de columna, solo dentro de PL/SQL.
- **Catálogos fijos de pocos valores:** van como `CHECK` dentro de la tabla, no como tabla aparte.
- **Columnas de estado:** siempre `CHECK`, sin importar cuántos valores tengan. Un estado describe el ciclo de vida de la propia fila y está amarrado a la lógica del programa; no es un catálogo que alguien administre desde una pantalla. Por eso `PROCESOS_ADOPCION.ESTADO` va como `CHECK` aunque tenga ocho valores.
- **Tablas intermedias:** nombre plural combinado (`PERFILES_PERMISOS`).
- **Fotografías:** ruta de archivo en `VARCHAR2`, nunca `BLOB`.
- **Tamaños de `VARCHAR2` en columnas con `CHECK`:** se dejan con holgura moderada sobre el valor más largo del catálogo, para no obligar a un `ALTER TABLE` cada vez que se agregue un valor nuevo.
- **Reglas que dependen de `SYSDATE`** (mayoría de edad, edad actual de una mascota) no se pueden expresar en un `CHECK`, porque Oracle exige que las restricciones sean deterministas. Se resuelven en el backend y, opcionalmente, con trigger en la Fase 8.

---

# MÓDULO DE ACCESO

Jerarquía del control de acceso:

```
ROLES ──> PERFILES ──> USUARIOS
             │
             └──> PERFILES_PERMISOS <── PERMISOS ──> OPCIONES
```

`USUARIOS` tiene FK únicamente a `PERFILES`, **no a `ROLES`**. El rol de una persona se obtiene por JOIN (`USUARIOS → PERFILES → ROLES`) y normalmente se resuelve una sola vez en el login, o se codifica dentro del JWT. Guardar el rol también en `USUARIOS` sería una dependencia transitiva: un dato derivable almacenado dos veces, que es exactamente lo que la tercera forma normal prohíbe.

---

## 1. ROLES

**Para qué sirve:** define los dos tipos de usuario que existen en el sistema. Es un catálogo cerrado de exactamente dos filas.

| Campo | Tipo | Obligatorio | Qué se diligencia |
|---|---|---|---|
| `ID_ROL` | `NUMBER GENERATED AS IDENTITY` | PK, automático | Lo genera Oracle solo. Nadie lo escribe |
| `NOMBRE_ROL` | `VARCHAR2(30)` | Sí | El nombre del rol. Solo dos valores en la práctica: `ADOPTANTE` o `STAFF` |

**Justificación de `NOMBRE_ROL` NOT NULL y único:** es un catálogo cerrado; cada rol existe una sola vez, y un rol sin nombre no significaría nada.

---

## 2. PERFILES

**Para qué sirve:** define los niveles que pueden existir dentro de un rol. Hoy hay un solo perfil por rol —todos los del staff tienen el mismo nivel, y todos los adoptantes también—, pero la estructura permite agregar perfiles nuevos a futuro, por ejemplo "Voluntario" bajo `STAFF`, sin rediseñar nada.

| Campo | Tipo | Obligatorio | Qué se diligencia |
|---|---|---|---|
| `ID_PERFIL` | `NUMBER GENERATED AS IDENTITY` | PK, automático | Lo genera Oracle solo |
| `ID_ROL` | `NUMBER` (FK → `ROLES`) | Sí | A qué rol pertenece este perfil |
| `NOMBRE_PERFIL` | `VARCHAR2(50)` | Sí | Nombre descriptivo del perfil. Ej: `Adoptante`, `Staff general`, `Voluntario` |

**Justificación de `ID_ROL` NOT NULL:** todo perfil pertenece a un rol, sin excepción. Un perfil huérfano no tendría a quién aplicarse.

---

## 3. OPCIONES

**Para qué sirve:** lista los módulos del sistema sobre los cuales se pueden otorgar permisos. Es la pieza que permite que el control de acceso sea granular y no solo "eres staff, puedes todo".

| Campo | Tipo | Obligatorio | Qué se diligencia |
|---|---|---|---|
| `ID_OPCION` | `NUMBER GENERATED AS IDENTITY` | PK, automático | Lo genera Oracle solo |
| `NOMBRE_OPCION` | `VARCHAR2(50)` | Sí, único | Nombre del módulo |

**Valores que se siembran al crear la base:** `USUARIOS`, `MASCOTAS`, `CUESTIONARIOS`, `PROCESOS_ADOPCION`, `SEGUIMIENTOS`, `NOTIFICACIONES`.

> El diseño anterior tenía una entrada llamada `RESERVAS`. Tras el cambio de flujo de negocio debe sembrarse como `PROCESOS_ADOPCION`.

---

## 4. PERMISOS

**Para qué sirve:** un permiso es *una acción sobre un módulo*. Por ejemplo, "ELIMINAR sobre MASCOTAS" o "CONSULTAR sobre SEGUIMIENTOS". Esta tabla es el catálogo de todas las combinaciones posibles.

| Campo | Tipo | Obligatorio | Qué se diligencia |
|---|---|---|---|
| `ID_PERMISO` | `NUMBER GENERATED AS IDENTITY` | PK, automático | Lo genera Oracle solo |
| `ID_OPCION` | `NUMBER` (FK → `OPCIONES`) | Sí | Sobre qué módulo aplica el permiso |
| `ACCION` | `VARCHAR2(15)` | Sí | Qué se permite hacer: `CREAR`, `CONSULTAR`, `ACTUALIZAR` o `ELIMINAR` |

**Restricción:**

```sql
UNIQUE (ID_OPCION, ACCION)
```

Impide crear dos veces el mismo permiso, por ejemplo dos filas distintas de "ELIMINAR MASCOTAS".

**Justificación del `CHECK` en `ACCION` en vez de una tabla `ACCIONES`:** son cuatro valores fijos que prácticamente nunca cambian. Una tabla aparte para eso sería una tabla intermedia sin justificación real.

---

## 5. PERFILES_PERMISOS

**Para qué sirve:** registra qué permisos tiene asignados cada perfil. Es la tabla que hace posible que el sistema responda "¿este usuario puede eliminar mascotas?".

Es una relación **genuinamente muchos-a-muchos**: un perfil tiene muchos permisos, y un mismo permiso puede estar asignado a varios perfiles.

| Campo | Tipo | Obligatorio | Qué se diligencia |
|---|---|---|---|
| `ID_PERFIL` | `NUMBER` (FK → `PERFILES`) | PK compuesta | El perfil al que se le asigna |
| `ID_PERMISO` | `NUMBER` (FK → `PERMISOS`) | PK compuesta | El permiso que se asigna |

**Justificación de la PK compuesta sin ID aislado:** ninguna otra tabla referencia esta fila, no tiene atributos propios y no lleva historial. Agregarle un `ID_PERFIL_PERMISO` sería una llave de más, y el profesor lo señalaría.

---

## 6. USUARIOS

**Para qué sirve:** guarda la cuenta de acceso al sistema. Es la tabla común a adoptantes y staff: ambos inician sesión aquí, con el mismo mecanismo.

| Campo | Tipo | Obligatorio | Qué se diligencia |
|---|---|---|---|
| `ID_USUARIO` | `NUMBER GENERATED AS IDENTITY` | PK, automático | Lo genera Oracle solo |
| `ID_PERFIL` | `NUMBER` (FK → `PERFILES`) | Sí | Perfil asignado, del cual se deriva el rol |
| `NOMBRE` | `VARCHAR2(100)` | Sí | Nombre completo de la persona |
| `CORREO` | `VARCHAR2(150)` | Sí, único | Correo electrónico, que además es el usuario de login |
| `CONTRASENA_HASH` | `VARCHAR2(255)` | Sí | El hash bcrypt de la contraseña. **Nunca la contraseña en texto plano** |
| `ACTIVO` | `CHAR(1)` | Sí, default `'S'` | Si la cuenta está habilitada. `'S'` o `'N'` |
| `FECHA_REGISTRO` | `DATE` | Sí, default `SYSDATE` | Cuándo se creó la cuenta. Lo pone la base sola |

**Justificaciones:**

- `ID_PERFIL` NOT NULL — todo usuario tiene un perfil. El rol se obtiene por JOIN, no se guarda aquí.
- `NOMBRE` NOT NULL — tanto adoptante como staff necesitan identificarse en el sistema.
- `CORREO` único — es la credencial de login; dos cuentas con el mismo correo harían imposible saber quién está entrando.
- `CONTRASENA_HASH` con 255 caracteres — espacio suficiente para un hash bcrypt con holgura.
- `ACTIVO` — permite desactivar una cuenta sin borrarla físicamente. Borrar un usuario rompería el historial de procesos de adopción ligados a él.

**Restricción de unicidad del correo:**

```sql
CREATE UNIQUE INDEX UX_USUARIOS_CORREO_LOWER ON USUARIOS (LOWER(CORREO));
```

**Por qué un índice funcional y no un `UNIQUE` normal:** Oracle distingue mayúsculas de minúsculas, así que un `UNIQUE` corriente aceptaría `Juan@correo.com` y `juan@correo.com` como dos cuentas diferentes. La misma persona podría registrarse dos veces sin darse cuenta, y después no poder entrar porque escribe su correo de otra forma. Al indexar sobre `LOWER(CORREO)`, la comparación se hace siempre en minúsculas y el duplicado queda bloqueado por el motor.

Este índice **reemplaza** al `UNIQUE` simple: es estrictamente más fuerte, así que declarar los dos sería redundante. El backend debe además normalizar el correo a minúsculas antes de guardarlo, pero el índice es la garantía que no depende de que nadie se acuerde.

---

## 7. ADOPTANTES

**Para qué sirve:** guarda los datos que solo tienen sentido para quien va a adoptar. Un miembro del staff no tiene fila aquí.

Relación **1:1 con `USUARIOS`**. Por eso **no tiene ID propio**: su PK es directamente la FK hacia `USUARIOS`. Agregar un `ID_ADOPTANTE` aparte sería una segunda columna identificando exactamente la misma fila.

| Campo | Tipo | Obligatorio | Qué se diligencia |
|---|---|---|---|
| `ID_USUARIO` | `NUMBER` | PK y FK → `USUARIOS` | Es el mismo identificador del usuario. No se genera uno nuevo |
| `DOCUMENTO` | `VARCHAR2(20)` | Sí | Número de documento de identidad, **sin puntos ni espacios** |
| `TIPO_DOCUMENTO` | `VARCHAR2(15)` | Sí | `CC`, `CE`, `TI` o `PASAPORTE` |
| `TELEFONO` | `VARCHAR2(20)` | Sí | Número de contacto, normalmente el de WhatsApp |
| `DIRECCION` | `VARCHAR2(200)` | Sí | Dirección de residencia |
| `CIUDAD` | `VARCHAR2(80)` | Sí | Ciudad de residencia |
| `FECHA_NACIMIENTO` | `DATE` | Sí | Fecha de nacimiento del adoptante |

**Justificaciones:**

- `DOCUMENTO` como `VARCHAR2` y no `NUMBER` — evita perder ceros a la izquierda y admite letras, como en las cédulas de extranjería.
- `DOCUMENTO` con restricción de unicidad pero **no como PK** — es requisito legal para adoptar, pero como llave natural tiene el problema de la norma 5: puede escribirse de formas distintas, y corregir un error de digitación obligaría a actualizar en cascada todas las tablas hijas.
- `TIPO_DOCUMENTO` NOT NULL — sin él no se puede interpretar correctamente el número. Catálogo fijo de cuatro valores, por eso va como `CHECK`.
- `TELEFONO` NOT NULL — la coordinación real de la adopción ocurre por WhatsApp, fuera del sistema. Sin este dato el proceso no puede continuar, así que es obligatorio desde el registro.
- `DIRECCION` y `CIUDAD` NOT NULL — el alcance del proyecto exige datos de ubicación en el registro validado del adoptante.
- `FECHA_NACIMIENTO` NOT NULL — necesaria para validar la regla de negocio de que solo pueden adoptar mayores de 18 años. Esa validación **no puede hacerse con un `CHECK`** porque Oracle no permite `SYSDATE` dentro de una restricción: se valida en el backend y, opcionalmente, con trigger en la Fase 8.

**Restricción de unicidad del documento:**

```sql
CREATE UNIQUE INDEX UX_ADOPTANTES_DOCUMENTO_NORM
ON ADOPTANTES (TIPO_DOCUMENTO, REPLACE(REPLACE(DOCUMENTO, '.', ''), ' ', ''));
```

Esta restricción resuelve **dos problemas a la vez**:

**Primero, la unicidad debe ser de la pareja tipo + número, no del número solo.** Si `DOCUMENTO` fuera único por sí mismo y existiera un adoptante con cédula `1017234567`, nadie más podría registrarse con un pasaporte que tuviera ese mismo número. Son numeraciones independientes y pueden coincidir legítimamente.

**Segundo, cierra el hueco que el propio profesor usó para justificar sus normas.** Su argumento contra las llaves naturales fue que "un documento puede escribirse de formas distintas, con o sin puntos, y el motor no detectaría el duplicado". Ese problema seguiría vivo con un `UNIQUE` corriente: la base aceptaría sin objeción tanto `1017234567` como `1.017.234.567` como personas diferentes. Al indexar sobre el documento ya normalizado, el motor los reconoce como el mismo.

El backend debe además guardar el documento sin puntos ni espacios. El índice es la red de seguridad para cuando alguien se salte esa normalización.

---

# CATÁLOGO DE MASCOTAS

---

## 8. MASCOTAS

**Para qué sirve:** guarda cada animal del albergue con los atributos que alimentan el motor de match y su situación operativa actual. Es la tabla central del catálogo que ve el adoptante.

| Campo | Tipo | Obligatorio | Qué se diligencia |
|---|---|---|---|
| `ID_MASCOTA` | `NUMBER GENERATED AS IDENTITY` | PK, automático | Lo genera Oracle solo |
| `NOMBRE` | `VARCHAR2(50)` | Sí | Nombre del animal. Ej: `Luna` |
| `ESPECIE` | `VARCHAR2(10)` | Sí | `PERRO` o `GATO` |
| `RAZA` | `VARCHAR2(50)` | Sí | Raza en texto libre. Si se desconoce, se escribe `Mestizo` |
| `EDAD_MESES_INGRESO` | `NUMBER(3)` | Sí | Edad en meses **el día que ingresó al albergue**, no la de hoy |
| `TAMANIO` | `VARCHAR2(10)` | Sí | `PEQUENO`, `MEDIANO` o `GRANDE` |
| `SEXO` | `VARCHAR2(10)` | Sí | `MACHO` o `HEMBRA` |
| `NIVEL_ENERGIA` | `VARCHAR2(10)` | Sí | `BAJO`, `MEDIO` o `ALTO` |
| `COMPATIBLE_NINOS` | `CHAR(1)` | Sí | Si puede convivir con niños. `'S'` o `'N'` |
| `COMPATIBLE_OTRAS_MASCOTAS` | `CHAR(1)` | Sí | Si puede convivir con otras mascotas. `'S'` o `'N'` |
| `TIENE_NECESIDADES_ESPECIALES` | `CHAR(1)` | Sí | Si requiere cuidados especiales. `'S'` o `'N'` |
| `DESCRIPCION_NECESIDADES` | `VARCHAR2(500)` | **No** | En qué consisten esos cuidados. Solo si la anterior es `'S'` |
| `FECHA_INGRESO` | `DATE` | Sí, default `SYSDATE` | Cuándo llegó al albergue |
| `ESTADO` | `VARCHAR2(15)` | Sí, default `'DISPONIBLE'` | Situación operativa actual del animal |
| `MOTIVO_INACTIVA` | `VARCHAR2(200)` | **No** | Por qué se retiró del catálogo. Solo si el estado es `INACTIVA` |

### Los cinco estados de una mascota

| Valor | Qué significa | Quién lo pone |
|---|---|---|
| `DISPONIBLE` | Aparece en el catálogo y en los resultados de match | Por defecto al registrarla |
| `EN_PROCESO` | Hay un proceso formal de adopción en trámite. Deja de aparecer para los demás | El backend, al iniciar el proceso |
| `EN_PRUEBA` | Ya fue entregada y está en el período de prueba de 3 meses. Todavía puede volver | El backend, al registrar la entrega |
| `ADOPTADA` | La adopción se confirmó tras superar el período de prueba. Estado final | El backend, cuando el staff confirma |
| `INACTIVA` | Enfermedad, fallecimiento u otro motivo. No tiene relación con adopciones | **Siempre manual del staff** |

### Justificaciones

- `ESPECIE` como `CHECK` — el alcance limita el sistema a perros y gatos, y es filtro excluyente del motor de match.
- `RAZA` como texto libre y **no como tabla aparte** — la raza no participa en ninguna regla de negocio: no es criterio ponderado ni filtro excluyente del match. Crear un catálogo para un dato puramente informativo sería una tabla injustificada. Siempre hay un valor válido, por eso NOT NULL sin problema.
- `EDAD_MESES_INGRESO` en meses y no en años+meses — una única fuente de verdad evita inconsistencias del tipo `años=0, meses=15`, que serían contradictorias. El frontend decide si muestra "6 meses" o "3 años".
- `EDAD_MESES_INGRESO` guarda la edad **al ingresar**, no la actual — un dato de edad fijo envejece mal: un cachorro que entró con 6 meses seguiría diciendo 6 meses dos años después, salvo que alguien corrigiera manualmente la edad de todos los animales cada cierto tiempo. En la práctica eso no ocurre, y el catálogo termina lleno de "cachorros" adultos. La edad real se calcula así:

  ```
  edad_actual = EDAD_MESES_INGRESO + MONTHS_BETWEEN(SYSDATE, FECHA_INGRESO)
  ```

  El cálculo vive en el backend, igual que la mayoría de edad del adoptante, porque tampoco puede expresarse en un `CHECK`. **La pantalla de registro debe pedir explícitamente "edad al ingresar"**, o el staff registrará la edad de hoy y el cálculo dará números inflados.

- `TAMANIO` — criterio ponderado del match (vivienda/tamaño, 25%).
- `NIVEL_ENERGIA` — criterio ponderado del match (tiempo/energía, 40%).
- `COMPATIBLE_NINOS` y `COMPATIBLE_OTRAS_MASCOTAS` NOT NULL — son filtros excluyentes del match. Dejarlos indefinidos afectaría directamente la seguridad de la adopción.
- `TIENE_NECESIDADES_ESPECIALES` — entra en el criterio ponderado de experiencia (35%).
- `DESCRIPCION_NECESIDADES` **acepta NULL** — solo aplica si `TIENE_NECESIDADES_ESPECIALES = 'S'`; si es `'N'` no hay nada que describir. Y se mantiene opcional **incluso cuando es `'S'`**, porque el staff puede registrar un animal sabiendo que tiene alguna condición antes de que llegue el diagnóstico veterinario completo. Obligarla bloquearía el registro en ese caso real.
- `MOTIVO_INACTIVA` **acepta NULL** — solo aplica cuando `ESTADO = 'INACTIVA'`, pero en ese caso **sí es obligatorio**. Una mascota retirada del catálogo sin explicación no le sirve a nadie: el motivo distingue una enfermedad temporal de un fallecimiento.

### Restricciones

```sql
-- No se puede inactivar una mascota sin decir por qué
CHECK (ESTADO <> 'INACTIVA' OR MOTIVO_INACTIVA IS NOT NULL)

-- Una edad de cero o negativa no existe
CHECK (EDAD_MESES_INGRESO > 0)
```

---

## 9. FOTOS_MASCOTAS

**Para qué sirve:** guarda las fotografías de cada animal. Relación 1:N legítima, que evita columnas repetidas del tipo `FOTO_1`, `FOTO_2`, `FOTO_3` — un diseño que limitaría artificialmente cuántas fotos puede tener un animal.

| Campo | Tipo | Obligatorio | Qué se diligencia |
|---|---|---|---|
| `ID_FOTO` | `NUMBER GENERATED AS IDENTITY` | PK, automático | Lo genera Oracle solo |
| `ID_MASCOTA` | `NUMBER` (FK → `MASCOTAS`) | Sí | De qué animal es la foto |
| `RUTA_ARCHIVO` | `VARCHAR2(255)` | Sí | Ruta del archivo en el servidor. Ej: `/uploads/mascotas/12/foto1.jpg` |
| `ES_PRINCIPAL` | `CHAR(1)` | Sí, default `'N'` | Si es la foto que encabeza la ficha. `'S'` o `'N'` |

**Justificaciones:**

- `RUTA_ARCHIVO` y no `BLOB` — decisión tomada desde el inicio del proyecto: la base guarda la ruta, el archivo vive en el sistema de archivos. Guardar imágenes dentro de la base infla el tamaño, complica los respaldos y no aporta nada.
- `ES_PRINCIPAL` — permite elegir qué foto encabeza la ficha sin depender de un orden implícito de inserción.

**Restricción:**

```sql
CREATE UNIQUE INDEX UX_FOTO_PRINCIPAL_POR_MASCOTA
ON FOTOS_MASCOTAS (CASE WHEN ES_PRINCIPAL = 'S' THEN ID_MASCOTA END);
```

Sin esto, nada impediría marcar tres fotos como principales del mismo animal, y el catálogo mostraría cualquiera de ellas. El índice usa el mismo patrón que los de `PROCESOS_ADOPCION`: Oracle ignora los NULL en índices únicos, así que la restricción solo aplica a las filas marcadas como principales.

> El caso contrario —una mascota sin ninguna foto principal— no se puede resolver desde la base, porque obligaría a que la primera foto insertada ya fuera la principal. Se maneja en el backend.

---

# COMPATIBILIDAD Y ADOPCIÓN

---

## 10. CUESTIONARIOS

**Para qué sirve:** guarda las respuestas del adoptante sobre su situación de vida. Es la materia prima del motor de match: contra estos datos se cruzan los atributos de cada mascota para calcular la compatibilidad.

**Relación 1:N con `ADOPTANTES`, no 1:1.** Una misma persona puede tener varios procesos de adopción a lo largo del tiempo, y sus circunstancias cambian entre uno y otro: antes no tenía hijos, ahora sí; antes vivía en apartamento, ahora en casa. Se necesita el histórico completo, por eso el cuestionario tiene ID propio.

**Todas las columnas de respuesta son NOT NULL.** El cuestionario es obligatorio al 100%: la fila **solo se crea cuando el formulario se completa entero**. Mientras el adoptante lo está llenando, esos datos viven en el frontend. No existe —ni tiene sentido que exista— un cuestionario a medio llenar guardado en la base.

| Campo | Tipo | Obligatorio | Qué se diligencia |
|---|---|---|---|
| `ID_CUESTIONARIO` | `NUMBER GENERATED AS IDENTITY` | PK, automático | Lo genera Oracle solo |
| `ID_USUARIO` | `NUMBER` (FK → `ADOPTANTES`) | Sí | Quién respondió el cuestionario |
| `TIPO_VIVIENDA` | `VARCHAR2(15)` | Sí | `CASA` o `APARTAMENTO` |
| `TIENE_ESPACIO_EXTERIOR` | `CHAR(1)` | Sí | Si tiene patio, terraza o similar. `'S'` o `'N'` |
| `TIEMPO_DISPONIBLE` | `VARCHAR2(10)` | Sí | `POCO`, `MODERADO` o `MUCHO` |
| `EXPERIENCIA_PREVIA` | `VARCHAR2(10)` | Sí | `NINGUNA`, `BASICA` o `AMPLIA` |
| `DISPUESTO_NECESIDADES_ESPECIALES` | `CHAR(1)` | Sí | Si aceptaría una mascota con cuidados especiales. `'S'` o `'N'` |
| `TIENE_NINOS_HOGAR` | `CHAR(1)` | Sí | Si hay niños en la casa. `'S'` o `'N'` |
| `TIENE_OTRAS_MASCOTAS_HOGAR` | `CHAR(1)` | Sí | Si hay otras mascotas en la casa. `'S'` o `'N'` |
| `FECHA_RESPUESTA` | `DATE` | Sí, default `SYSDATE` | Cuándo se respondió. Lo pone la base sola |

**Justificaciones:**

- `TIENE_ESPACIO_EXTERIOR` separado de `TIPO_VIVIENDA` — son hechos atómicos distintos: un apartamento puede tener terraza y una casa puede no tener patio. Combinarlos en un solo campo perdería información real.
- `TIEMPO_DISPONIBLE` — criterio ponderado tiempo/energía (40%), el de mayor peso del match.
- `EXPERIENCIA_PREVIA` y `DISPUESTO_NECESIDADES_ESPECIALES` — criterio ponderado experiencia/necesidades especiales (35%).
- `TIENE_NINOS_HOGAR` y `TIENE_OTRAS_MASCOTAS_HOGAR` — filtros excluyentes; se cruzan contra `MASCOTAS.COMPATIBLE_NINOS` y `MASCOTAS.COMPATIBLE_OTRAS_MASCOTAS`.
- `FECHA_RESPUESTA` — marca temporal de *este* cuestionario específico, clave ahora que hay varios por persona.

**Restricción:**

```sql
UNIQUE (ID_CUESTIONARIO, ID_USUARIO)
```

Técnicamente es redundante, porque `ID_CUESTIONARIO` ya es PK. Existe únicamente porque Oracle exige que toda FK apunte a una restricción única, y `PROCESOS_ADOPCION` necesita referenciar **la pareja** cuestionario+adoptante. Ver la explicación completa en la tabla 11.

---

## 11. PROCESOS_ADOPCION

**Para qué sirve:** registra el proceso formal de adopción completo, desde que el staff lo inicia hasta que la adopción se confirma o fracasa. Es el corazón del sistema: casi todo lo demás cuelga de aquí.

### El flujo de negocio detrás de esta tabla

**Paso 1 — "Me interesa" y visita.** Es puramente conversacional, por WhatsApp. **No queda registrado en el sistema de ninguna forma.** Varias personas pueden mostrar interés o visitar la misma mascota sin que nada se bloquee ni se guarde.

**Paso 2 — Inicio del proceso formal.** Solo cuando, después de la visita, la persona le dice al staff "quiero adoptar a Luna", **el staff** —no el adoptante— inicia el proceso. Recién en ese momento la mascota deja de aparecer disponible. El proceso tiene **15 días** para concretarse, y el staff puede extenderlo antes de que venza.

**Paso 3 — Entrega y período de prueba.** La entrega **no cierra el proceso**: lo pasa a un período de prueba de **3 meses**, durante el cual la adopción todavía puede fracasar y la mascota puede volver al albergue. Los tres checkpoints de `SEGUIMIENTOS` son las revisiones de este período.

**Paso 4 — Cierre.** Cumplidos los 3 meses, **el staff confirma manualmente** que todo estuvo en orden y el proceso queda como exitoso. Que sea manual y no automático permite que alguien revise los checkpoints antes de dar el visto bueno, y resuelve el caso del adoptante que nunca respondió ninguno: el staff ve el silencio y decide qué hacer.

**Un proceso cerrado nunca se reactiva.** Si se venció o se canceló, la persona debe empezar de cero con un proceso nuevo.

### Ciclo de vida

```
ACTIVO ──(entrega)──> EN_PRUEBA ──(staff confirma a los 3 meses)──> FINALIZADO
   │                      │
   │                      └──(la devuelven)──> FALLIDO
   │
   ├── VENCIDO (pasaron los 15 días sin entrega)
   ├── CANCELADO_ADOPTANTE
   ├── CANCELADO_STAFF
   └── CANCELADO_OTROS (causa externa: la mascota enfermó, murió, error administrativo)
```

### Estructura

| Campo | Tipo | Obligatorio | Qué se diligencia |
|---|---|---|---|
| `ID_PROCESO` | `NUMBER GENERATED AS IDENTITY` | PK, automático | Lo genera Oracle solo |
| `ID_MASCOTA` | `NUMBER` (FK → `MASCOTAS`) | Sí | Qué animal se está adoptando |
| `ID_USUARIO` | `NUMBER` (FK → `ADOPTANTES`) | Sí | Quién adopta |
| `ID_CUESTIONARIO` | `NUMBER` (FK → `CUESTIONARIOS`) | Sí | Con qué respuestas se hizo el match que originó este proceso |
| `ID_STAFF_INICIO` | `NUMBER` (FK → `USUARIOS`) | Sí | Qué miembro del staff inició el proceso |
| `FECHA_INICIO` | `DATE` | Sí, default `SYSDATE` | Cuándo se inició el proceso formal |
| `FECHA_VENCIMIENTO` | `DATE` | Sí | Fecha límite del trámite. Se calcula como `FECHA_INICIO + 15` |
| `FECHA_ENTREGA` | `DATE` | **No** | Cuándo se entregó físicamente el animal. Puede ser posterior al cierre del trámite |
| `ESTADO` | `VARCHAR2(20)` | Sí, default `'ACTIVO'` | En qué punto del ciclo está el proceso |
| `ID_STAFF_CIERRE` | `NUMBER` (FK → `USUARIOS`) | **No** | Qué miembro del staff cerró el proceso |
| `FECHA_RESOLUCION` | `DATE` | **No** | Cuándo el proceso llegó a su estado final |
| `OBSERVACIONES` | `VARCHAR2(500)` | **No** | Notas libres del staff sobre el proceso |

### Los ocho estados del proceso

| Valor | Qué significa |
|---|---|
| `ACTIVO` | Trámite en curso, dentro de los 15 días |
| `EN_PRUEBA` | Mascota entregada, corriendo los 3 meses de prueba |
| `FINALIZADO` | El staff confirmó el éxito tras el período de prueba |
| `FALLIDO` | La mascota fue devuelta durante el período de prueba |
| `VENCIDO` | Pasaron los 15 días sin que se concretara la entrega |
| `CANCELADO_ADOPTANTE` | El adoptante desistió antes de la entrega |
| `CANCELADO_STAFF` | El staff decidió no continuar |
| `CANCELADO_OTROS` | Causa externa a ambos: la mascota enfermó, murió, o fue un error administrativo |

**Qué significa exactamente la columna `ESTADO`:** describe **qué originó** el cierre, no quién hizo clic. Siempre hay alguien del staff operando el sistema, incluso cuando el adoptante cancela por teléfono. Con esa definición, los tres valores de cancelación son coherentes entre sí y no se solapan.

> `VARCHAR2(20)` porque `'CANCELADO_ADOPTANTE'` mide 19 caracteres.

### Justificaciones

- `ID_CUESTIONARIO` NOT NULL — deja **congelado** con qué respuestas se originó este proceso. No se deduce del cuestionario más reciente del adoptante: se fija en el momento de crear la fila. Es lo que da el histórico real de "con qué perfil intentó adoptar cada vez".
- `ID_STAFF_INICIO` NOT NULL — el proceso formal solo nace por acción manual de un miembro del staff. Una fila sin ese dato sería imposible en la operación real.
- `FECHA_VENCIMIENTO` NOT NULL — todo proceso nace con fecha límite. Se guarda **la fecha ya calculada**, no la cantidad de días, para que un cambio futuro del plazo no altere procesos en curso. Es la única columna que el staff puede sobrescribir, al extender, y no se conserva el valor anterior.
- `FECHA_ENTREGA` **acepta NULL** — la mayoría de procesos nunca llegan a entrega, porque se vencen o se cancelan antes. Pedirla desde el inicio sería inventar un dato que aún no existe.
- `ID_STAFF_CIERRE` **acepta NULL** — hay cierres donde ningún miembro del staff decide: el vencimiento automático que ejecuta el cron, y la cancelación hecha por el propio adoptante.
- `FECHA_RESOLUCION` **acepta NULL** — solo existe cuando el proceso llega a un estado final; mientras corre, no hay nada que resolver. Es distinta de `FECHA_ENTREGA`: la entrega ocurre al **inicio** del período de prueba, la resolución al **final** del proceso.
- `OBSERVACIONES` **acepta NULL** — nota libre; no todo proceso amerita comentario.

**Por qué dos columnas de staff y no una:** no tienen por qué ser la misma persona. Valeria activa el proceso el lunes y otro compañero lo cancela el viernes. Con una sola columna, guardar al segundo borraría al primero y nadie podría saber después quién había iniciado ese proceso.

### Restricciones

```sql
-- Solo se puede cerrar como "otros" si se explica qué pasó
CHECK (ESTADO <> 'CANCELADO_OTROS' OR OBSERVACIONES IS NOT NULL)

-- Si la mascota salió del albergue, tiene que constar cuándo
CHECK (ESTADO NOT IN ('EN_PRUEBA','FINALIZADO','FALLIDO')
       OR FECHA_ENTREGA IS NOT NULL)

-- Todo proceso cerrado tiene fecha de resolución
CHECK (ESTADO IN ('ACTIVO','EN_PRUEBA') OR FECHA_RESOLUCION IS NOT NULL)

-- El cierre exitoso siempre tiene un responsable del staff
CHECK (ESTADO <> 'FINALIZADO' OR ID_STAFF_CIERRE IS NOT NULL)

-- Coherencia de fechas
CHECK (FECHA_VENCIMIENTO > FECHA_INICIO)
CHECK (FECHA_ENTREGA IS NULL OR FECHA_ENTREGA >= FECHA_INICIO)
```

> El último `CHECK` es intencionalmente flexible: `FECHA_ENTREGA` puede ser posterior a `FECHA_VENCIMIENTO` si el staff extendió el plazo, así que solo se compara contra la fecha de inicio.

**La FK compuesta hacia el cuestionario** — evita el error más grave que podía tener el modelo:

```sql
FOREIGN KEY (ID_CUESTIONARIO, ID_USUARIO)
  REFERENCES CUESTIONARIOS (ID_CUESTIONARIO, ID_USUARIO)
```

Con dos FK independientes, nada impedía crear el proceso de María enlazado a un cuestionario de Pedro: el match quedaría justificado con las respuestas de otra persona, y el histórico sería falso. Al referenciar la pareja completa, el motor garantiza que el cuestionario **pertenece** al adoptante del proceso.

### Índices únicos condicionales

```sql
CREATE UNIQUE INDEX UX_PROCESO_VIGENTE_POR_USUARIO
ON PROCESOS_ADOPCION (CASE WHEN ESTADO IN ('ACTIVO','EN_PRUEBA') THEN ID_USUARIO END);

CREATE UNIQUE INDEX UX_PROCESO_VIGENTE_POR_MASCOTA
ON PROCESOS_ADOPCION (CASE WHEN ESTADO IN ('ACTIVO','EN_PRUEBA') THEN ID_MASCOTA END);
```

**Cómo funcionan:** Oracle ignora los NULL en los índices únicos. La expresión `CASE` devuelve el ID solo cuando el proceso está vigente, y NULL en cualquier otro caso. Resultado: un adoptante no puede tener dos procesos vigentes al tiempo, ni una mascota estar comprometida en dos procesos vigentes. Todo garantizado por el motor, **sin un solo trigger ni lógica programada**.

**Por qué cubren dos estados y no solo `ACTIVO`:** durante el período de prueba la mascota sigue comprometida y el adoptante sigue ocupado. Si el índice mirara solo `ACTIVO`, la base permitiría iniciar un proceso nuevo sobre una mascota que está a prueba viviendo en otra casa — y sería un error silencioso, de los que nadie nota hasta que ya pasó.

---

## 12. SEGUIMIENTOS

**Para qué sirve:** guarda los tres checkpoints del período de prueba, con las respuestas del adoptante y el semáforo resultante. Es el eje de innovación del proyecto: el mecanismo que detecta riesgo de abandono antes de que ocurra.

### La regla 3-3-3

Es un principio conocido en adopción animal: el animal necesita **3 días** para descomprimir —asustado, sin comer bien, escondido—, **3 semanas** para asentarse en la rutina y empezar a mostrar su personalidad real (es ahí donde aparecen los problemas de comportamiento que llevan a devolverlo), y **3 meses** para sentirse plenamente en casa y crear el vínculo.

**Las preguntas son idénticas en las tres etapas.** Lo que cambia es qué se considera normal: que no coma bien al día 3 es esperable, al mes 3 es una alarma. Esa interpretación vive en el backend, y la redacción adaptada a cada etapa vive en el frontend. Ninguna de las dos cosas necesita estructura en la base.

**Por qué el núcleo común importa:** el valor del seguimiento está en la **trayectoria**, no en la foto. Si la adaptación pasa de `REGULAR` a `MALA` y las noches de `MOVIDAS` a `DIFICILES`, eso es una historia de deterioro que anticipa el fracaso. Solo se puede ver si las tres etapas miden lo mismo. Si cada etapa preguntara cosas distintas, habría tres fotos sueltas sin nada que comparar.

### Estructura

| Campo | Tipo | Obligatorio | Qué se diligencia |
|---|---|---|---|
| `ID_SEGUIMIENTO` | `NUMBER GENERATED AS IDENTITY` | PK, automático | Lo genera Oracle solo |
| `ID_PROCESO` | `NUMBER` (FK → `PROCESOS_ADOPCION`) | Sí | A qué adopción pertenece este checkpoint |
| `ETAPA` | `VARCHAR2(10)` | Sí | `DIA_3`, `SEMANA_3` o `MES_3` |
| `FECHA_PROGRAMADA` | `DATE` | Sí | Cuándo debe responderse. Se calcula desde `FECHA_ENTREGA` |
| `FECHA_RESPUESTA` | `DATE` | **No** | Cuándo lo respondió el adoptante. NULL = todavía pendiente |
| `ADAPTACION` | `VARCHAR2(10)` | **No** | `BUENA` / `REGULAR` / `MALA` |
| `ALIMENTACION` | `VARCHAR2(10)` | **No** | `NORMAL` / `IRREGULAR` / `NO_COME` |
| `SALUD` | `VARCHAR2(20)` | **No** | `SIN_NOVEDAD` / `EN_OBSERVACION` / `REQUIERE_ATENCION` |
| `COMPORTAMIENTO` | `VARCHAR2(20)` | **No** | `SIN_PROBLEMAS` / `PROBLEMAS_LEVES` / `PROBLEMAS_GRAVES` |
| `CONVIVENCIA` | `VARCHAR2(10)` | **No** | `BUENA` / `REGULAR` / `MALA` |
| `ESTADO_ADOPTANTE` | `VARCHAR2(20)` | **No** | `FELIZ` / `BIEN` / `ABRUMADO` / `EVALUANDO_ENTREGA` |
| `SOLICITA_CONTACTO` | `CHAR(1)` | **No** | Si pide que la fundación lo contacte. `'S'` o `'N'` |
| `TIEMPO_DEDICADO` | `VARCHAR2(20)` | **No** | `COMO_ESPERABA` / `MENOS_DEL_PENSADO` / `MUY_POCO` |
| `NOCHES` | `VARCHAR2(10)` | **No** | `TRANQUILAS` / `MOVIDAS` / `DIFICILES` |
| `COMENTARIO` | `VARCHAR2(500)` | **No** | Texto libre que escribe el adoptante. Opcional aun al responder |
| `SEMAFORO` | `VARCHAR2(10)` | **No** | `VERDE` / `AMARILLO` / `ROJO`. Lo calcula el backend al recibir las respuestas |

### Las preguntas tal como las ve el adoptante

El texto se adapta a la etapa; el valor guardado es el mismo. Ejemplo con la primera: *"¿Cómo va en estos primeros días en casa?"* (día 3) → *"Ya lleva tres semanas contigo, ¿cómo la ves ahora?"* (semana 3) → *"Después de tres meses, ¿cómo dirías que se siente en casa?"* (mes 3).

| # | Pregunta | Opciones que ve la persona |
|---|---|---|
| 1 | ¿Cómo se está adaptando? | Muy bien, ya se siente en casa / Va poco a poco, con altibajos / Está costando más de lo que esperaba |
| 2 | ¿Cómo está comiendo? | Come normal y con apetito / Come, pero de forma irregular / Casi no come o ha dejado de comer |
| 3 | ¿Has notado algo en su salud que te preocupe? | Todo bien, la veo sana / Algo pequeño que estoy vigilando / Sí, creo que necesita atención veterinaria |
| 4 | ¿Cómo se está portando en casa? | Sin problemas / Cosas menores: ladra, muerde cosas, se hace adentro / Cosas que no sé cómo manejar |
| 5 | ¿Cómo va la convivencia con las personas y mascotas de la casa? | Muy bien con todos / Todavía se están conociendo / Ha habido roces o tensiones |
| 6 | Y tú, ¿cómo te sientes con la experiencia? | Feliz, no la cambiaría por nada / Bien, con las dudas normales / Abrumado, me está costando / Estoy evaluando si puedo continuar |
| 7 | ¿Te gustaría que alguien de la fundación te contacte? | Sí, me vendría bien hablar con alguien / No hace falta por ahora |
| 8 | ¿Cómo están siendo las noches? | Tranquilas, duerme bien / Algo movidas, pero manejable / Difíciles, casi no dormimos |
| 9 | ¿Has podido dedicarle el tiempo que imaginabas? | Sí, más o menos lo que esperaba / Menos de lo que pensaba / Muy poco, se me ha complicado |
| 10 | ¿Quieres contarnos algo más? | *(texto libre, opcional)* |

**Criterio de diseño de las preguntas:** cada opción es una frase completa y no un número en una escala, para que responder sea reconocerse en algo y no calificarse. Quien llena esto puede estar cansado, preocupado o sintiéndose culpable; si las preguntas suenan a auditoría, la gente responde lo que cree que uno quiere oír, y un semáforo alimentado con respuestas complacientes no sirve de nada.

Dos preguntas merecen mención aparte:

- **La 6** reemplazó a un "¿ha considerado devolver la mascota?" que nadie contestaría con sinceridad, porque suena a confesar un fracaso. El escalón "abrumado" captura a quien todavía no piensa en devolver al animal pero va camino a eso: justamente la señal temprana que el proyecto quiere detectar. Un sí/no solo se activa cuando ya es tarde.
- **La 9** cruza contra `CUESTIONARIOS.TIEMPO_DISPONIBLE`, el criterio de mayor peso del match (40%). Es lo único en todo el sistema que permite comprobar si lo que la persona declaró antes de adoptar se sostuvo en la vida real.

También ayuda mucho, y no cuesta nada en la base, que cada checkpoint abra con un texto que **normalice** lo que la persona está viviendo. Al día 3: *"Es completamente normal que todavía esté asustada, se esconda o coma poco."* Eso baja la vergüenza de reportar problemas.

### Justificaciones

**Por qué cuelga de `ID_PROCESO` y no de la mascota o del adoptante:** el proceso ya lleva dentro quién adoptó, qué mascota y con qué cuestionario. Repetir `ID_MASCOTA` o `ID_USUARIO` aquí sería una dependencia transitiva, el mismo error que se evitó al no guardar el rol en `USUARIOS`. Con un JOIN se llega a todo.

**Por qué las respuestas aceptan NULL — el contraste con `CUESTIONARIOS`:** en `CUESTIONARIOS` la fila solo nace completa. Aquí pasa lo contrario: el cron crea la fila **vacía y por adelantado**, porque el sistema necesita que el checkpoint exista para poder decir "está pendiente" y alertar si nadie responde. La fila nace antes que la respuesta, y NULL significa exactamente *agendado, aún sin responder*.

Es un buen contraste para sustentar ante el profesor: muestra que el NOT NULL no se puso por costumbre, sino según el ciclo de vida real de cada fila.

**Por qué NO hay columna de estado del checkpoint:** sería un dato derivable. Si `FECHA_RESPUESTA` está vacía, está pendiente; si tiene valor, fue respondido. Y "vencido" es `FECHA_PROGRAMADA + 7 < SYSDATE` sin respuesta. Guardarlo sería redundancia.

**Por qué `SEMAFORO` sí se guarda, aunque sea derivable:** porque el checkpoint respondido es **inmutable** —el adoptante no puede volver a editarlo—, así que el color no puede desincronizarse jamás de las respuestas que lo produjeron. Deja de ser un dato derivado vigente y pasa a ser un **valor histórico congelado**: el veredicto que el sistema emitió ese día, con los criterios de ese día. Es el mismo razonamiento con el que se congela `ID_CUESTIONARIO` en el proceso.

**El caso que sigue calculándose aparte:** el rojo por silencio. Si nadie responde, `SEMAFORO` queda en NULL para siempre y la alerta sale de comparar la fecha. Un `SEMAFORO` NULL con la fecha vencida significa "nunca respondió", que es información en sí misma.

### Criterio del semáforo

| Color | Cuándo |
|---|---|
| **Rojo** | `EVALUANDO_ENTREGA`, `PROBLEMAS_GRAVES`, `NO_COME`, `REQUIERE_ATENCION`, o checkpoint vencido sin respuesta |
| **Amarillo** | `ABRUMADO`, `MUY_POCO` tiempo, noches `DIFICILES`, varias respuestas en el nivel intermedio, o `SOLICITA_CONTACTO = 'S'` |
| **Verde** | Todo lo demás |

### Restricciones

```sql
-- Una adopción no puede tener dos checkpoints de la misma etapa
UNIQUE (ID_PROCESO, ETAPA)

-- Redundante en sí mismo; existe para que NOTIFICACIONES pueda
-- referenciar la pareja completa (ver tabla 13)
UNIQUE (ID_SEGUIMIENTO, ID_PROCESO)

-- Un checkpoint marcado como respondido no puede estar a medio llenar
CHECK (FECHA_RESPUESTA IS NULL
       OR (ADAPTACION IS NOT NULL AND ALIMENTACION IS NOT NULL
           AND SALUD IS NOT NULL AND COMPORTAMIENTO IS NOT NULL
           AND CONVIVENCIA IS NOT NULL AND ESTADO_ADOPTANTE IS NOT NULL
           AND SOLICITA_CONTACTO IS NOT NULL AND TIEMPO_DEDICADO IS NOT NULL
           AND NOCHES IS NOT NULL AND SEMAFORO IS NOT NULL))
```

El `UNIQUE (ID_PROCESO, ETAPA)` protege contra el cron: si se ejecuta dos veces por un reinicio o un error, el motor rechaza el duplicado en vez de dejar basura en la base.

### Checkpoints de una adopción que fracasó

Si devuelven a la mascota en la semana 5, el checkpoint del mes 3 sigue agendado. Sin ninguna regla, el sistema le mandaría al adoptante un formulario preguntándole cómo está un animal que ya devolvió, y después generaría una alerta al staff por falta de respuesta.

**Regla de implementación (Fase 6):** los checkpoints ya respondidos **se conservan intactos** — son el registro de cómo iba la adopción antes de caerse, y esa información es valiosa. Los que quedaron agendados **no se piden ni se alertan**: toda consulta de checkpoints pendientes debe filtrar por procesos en estado `EN_PRUEBA`.

No se borran físicamente. Un checkpoint agendado que nunca se respondió, dentro de un proceso `FALLIDO`, cuenta por sí solo la historia de que la adopción se cayó antes de llegar ahí.

---

## 13. NOTIFICACIONES

**Para qué sirve:** guarda los avisos que el sistema genera para el adoptante y para el staff. Alimenta el centro de notificaciones con la campanita y su contador.

**Todas, sin excepción, se refieren a un proceso de adopción.** Eso permite que la tabla apunte siempre a `PROCESOS_ADOPCION` con una FK obligatoria, sin necesidad de inventar una forma genérica de referenciar cualquier entidad del sistema.

| Campo | Tipo | Obligatorio | Qué se diligencia |
|---|---|---|---|
| `ID_NOTIFICACION` | `NUMBER GENERATED AS IDENTITY` | PK, automático | Lo genera Oracle solo |
| `ID_USUARIO` | `NUMBER` (FK → `USUARIOS`) | **No** | El destinatario. **NULL significa que va dirigida al staff como equipo** |
| `TIPO` | `VARCHAR2(30)` | Sí | Qué clase de aviso es. Sirve para priorizar y para saber a dónde navega el clic |
| `MENSAJE` | `VARCHAR2(255)` | Sí | El texto ya redactado, tal como se emitió |
| `ID_PROCESO` | `NUMBER` (FK → `PROCESOS_ADOPCION`) | Sí | A qué proceso se refiere el aviso |
| `ID_SEGUIMIENTO` | `NUMBER` (FK → `SEGUIMIENTOS`) | **No** | A qué checkpoint concreto, cuando el aviso nace de uno |
| `FECHA_CREACION` | `DATE` | Sí, default `SYSDATE` | Cuándo se generó |
| `FECHA_LECTURA` | `DATE` | **No** | Cuándo se marcó como leída. NULL = no leída |
| `ID_USUARIO_LECTURA` | `NUMBER` (FK → `USUARIOS`) | **No** | Qué miembro del staff se hizo cargo |

### Tipos de notificación

| Tipo | Para quién | Cuándo se dispara |
|---|---|---|
| `CHECKPOINT_PENDIENTE` | Adoptante | El cron agenda un checkpoint nuevo |
| `CHECKPOINT_POR_VENCER` | Adoptante | Se acerca el fin de los 7 días de plazo |
| `CHECKPOINT_SIN_RESPUESTA` | Staff | Vencieron los 7 días sin respuesta |
| `SEMAFORO_ROJO` | Staff | Un checkpoint respondido dio rojo |
| `SOLICITA_CONTACTO` | Staff | El adoptante pidió que lo contacten |
| `PROCESO_POR_VENCER` | Staff | Se acercan los 15 días del trámite |
| `PROCESO_VENCIDO` | Staff | El trámite venció sin entrega |
| `PRUEBA_CUMPLIDA` | Staff | Se cumplieron los 3 meses; el proceso espera el cierre manual |
| `PROCESO_CERRADO` | Adoptante | Su proceso llegó a un estado final |

### Justificaciones

- `ID_USUARIO` **acepta NULL** — es un NULL con significado propio: la notificación va dirigida al staff como equipo, no a una persona. Con valor, va a ese adoptante puntual.
- `TIPO` como `CHECK` pese a tener nueve valores — no es un catálogo administrable por nadie: cada tipo tiene código detrás que decide cuándo se dispara y a dónde lleva el clic. Mismo criterio que las columnas de estado.
- `MENSAJE` NOT NULL — el texto queda **congelado tal como se emitió**, con la misma lógica del semáforo. No reemplaza a `TIPO` ni a `ID_PROCESO`: el tipo sirve para priorizar en pantalla y la referencia para saber a dónde navegar.
- `ID_PROCESO` NOT NULL — no existe ninguna notificación suelta en el sistema.
- `ID_SEGUIMIENTO` **acepta NULL** — solo aplica cuando el aviso nace de un checkpoint concreto. Un "proceso por vencer" no tiene ningún checkpoint detrás.
- `FECHA_LECTURA` **acepta NULL** — NULL es "no leída". El estado no se guarda aparte, se deduce de si la fecha existe. Mismo criterio que los checkpoints.
- `ID_USUARIO_LECTURA` **acepta NULL** — solo se llena en las del staff, para saber quién se hizo cargo. En las del adoptante sobraría, porque destinatario y lector son la misma persona.

### Restricciones

```sql
-- No se puede registrar quién leyó sin registrar cuándo
CHECK (ID_USUARIO_LECTURA IS NULL OR FECHA_LECTURA IS NOT NULL)

-- La notificación no puede apuntar a un checkpoint de otro proceso
FOREIGN KEY (ID_SEGUIMIENTO, ID_PROCESO)
  REFERENCES SEGUIMIENTOS (ID_SEGUIMIENTO, ID_PROCESO)
```

Mismo problema y misma solución que en `PROCESOS_ADOPCION`: con dos FK independientes, una notificación podría apuntar a un checkpoint que pertenece a otro proceso. Como `ID_SEGUIMIENTO` acepta NULL, Oracle no valida la FK en esas filas, que es justo el comportamiento deseado para los avisos que no vienen de un checkpoint.

### Comportamiento de la campanita del staff

Como hay **una sola fila para todo el equipo**, marcarla como leída la marca **para todos**. Es una bandeja compartida, no personal: cuando alguien la atiende, se cierra para el equipo. Eso evita que cuatro personas llamen al mismo adoptante por el mismo semáforo rojo.

Hay que tenerlo claro al programar la Fase 7: el contador del staff cuenta *"lo que el equipo no ha atendido"*, no *"lo que yo no he visto"*.

---

# POLÍTICA DE BORRADO

Cuando existe una FK, hay que definir qué pasa si alguien borra la fila padre. En ADOPET **casi nada se borra físicamente**: los usuarios se desactivan con `ACTIVO = 'N'` y las mascotas pasan a `INACTIVA`. Borrar de verdad rompería el historial de adopciones, que es justamente lo que el proyecto quiere conservar.

| Relación | Política | Por qué |
|---|---|---|
| `FOTOS_MASCOTAS` → `MASCOTAS` | `ON DELETE CASCADE` | Una foto no significa nada sin su mascota. Si se registró un animal por error y aún no tiene procesos, borrarlo es legítimo y sus fotos deben irse con él |
| `PERFILES_PERMISOS` → `PERFILES` y `PERMISOS` | `ON DELETE CASCADE` | Puro enlace, sin atributos ni historial. Si se elimina un permiso del catálogo, sus asignaciones pierden todo sentido |
| **Todas las demás** | Bloquear (comportamiento por defecto) | Es una red de seguridad: si alguien intenta borrar un adoptante con historial, que la base se niegue es exactamente lo que se quiere |

La cascada en esas dos tablas es de riesgo bajo porque **no puede encadenarse**: ninguna otra tabla cuelga de ellas.

---

# RESUMEN DE PATRONES APLICADOS

**Seis `CHECK` condicionales** resuelven reglas de "obligatorio solo en cierto caso" sin un solo trigger:

1. `MASCOTAS` — motivo obligatorio si el estado es `INACTIVA`.
2. `PROCESOS_ADOPCION` — observaciones obligatorias si el cierre es `CANCELADO_OTROS`.
3. `PROCESOS_ADOPCION` — fecha de entrega obligatoria si la mascota salió del albergue.
4. `PROCESOS_ADOPCION` — fecha de resolución obligatoria en todo estado final.
5. `PROCESOS_ADOPCION` — responsable del staff obligatorio si el cierre es `FINALIZADO`.
6. `SEGUIMIENTOS` — respuestas completas si el checkpoint está marcado como respondido.

**Tres índices únicos condicionales** garantizan unicidad parcial sin lógica programada: un proceso vigente por adoptante, uno por mascota, y una sola foto principal por mascota.

**Dos índices únicos funcionales** cierran los duplicados que un `UNIQUE` corriente dejaría pasar: correo en minúsculas, y documento sin puntos ni espacios combinado con su tipo.

**Dos FK compuestas** impiden cruzar entidades que no se pertenecen: que un proceso use el cuestionario de otra persona, y que una notificación apunte al checkpoint de otro proceso.

**Datos congelados a propósito** — no son redundancia, son historia: `ID_CUESTIONARIO` en el proceso, `SEMAFORO` y `MENSAJE`.

**Datos deliberadamente NO guardados** por ser derivables: el rol del usuario (JOIN vía perfil), la edad actual de la mascota, el estado de un checkpoint, el estado de lectura de una notificación, y la fecha límite de respuesta de un checkpoint (`FECHA_PROGRAMADA + 7`).

**El punto más atacable del modelo, y su defensa.** `MASCOTAS.ESTADO` es *parcialmente* derivable de `PROCESOS_ADOPCION`: si existe un proceso `ACTIVO` para esa mascota, su estado *es* `EN_PROCESO`. Un docente estricto con la normalización puede señalarlo como redundancia. La defensa: la columna guarda al menos un estado —`INACTIVA`, por enfermedad o fallecimiento— que **ninguna otra tabla puede expresar**, porque no tiene relación alguna con procesos de adopción. La columna es necesaria de todos modos, y lo que hace es consolidar en un solo lugar la situación operativa del animal, de la que cuelgan todas las consultas del catálogo. No es un duplicado gratuito.

---

# LO QUE LA BASE NO PUEDE GARANTIZAR

Tres reglas reales que **ninguna restricción de Oracle puede cerrar**. Van en el backend, y son candidatas naturales a trigger en la Fase 8 si el profesor pide blindaje en base:

**1. Que `ID_STAFF_INICIO` e `ID_STAFF_CIERRE` sean realmente staff.** Ambas FK apuntan a `USUARIOS`, donde están todos. Nada impide poner el ID de un adoptante como responsable de un proceso. Verificarlo exige un JOIN hasta `ROLES`, y eso un `CHECK` no lo puede hacer porque no admite subconsultas.

**2. Que un usuario con rol `ADOPTANTE` tenga fila en `ADOPTANTES`**, y que uno con rol `STAFF` no la tenga. La relación 1:1 opcional no se puede forzar desde la tabla padre.

**3. Que el cron de vencimiento no toque adopciones sanas.** `FECHA_VENCIMIENTO` es la fecha límite de los 15 días del trámite; cuando el proceso pasa a `EN_PRUEBA` esa fecha queda en el pasado y deja de significar nada. **La tarea programada debe filtrar por `ESTADO = 'ACTIVO'`**, o "vencería" adopciones que están felizmente en período de prueba. El fin del período de prueba es `FECHA_ENTREGA + 3 meses`, derivable, así que no necesita columna propia.

---

# PENDIENTES

- **Tabla de errores y triggers** — Fase 8, cuando el profesor explique el tema a fondo.
- **Trigger de mayoría de edad** sobre `ADOPTANTES.FECHA_NACIMIENTO`, imposible como `CHECK` porque Oracle no admite `SYSDATE` en restricciones.
- **Diagrama entidad-relación** completo.
- **Estructura de carpetas** de backend y frontend, y formato estándar de las respuestas de la API.
- **Sembrar `OPCIONES`** con `PROCESOS_ADOPCION` en lugar de la entrada `RESERVAS` del diseño anterior.
- **Al reiniciar un proceso desde cero**, definir si el adoptante debe llenar un cuestionario nuevo o puede reutilizar el vigente. Se resuelve en la Fase 4; la estructura funciona con cualquiera de las dos respuestas.

**Valores configurables por variable de entorno** — decisión tomada: **no se crea tabla `CONFIGURACION`**. Son el umbral de match (60%), el plazo del proceso formal (15 días), el plazo de respuesta del checkpoint (7 días) y los tiempos de la regla 3-3-3. El backend debe leerlos desde **un solo módulo** de configuración, nunca con `process.env` desparramado por el código, para que una eventual migración a base de datos no toque el resto de la aplicación.