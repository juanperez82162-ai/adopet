-- =====================================================================
-- ADOPET - V13: instrumento de seguimiento (checkpoints 3-3-3).
--
-- Siembra lo que el formulario necesita, todo editable desde la base sin
-- tocar la aplicacion:
--   - SEMAFOROS: VERDE(1), AMARILLO(2), ROJO(3) con su rango de promedio.
--   - PREGUNTAS_CHECKPOINT: 6 preguntas, iguales en las tres etapas.
--   - OPCIONES_CHECKPOINT: 4 respuestas por pregunta, con puntaje de 4
--     (mejor) a 1 (peor). Las respuestas que indican riesgo grave estan
--     marcadas como ALARMA y ponen el semaforo en rojo sin mirar el promedio.
--
-- Rangos del promedio (de 1.00 a 4.00):
--   ROJO 1.00-1.99 · AMARILLO 2.00-2.99 · VERDE 3.00-4.00
-- =====================================================================

INSERT INTO SEMAFOROS (ID_SEMAFORO, NOMBRE, PUNTAJE_MIN, PUNTAJE_MAX) VALUES (1, 'VERDE',    3.00, 4.00);
INSERT INTO SEMAFOROS (ID_SEMAFORO, NOMBRE, PUNTAJE_MIN, PUNTAJE_MAX) VALUES (2, 'AMARILLO', 2.00, 2.99);
INSERT INTO SEMAFOROS (ID_SEMAFORO, NOMBRE, PUNTAJE_MIN, PUNTAJE_MAX) VALUES (3, 'ROJO',     1.00, 1.99);

-- Preguntas
INSERT INTO PREGUNTAS_CHECKPOINT (TEXTO, ORDEN) VALUES ('¿Cómo se está adaptando a tu hogar?', 1);
INSERT INTO PREGUNTAS_CHECKPOINT (TEXTO, ORDEN) VALUES ('¿Cómo está comiendo?', 2);
INSERT INTO PREGUNTAS_CHECKPOINT (TEXTO, ORDEN) VALUES ('¿Cómo duerme y descansa?', 3);
INSERT INTO PREGUNTAS_CHECKPOINT (TEXTO, ORDEN) VALUES ('¿Cómo es la convivencia con las personas y otras mascotas del hogar?', 4);
INSERT INTO PREGUNTAS_CHECKPOINT (TEXTO, ORDEN) VALUES ('¿Cómo está su salud?', 5);
INSERT INTO PREGUNTAS_CHECKPOINT (TEXTO, ORDEN) VALUES ('¿Cómo te sientes tú con la adopción?', 6);

-- Opciones: (pregunta por ORDEN, texto, puntaje, alarma, orden de la opción)
INSERT INTO OPCIONES_CHECKPOINT (ID_PREGUNTA, TEXTO, PUNTAJE, ES_ALARMA, ORDEN)
SELECT p.ID_PREGUNTA, o.TEXTO, o.PUNTAJE, o.ES_ALARMA, o.ORDEN
FROM (
            SELECT 1 AS PREGUNTA, 'Muy bien, ya se siente en casa' AS TEXTO, 4 AS PUNTAJE, 'N' AS ES_ALARMA, 1 AS ORDEN FROM DUAL
  UNION ALL SELECT 1, 'Bien, con algo de timidez',                       3, 'N', 2 FROM DUAL
  UNION ALL SELECT 1, 'Le está costando adaptarse',                      2, 'N', 3 FROM DUAL
  UNION ALL SELECT 1, 'No logra adaptarse y me preocupa',                1, 'N', 4 FROM DUAL

  UNION ALL SELECT 2, 'Come con normalidad',                             4, 'N', 1 FROM DUAL
  UNION ALL SELECT 2, 'Come un poco más o menos de lo normal',           3, 'N', 2 FROM DUAL
  UNION ALL SELECT 2, 'Come muy poco o con dificultad',                  2, 'N', 3 FROM DUAL
  UNION ALL SELECT 2, 'Se niega a comer',                                1, 'S', 4 FROM DUAL

  UNION ALL SELECT 3, 'Descansa bien por las noches',                    4, 'N', 1 FROM DUAL
  UNION ALL SELECT 3, 'Algunas noches está inquieta',                    3, 'N', 2 FROM DUAL
  UNION ALL SELECT 3, 'Casi todas las noches está inquieta o llora',     2, 'N', 3 FROM DUAL
  UNION ALL SELECT 3, 'Casi no duerme y no logra calmarse',              1, 'N', 4 FROM DUAL

  UNION ALL SELECT 4, 'Armoniosa, se lleva bien con todos',              4, 'N', 1 FROM DUAL
  UNION ALL SELECT 4, 'Con algunos roces ocasionales',                   3, 'N', 2 FROM DUAL
  UNION ALL SELECT 4, 'Hay conflictos frecuentes',                       2, 'N', 3 FROM DUAL
  UNION ALL SELECT 4, 'Ha mostrado agresividad',                         1, 'S', 4 FROM DUAL

  UNION ALL SELECT 5, 'Sana y activa',                                   4, 'N', 1 FROM DUAL
  UNION ALL SELECT 5, 'Algún malestar leve',                             3, 'N', 2 FROM DUAL
  UNION ALL SELECT 5, 'Un malestar que requiere atención veterinaria',   2, 'N', 3 FROM DUAL
  UNION ALL SELECT 5, 'Tiene un problema de salud grave',                1, 'S', 4 FROM DUAL

  UNION ALL SELECT 6, 'Feliz, quiero continuar con la adopción',         4, 'N', 1 FROM DUAL
  UNION ALL SELECT 6, 'Con algunas dudas menores',                       3, 'N', 2 FROM DUAL
  UNION ALL SELECT 6, 'Con dudas importantes',                           2, 'N', 3 FROM DUAL
  UNION ALL SELECT 6, 'Quiero devolverla al albergue',                   1, 'S', 4 FROM DUAL
) o
JOIN PREGUNTAS_CHECKPOINT p ON p.ORDEN = o.PREGUNTA;
