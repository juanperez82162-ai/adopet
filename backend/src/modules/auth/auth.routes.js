import { Router } from 'express';
import { registro, login, menu, recuperar, restablecer } from './auth.controller.js';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';

export const authRoutes = Router();

authRoutes.post('/registro', registro);
authRoutes.post('/login', login);
authRoutes.post('/recuperar', recuperar);
authRoutes.post('/restablecer', restablecer);
authRoutes.get('/menu', autenticar, menu);
