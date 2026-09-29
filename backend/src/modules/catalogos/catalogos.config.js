// Lista blanca de catálogos simples.
// El nombre de una tabla no puede ir como variable enlazada en Oracle,
// así que SOLO se consultan las tablas que aparecen aquí.
//
// etiqueta:          nombre que ve el usuario en la pantalla.
// permiteCrear:      false en los catálogos PREDEFINIDOS: sus valores se
//                    definen en las migraciones, no desde la aplicación.
// permiteDesactivar: false cuando el flujo del sistema depende de cada fila.
// conDescripcion:    cada valor tiene DESCRIPCION que explica qué significa.
// conNivel:          tiene columna NIVEL (1 a 3), que usa el motor de match.
// niveles:           qué significa cada nivel en ese catálogo.
// conOtro:           tiene la opción "Otro" (ES_OTRO), que habilita texto
//                    libre en el cuestionario.
// conReglasDocumento: tiene SOLO_NUMEROS, LARGO_MINIMO y LARGO_MAXIMO, que
//                    validan el número de documento en el registro.

export const CATALOGOS = {
    'tipos-documento': {
        etiqueta: 'Tipos de documento',
        tabla: 'TIPOS_DOCUMENTO', columnaId: 'ID_TIPO_DOCUMENTO', largoNombre: 15,
        permiteCrear: true, permiteDesactivar: true,
        conReglasDocumento: true
    },
    'ciudades': {
        etiqueta: 'Ciudades',
        tabla: 'CIUDADES', columnaId: 'ID_CIUDAD', largoNombre: 80,
        permiteCrear: true, permiteDesactivar: true
    },
    'especies': {
        etiqueta: 'Especies',
        tabla: 'ESPECIES', columnaId: 'ID_ESPECIE', largoNombre: 10,
        permiteCrear: true, permiteDesactivar: true
    },
    'sexos': {
        etiqueta: 'Sexos',
        tabla: 'SEXOS', columnaId: 'ID_SEXO', largoNombre: 10,
        permiteCrear: true, permiteDesactivar: true
    },
    'tamanios': {
        etiqueta: 'Tamaños',
        tabla: 'TAMANIOS', columnaId: 'ID_TAMANIO', largoNombre: 10,
        permiteCrear: false, permiteDesactivar: true,
        conDescripcion: true, conNivel: true,
        niveles: { 1: 'Pequeño', 2: 'Mediano', 3: 'Grande' }
    },
    'niveles-energia': {
        etiqueta: 'Niveles de energía',
        tabla: 'NIVELES_ENERGIA', columnaId: 'ID_NIVEL_ENERGIA', largoNombre: 10,
        permiteCrear: false, permiteDesactivar: true,
        conDescripcion: true, conNivel: true,
        niveles: { 1: 'Tranquilo', 2: 'Moderado', 3: 'Muy activo' }
    },
    'tipos-vivienda': {
        etiqueta: 'Tipos de vivienda',
        tabla: 'TIPOS_VIVIENDA', columnaId: 'ID_TIPO_VIVIENDA', largoNombre: 15,
        permiteCrear: false, permiteDesactivar: true,
        conDescripcion: true, conNivel: true, conOtro: true,
        niveles: { 1: 'Espacio reducido', 2: 'Espacio medio', 3: 'Espacio amplio' }
    },
    'tiempos-disponibles': {
        etiqueta: 'Tiempos disponibles',
        tabla: 'TIEMPOS_DISPONIBLES', columnaId: 'ID_TIEMPO_DISPONIBLE', largoNombre: 10,
        permiteCrear: false, permiteDesactivar: true,
        conDescripcion: true, conNivel: true, conOtro: true,
        niveles: { 1: 'Poco tiempo', 2: 'Tiempo moderado', 3: 'Mucho tiempo' }
    },
    'estados-proceso': {
        etiqueta: 'Estados del proceso',
        tabla: 'ESTADOS_PROCESO', columnaId: 'ID_ESTADO_PROCESO', largoNombre: 20,
        permiteCrear: false, permiteDesactivar: false
    }
};

export const LARGO_DESCRIPCION = 150;
