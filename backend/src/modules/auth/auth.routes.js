import { Router } from 'express';
import { registro, login } from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/registro', registro);
authRoutes.post('/login', login);