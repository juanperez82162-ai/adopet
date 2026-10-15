// Capa de RUTAS de SOLICITUDES: solo dice qué URL llama a qué función y
// qué permiso exige. Todo el módulo exige sesión.

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';
import { autorizar } from '../../middlewares/permisos.middleware.js';
import { opciones, recomendar, crear } from './solicitudes.controller.js';

// Debe coincidir con OPCIONES_MENU.NOMBRE_OPCION.
const OPCION = 'SOLICITUDES';

export const solicitudesRoutes = Router();

solicitudesRoutes.use(autenticar);

// Las opciones del cuestionario las lee quien puede ver el módulo.
solicitudesRoutes.get('/opciones-cuestionario', autorizar(OPCION, 'CONSULTAR'), opciones);

// Calcular el match no guarda nada, pero es parte de iniciar una solicitud.
solicitudesRoutes.post('/recomendaciones', autorizar(OPCION, 'CREAR'), recomendar);

solicitudesRoutes.post('/', autorizar(OPCION, 'CREAR'), crear);
