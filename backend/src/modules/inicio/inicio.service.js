// El módulo inicio NO tiene repository: no tiene tablas propias.
// Arma el resumen pidiendo las cifras al service de cada módulo, y solo
// incluye un bloque si la persona tiene el permiso que ese bloque exige.
// Así el resumen sigue a los permisos de Accesos, no al nombre del perfil:
// un perfil nuevo con ese permiso también verá las cifras.
//
// Cada bloque dice qué acción necesita (por defecto, poder ver el módulo).
// Los bloques de gestión del staff piden MODIFICAR: el adoptante puede ver
// esos módulos, pero no debe ver las cifras internas de la fundación.

import { tienePermiso } from '../auth/auth.service.js';
import { obtenerResumenUsuarios } from '../usuarios/usuarios.service.js';
import { obtenerResumenMascotas } from '../mascotas/mascotas.service.js';
import { obtenerResumenSolicitudes } from '../solicitudes/solicitudes.service.js';
import { obtenerResumenSemaforos } from '../seguimientos/seguimientos.service.js';

// tono: color de la cifra en pantalla (solo el semáforo y los avisos lo usan).
const BLOQUES = [
    {
        opcion: 'USUARIOS',
        accion: 'CONSULTAR',
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
    },
    {
        opcion: 'MASCOTAS',
        accion: 'MODIFICAR',
        titulo: 'Mascotas',
        ruta: '/mascotas',
        async cifras() {
            const resumen = await obtenerResumenMascotas();

            return [
                { clave: 'disponibles', etiqueta: 'Disponibles', valor: resumen.disponibles },
                { clave: 'enTratamiento', etiqueta: 'En tratamiento', valor: resumen.enTratamiento },
                { clave: 'enProceso', etiqueta: 'En trámite de adopción', valor: resumen.enProceso },
                { clave: 'enPrueba', etiqueta: 'En periodo de prueba', valor: resumen.enPrueba }
            ];
        }
    },
    {
        opcion: 'SOLICITUDES',
        accion: 'MODIFICAR',
        titulo: 'Trámites de adopción',
        ruta: '/solicitudes',
        async cifras() {
            const resumen = await obtenerResumenSolicitudes();

            return [
                { clave: 'enCurso', etiqueta: 'Trámites en curso', valor: resumen.enCurso },
                {
                    clave: 'porVencer',
                    etiqueta: `Vencen en ${resumen.dias} días o menos`,
                    valor: resumen.porVencer,
                    tono: resumen.porVencer > 0 ? 'amarillo' : undefined
                }
            ];
        }
    },
    {
        opcion: 'SEGUIMIENTOS',
        accion: 'MODIFICAR',
        titulo: 'Adopciones en periodo de prueba',
        ruta: '/seguimientos',
        async cifras() {
            const resumen = await obtenerResumenSemaforos();

            return [
                { clave: 'rojos', etiqueta: 'En rojo', valor: resumen.rojos, tono: 'rojo' },
                { clave: 'amarillos', etiqueta: 'En amarillo', valor: resumen.amarillos, tono: 'amarillo' },
                { clave: 'verdes', etiqueta: 'En verde', valor: resumen.verdes, tono: 'verde' },
                { clave: 'sinRespuesta', etiqueta: 'Sin respuesta aún', valor: resumen.sinRespuesta }
            ];
        }
    }
];

export async function obtenerResumen(documento) {
    const bloques = [];

    for (const bloque of BLOQUES) {
        if (await tienePermiso(documento, bloque.opcion, bloque.accion)) {
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
