import { Router } from 'express';
import { registro } from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/registro', registro);