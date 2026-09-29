import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';
import { autorizar } from '../../middlewares/permisos.middleware.js';
import { verResumen } from './inicio.controller.js';

export const inicioRoutes = Router();

// Resumen de la página de Inicio: requiere sesión y ver el módulo INICIO.
inicioRoutes.get('/resumen', autenticar, autorizar('INICIO', 'CONSULTAR'), verResumen);
