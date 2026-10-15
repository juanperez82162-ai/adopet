// IDs fijos de TIPOS_NOTIFICACION (sembrados en V15). Viven aparte para que
// cualquier módulo los use sin depender del service de notificaciones.

export const TIPO = {
    SEGUIMIENTO_ROJO: 1,
    CONTACTO_SOLICITADO: 2,
    CHECKPOINT_NO_ATENDIDO: 3,
    TRAMITE_POR_VENCER: 4,
    PRUEBA_CUMPLIDA: 5,
    CHECKPOINT_RESPONDIDO: 6
};
