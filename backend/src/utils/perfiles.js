// Nombres de perfil y de opción de menú que el código necesita conocer.
// Están sembrados en V2__datos_base.sql; si allí cambian, cambian aquí.

export const PERFIL_ADMIN = 'Admin';
export const PERFIL_ADOPTANTE = 'Adoptante';
export const PERFIL_VETADO = 'Vetado';

// Los 4 perfiles sembrados en V2. No se renombran ni se desactivan desde
// la aplicación: el registro, el veto y la protección del Admin dependen de ellos.
export const PERFILES_BASE = [PERFIL_ADMIN, 'Practicante', PERFIL_ADOPTANTE, PERFIL_VETADO];

// Módulos que el perfil Admin nunca pierde (con todas sus acciones):
// sin ellos, nadie podría volver a administrar usuarios ni permisos.
export const OPCIONES_PROTEGIDAS_ADMIN = ['USUARIOS', 'ACCESOS'];
