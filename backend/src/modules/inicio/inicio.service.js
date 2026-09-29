// El módulo inicio NO tiene repository: no tiene tablas propias.
// Arma el resumen pidiendo las cifras al service de cada módulo, y solo
// incluye un bloque si la persona puede VER ese módulo. Así el resumen
// sigue a los permisos de Accesos, no al nombre del perfil: un perfil
// nuevo con permiso de ver Usuarios también verá sus cifras.

import { tienePermiso } from '../auth/auth.service.js';
import { obtenerResumenUsuarios } from '../usuarios/usuarios.service.js';

// Cada bloque: qué módulo debe poder ver, y cómo se arman sus cifras.
// Cuando existan Mascotas y Solicitudes, se agrega un bloque por cada uno.
const BLOQUES = [
    {
        opcion: 'USUARIOS',
        titulo: 'Usuarios',
        ruta: '/usuarios',
        async cifras() {
            const resumen = await obtenerResumenUsuarios();

            return [
                { clave: 'activos', etiqueta: 'Cuentas activas', valor: resumen.activos },
                { clave: 'nuevos', etiqueta: 'Nuevas en 7 días', valor: resumen.nuevos },
                { clave: 'desactivados', etiqueta: 'Desactivadas', valor: resumen.desactivados },
                { clave: 'vetados', etiqueta: 'Vetadas', valor: resumen.vetados }
            ];
        }
    }
];

export async function obtenerResumen(documento) {
    const bloques = [];

    for (const bloque of BLOQUES) {
        if (await tienePermiso(documento, bloque.opcion, 'CONSULTAR')) {
            bloques.push({
                opcion: bloque.opcion,
                titulo: bloque.titulo,
                ruta: bloque.ruta,
                cifras: await bloque.cifras()
            });
        }
    }

    return { bloques };
}
