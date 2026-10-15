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

// Quién cancela: ids fijos de ESTADOS_PROCESO.
export const OPCIONES_CANCELACION = [
    { id: 7, texto: 'El adoptante ya no quiere seguir' },
    { id: 8, texto: 'El albergue decide no continuar' },
    { id: 9, texto: 'Otro motivo' }
];

export const aSiNo = (valor) => (valor ? 'Sí' : 'No');
