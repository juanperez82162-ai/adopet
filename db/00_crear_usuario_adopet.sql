-- ADOPET - Creacion del usuario propietario del esquema
--
-- ESTE ARCHIVO NO ES UNA MIGRACION DE FLYWAY.
-- Se ejecuta UNA SOLA VEZ POR MAQUINA, manualmente desde DBeaver,
-- conectado como el usuario "system" al servicio XEPDB1.
--
-- Despues de ejecutarlo, crear en DBeaver una segunda conexion usando
-- el usuario "adopet". Esa es la conexion que se usa de aqui en adelante.

CREATE USER adopet IDENTIFIED BY adopet1234;

GRANT CONNECT, RESOURCE TO adopet;

ALTER USER adopet QUOTA UNLIMITED ON USERS;
