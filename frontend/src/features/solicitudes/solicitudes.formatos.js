// Textos de presentación del módulo de solicitudes.

const ETIQUETAS = {
    SOLICITUD: 'Solicitud recibida',
    ACTIVO: 'Trámite activo',
    EN_PRUEBA: 'En periodo de prueba',
    FINALIZADO: 'Finalizado',
    FALLIDO: 'Fallido',
    VENCIDO: 'Vencido',
    CANCELADO_ADOPTANTE: 'Cancelada por el adoptante',
    CANCELADO_STAFF: 'Cancelada por el albergue',
    CANCELADO_OTROS: 'Cancelada (otros motivos)'
};

export const etiquetaEstadoProceso = (nombre) => ETIQUETAS[nombre] ?? nombre;

// Clase de color de la insignia de cada estado (estilos en solicitudes.css).
const CLASES = {
    SOLICITUD: 'estado-pendiente',
    ACTIVO: 'estado-activo',
    EN_PRUEBA: 'estado-prueba',
    FINALIZADO: 'estado-finalizado',
    FALLIDO: 'estado-cancelado',
    VENCIDO: 'estado-vencido',
    CANCELADO_ADOPTANTE: 'estado-cancelado',
    CANCELADO_STAFF: 'estado-cancelado',
    CANCELADO_OTROS: 'estado-cancelado'
};

export const claseEstadoProceso = (nombre) => `insignia estado-proceso ${CLASES[nombre] ?? ''}`.trim();

// Quién cancela: ids fijos de ESTADOS_PROCESO.
export const OPCIONES_CANCELACION = [
    { id: 7, texto: 'El adoptante ya no quiere seguir' },
    { id: 8, texto: 'El albergue decide no continuar' },
    { id: 9, texto: 'Otro motivo' }
];

export const aSiNo = (valor) => (valor ? 'Sí' : 'No');
