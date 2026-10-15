// Capa de RUTAS de SEGUIMIENTOS. Todo el módulo exige sesión.
// El staff ve todos los checkpoints; el adoptante, los suyos (lo decide el
// service). Responder le basta con poder consultar: el service verifica que
// el checkpoint sea suyo.

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';
import { autorizar } from '../../middlewares/permisos.middleware.js';
import { formulario, listar, ver, responderSeguimiento } from './seguimientos.controller.js';

// Debe coincidir con OPCIONES_MENU.NOMBRE_OPCION.
const OPCION = 'SEGUIMIENTOS';

export const seguimientosRoutes = Router();

seguimientosRoutes.use(autenticar);

// Va antes de '/:id': si no, Express tomaría "formulario" como un id.
seguimientosRoutes.get('/formulario', autorizar(OPCION, 'CONSULTAR'), formulario);
seguimientosRoutes.get('/', autorizar(OPCION, 'CONSULTAR'), listar);
seguimientosRoutes.get('/:id', autorizar(OPCION, 'CONSULTAR'), ver);
seguimientosRoutes.post('/:id/respuestas', autorizar(OPCION, 'CONSULTAR'), responderSeguimiento);
