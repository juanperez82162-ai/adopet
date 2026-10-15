// Capa de RUTAS de NOTIFICACIONES. Consultar y marcar como leída: el service
// decide qué bandeja corresponde a cada usuario (staff: la compartida).

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';
import { autorizar } from '../../middlewares/permisos.middleware.js';
import { listar, contador, leer, leerTodas } from './notificaciones.controller.js';

// Debe coincidir con OPCIONES_MENU.NOMBRE_OPCION.
const OPCION = 'NOTIFICACIONES';

export const notificacionesRoutes = Router();

notificacionesRoutes.use(autenticar);

// Las rutas fijas van antes de '/:id'.
notificacionesRoutes.get('/contador', autorizar(OPCION, 'CONSULTAR'), contador);
notificacionesRoutes.patch('/leer-todas', autorizar(OPCION, 'MODIFICAR'), leerTodas);
notificacionesRoutes.get('/', autorizar(OPCION, 'CONSULTAR'), listar);
notificacionesRoutes.patch('/:id/leer', autorizar(OPCION, 'MODIFICAR'), leer);
