import { Router } from 'express';
import { registro, login, menu, recuperar, restablecer } from './auth.controller.js';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';
import { limiteLogin, limiteRecuperar, limiteRestablecer } from '../../middlewares/limites.middleware.js';

export const authRoutes = Router();

authRoutes.post('/registro', registro);
// Las rutas sensibles llevan límite de intentos por IP (ver limites.middleware.js).
authRoutes.post('/login', limiteLogin, login);
authRoutes.post('/recuperar', limiteRecuperar, recuperar);
authRoutes.post('/restablecer', limiteRestablecer, restablecer);
authRoutes.get('/menu', autenticar, menu);
