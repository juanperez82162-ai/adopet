// Capa de RUTAS de SOLICITUDES: solo dice qué URL llama a qué función y
// qué permiso exige. Todo el módulo exige sesión.

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';
import { autorizar } from '../../middlewares/permisos.middleware.js';
import { opciones, recomendar, crear, listar, ver, formalizarSolicitud, cancelarSolicitud } from './solicitudes.controller.js';

// Debe coincidir con OPCIONES_MENU.NOMBRE_OPCION.
const OPCION = 'SOLICITUDES';

export const solicitudesRoutes = Router();

solicitudesRoutes.use(autenticar);

// Las opciones del cuestionario las lee quien puede ver el módulo.
solicitudesRoutes.get('/opciones-cuestionario', autorizar(OPCION, 'CONSULTAR'), opciones);

// Calcular el match no guarda nada, pero es parte de iniciar una solicitud.
solicitudesRoutes.post('/recomendaciones', autorizar(OPCION, 'CREAR'), recomendar);

solicitudesRoutes.post('/', autorizar(OPCION, 'CREAR'), crear);

// Listar y ver: el staff ve todas; el adoptante solo las suyas (lo decide el service).
// Va después de '/opciones-cuestionario' para que Express no la tome como un id.
solicitudesRoutes.get('/', autorizar(OPCION, 'CONSULTAR'), listar);
solicitudesRoutes.get('/:id', autorizar(OPCION, 'CONSULTAR'), ver);

// Formalizar y cancelar modifican la solicitud: acción MODIFICAR.
solicitudesRoutes.patch('/:id/formalizar', autorizar(OPCION, 'MODIFICAR'), formalizarSolicitud);
solicitudesRoutes.patch('/:id/cancelar', autorizar(OPCION, 'MODIFICAR'), cancelarSolicitud);
