// Icono de cada módulo del menú, por su nombre técnico (NOMBRE_OPCION).
// El menú sigue saliendo de la base; esto solo decide el dibujito.
const ICONOS = {
    INICIO: '🏠',
    MASCOTAS: '🐶',
    SOLICITUDES: '📝',
    SEGUIMIENTOS: '📅',
    NOTIFICACIONES: '🔔',
    MI_PERFIL: '🙂',
    USUARIOS: '👥',
    ACCESOS: '🔐',
    CATALOGOS: '📚'
};

export function iconoDe(opcion) {
    return ICONOS[opcion] || '🐾';
}
