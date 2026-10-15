// Textos y colores de presentación del módulo de seguimientos.

const ETAPAS = { DIA_3: 'Día 3', SEMANA_3: 'Semana 3', MES_3: 'Mes 3' };

export const etiquetaEtapa = (nombre) => ETAPAS[nombre] ?? nombre;

const ESTADOS = {
    PROGRAMADO: 'Programado',
    PENDIENTE: 'Por responder',
    RESPONDIDO: 'Respondido',
    NO_ATENDIDO: 'Sin respuesta'
};

export const etiquetaEstadoSeguimiento = (estado) => ESTADOS[estado] ?? estado;

// Reutiliza los colores de las insignias de solicitudes.
const CLASES_ESTADO = {
    PROGRAMADO: 'estado-vencido',
    PENDIENTE: 'estado-pendiente',
    RESPONDIDO: 'estado-activo',
    NO_ATENDIDO: 'estado-cancelado'
};

export const claseEstadoSeguimiento = (estado) =>
    `insignia estado-proceso ${CLASES_ESTADO[estado] ?? ''}`.trim();

const CLASES_SEMAFORO = { VERDE: 'semaforo-verde', AMARILLO: 'semaforo-amarillo', ROJO: 'semaforo-rojo' };

export const claseSemaforo = (nombre) => `insignia estado-proceso ${CLASES_SEMAFORO[nombre] ?? ''}`.trim();
