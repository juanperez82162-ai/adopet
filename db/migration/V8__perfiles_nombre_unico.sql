-- =====================================================================
-- ADOPET - V8: el nombre de un perfil no se repite.
-- Desde ahora los perfiles se crean desde la aplicación (Accesos), así
-- que la base impide dos perfiles con el mismo nombre, sin importar
-- mayúsculas y minúsculas ("Voluntario" y "VOLUNTARIO" son el mismo).
-- =====================================================================

CREATE UNIQUE INDEX UX_PERFILES_NOMBRE_LOWER ON PERFILES (LOWER(NOMBRE_PERFIL));
