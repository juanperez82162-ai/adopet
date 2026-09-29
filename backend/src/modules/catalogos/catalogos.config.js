// Lista blanca de catálogos simples.
// El nombre de una tabla no puede ir como variable enlazada en Oracle,
// así que SOLO se consultan las tablas que aparecen aquí.
//
// etiqueta:          nombre que ve el usuario en la pantalla.
// permiteCrear:      false solo cuando el código del sistema depende de cada fila.
// permiteDesactivar: false cuando el flujo del sistema depende de cada fila.
// conNivel:          el catálogo tiene columna NIVEL (1 a 3), que usa el motor
//                    de match para comparar valores sin depender del nombre.
// descripcionNivel:  qué significa el nivel en ese catálogo.
// conOtro:           el catálogo tiene la opción "Otro" (columna ES_OTRO),
//                    que habilita texto libre en el cuestionario.

export const CATALOGOS = {
    'tipos-documento': {
        etiqueta: 'Tipos de documento',
        tabla: 'TIPOS_DOCUMENTO', columnaId: 'ID_TIPO_DOCUMENTO', largoNombre: 15,
        permiteCrear: true, permiteDesactivar: true, conNivel: false, conOtro: false
    },
    'ciudades': {
        etiqueta: 'Ciudades',
        tabla: 'CIUDADES', columnaId: 'ID_CIUDAD', largoNombre: 80,
        permiteCrear: true, permiteDesactivar: true, conNivel: false, conOtro: false
    },
    'especies': {
        etiqueta: 'Especies',
        tabla: 'ESPECIES', columnaId: 'ID_ESPECIE', largoNombre: 10,
        permiteCrear: true, permiteDesactivar: true, conNivel: false, conOtro: false
    },
    'sexos': {
        etiqueta: 'Sexos',
        tabla: 'SEXOS', columnaId: 'ID_SEXO', largoNombre: 10,
        permiteCrear: true, permiteDesactivar: true, conNivel: false, conOtro: false
    },
    'tamanios': {
        etiqueta: 'Tamaños',
        tabla: 'TAMANIOS', columnaId: 'ID_TAMANIO', largoNombre: 10,
        permiteCrear: true, permiteDesactivar: true, conNivel: true, conOtro: false,
        descripcionNivel: 'Tamaño del animal'
    },
    'niveles-energia': {
        etiqueta: 'Niveles de energía',
        tabla: 'NIVELES_ENERGIA', columnaId: 'ID_NIVEL_ENERGIA', largoNombre: 10,
        permiteCrear: true, permiteDesactivar: true, conNivel: true, conOtro: false,
        descripcionNivel: 'Actividad que necesita el animal'
    },
    'tipos-vivienda': {
        etiqueta: 'Tipos de vivienda',
        tabla: 'TIPOS_VIVIENDA', columnaId: 'ID_TIPO_VIVIENDA', largoNombre: 15,
        permiteCrear: true, permiteDesactivar: true, conNivel: true, conOtro: true,
        descripcionNivel: 'Espacio disponible en la vivienda'
    },
    'tiempos-disponibles': {
        etiqueta: 'Tiempos disponibles',
        tabla: 'TIEMPOS_DISPONIBLES', columnaId: 'ID_TIEMPO_DISPONIBLE', largoNombre: 10,
        permiteCrear: true, permiteDesactivar: true, conNivel: true, conOtro: true,
        descripcionNivel: 'Tiempo que puede dedicar el adoptante'
    },
    'estados-proceso': {
        etiqueta: 'Estados del proceso',
        tabla: 'ESTADOS_PROCESO', columnaId: 'ID_ESTADO_PROCESO', largoNombre: 20,
        permiteCrear: false, permiteDesactivar: false, conNivel: false, conOtro: false
    }
};
