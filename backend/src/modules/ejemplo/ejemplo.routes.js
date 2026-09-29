// =====================================================================
// MÓDULO DE EJEMPLO — plantilla para crear un módulo nuevo.
// NO está conectado a la aplicación (no aparece en app.js), así que
// nunca se ejecuta. Se copia la carpeta y se renombra: ver LEEME.md.
// =====================================================================
//
// Capa de RUTAS: solo dice qué URL llama a qué función del controller
// y qué permiso exige. No tiene lógica.

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';
import { autorizar } from '../../middlewares/permisos.middleware.js';
import { listar, ver, crear, modificar, cambiarEstado } from './ejemplo.controller.js';

// CAMBIA ESTO: el nombre de la opción del menú tal como está en
// OPCIONES_MENU.NOMBRE_OPCION (por ejemplo 'MASCOTAS').
const OPCION = 'EJEMPLO';

// CAMBIA ESTO: el nombre de la exportación (por ejemplo mascotasRoutes).
export const ejemploRoutes = Router();

// Todo el módulo exige sesión. Si alguna ruta debe ser pública (como el
// catálogo público de mascotas), se declara ANTES de esta línea.
ejemploRoutes.use(autenticar);

// La acción de cada ruta sale de PERFILES_OPCIONES:
// CONSULTAR = la fila existe · CREAR · MODIFICAR · ELIMINAR (= desactivar).
ejemploRoutes.get('/', autorizar(OPCION, 'CONSULTAR'), listar);
ejemploRoutes.get('/:id', autorizar(OPCION, 'CONSULTAR'), ver);
ejemploRoutes.post('/', autorizar(OPCION, 'CREAR'), crear);
ejemploRoutes.put('/:id', autorizar(OPCION, 'MODIFICAR'), modificar);

// En ADOPET nada se borra: "eliminar" es desactivar, y usa la acción ELIMINAR.
ejemploRoutes.patch('/:id/estado', autorizar(OPCION, 'ELIMINAR'), cambiarEstado);
