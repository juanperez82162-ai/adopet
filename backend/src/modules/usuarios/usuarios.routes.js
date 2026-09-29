import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';
import { autorizar } from '../../middlewares/permisos.middleware.js';
import { verMiPerfil, editarMiPerfil, editarMiContrasena } from './usuarios.controller.js';

export const usuariosRoutes = Router();

// Todo el módulo exige sesión.
usuariosRoutes.use(autenticar);

// Mi perfil: el documento sale del token, así que cada quien solo toca lo suyo.
usuariosRoutes.get('/mi-perfil', autorizar('MI_PERFIL', 'CONSULTAR'), verMiPerfil);
usuariosRoutes.put('/mi-perfil', autorizar('MI_PERFIL', 'MODIFICAR'), editarMiPerfil);
usuariosRoutes.put('/mi-perfil/contrasena', autorizar('MI_PERFIL', 'MODIFICAR'), editarMiContrasena);
