import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';
import { autorizar } from '../../middlewares/permisos.middleware.js';
import {
    verMiPerfil,
    editarMiPerfil,
    editarMiContrasena,
    listar,
    listarPerfiles,
    ver,
    editar,
    cambiarPerfil,
    cambiarEstado
} from './usuarios.controller.js';

export const usuariosRoutes = Router();

// Todo el módulo exige sesión.
usuariosRoutes.use(autenticar);

// Mi perfil: el documento sale del token, así que cada quien solo toca lo suyo.
// (Van antes de /:documento para que "mi-perfil" no se tome como un documento.)
usuariosRoutes.get('/mi-perfil', autorizar('MI_PERFIL', 'CONSULTAR'), verMiPerfil);
usuariosRoutes.put('/mi-perfil', autorizar('MI_PERFIL', 'MODIFICAR'), editarMiPerfil);
usuariosRoutes.put('/mi-perfil/contrasena', autorizar('MI_PERFIL', 'MODIFICAR'), editarMiContrasena);

// Administración de usuarios: permiso del módulo USUARIOS.
// Desactivar o activar usa la acción ELIMINAR (en ADOPET nada se borra).
usuariosRoutes.get('/', autorizar('USUARIOS', 'CONSULTAR'), listar);
usuariosRoutes.get('/perfiles', autorizar('USUARIOS', 'CONSULTAR'), listarPerfiles);
usuariosRoutes.get('/:documento', autorizar('USUARIOS', 'CONSULTAR'), ver);
usuariosRoutes.put('/:documento', autorizar('USUARIOS', 'MODIFICAR'), editar);
usuariosRoutes.patch('/:documento/perfil', autorizar('USUARIOS', 'MODIFICAR'), cambiarPerfil);
usuariosRoutes.patch('/:documento/estado', autorizar('USUARIOS', 'ELIMINAR'), cambiarEstado);
