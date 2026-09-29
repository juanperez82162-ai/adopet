// Lista blanca de catálogos simples (ID, NOMBRE, ACTIVO).
// El nombre de una tabla no puede ir como variable enlazada en Oracle,
// así que SOLO se consultan las tablas que aparecen aquí.
//
// idFijo: el ID se siembra a mano (no IDENTITY). Sus filas nuevas entran
//         por migración de Flyway, nunca desde la pantalla.
// permiteDesactivar: false cuando el flujo del sistema depende de cada fila.

export const CATALOGOS = {
    'tipos-documento': {
        tabla: 'TIPOS_DOCUMENTO', columnaId: 'ID_TIPO_DOCUMENTO',
        largoNombre: 15, idFijo: true, permiteDesactivar: true
    },
    'ciudades': {
        tabla: 'CIUDADES', columnaId: 'ID_CIUDAD',
        largoNombre: 80, idFijo: false, permiteDesactivar: true
    },
    'especies': {
        tabla: 'ESPECIES', columnaId: 'ID_ESPECIE',
        largoNombre: 10, idFijo: true, permiteDesactivar: true
    },
    'tamanios': {
        tabla: 'TAMANIOS', columnaId: 'ID_TAMANIO',
        largoNombre: 10, idFijo: true, permiteDesactivar: true
    },
    'sexos': {
        tabla: 'SEXOS', columnaId: 'ID_SEXO',
        largoNombre: 10, idFijo: true, permiteDesactivar: true
    },
    'niveles-energia': {
        tabla: 'NIVELES_ENERGIA', columnaId: 'ID_NIVEL_ENERGIA',
        largoNombre: 10, idFijo: true, permiteDesactivar: true
    },
    'tipos-vivienda': {
        tabla: 'TIPOS_VIVIENDA', columnaId: 'ID_TIPO_VIVIENDA',
        largoNombre: 15, idFijo: true, permiteDesactivar: true
    },
    'tiempos-disponibles': {
        tabla: 'TIEMPOS_DISPONIBLES', columnaId: 'ID_TIEMPO_DISPONIBLE',
        largoNombre: 10, idFijo: true, permiteDesactivar: true
    },
    'estados-proceso': {
        tabla: 'ESTADOS_PROCESO', columnaId: 'ID_ESTADO_PROCESO',
        largoNombre: 20, idFijo: true, permiteDesactivar: false
    }
};
