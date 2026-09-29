import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';
import { autorizar } from '../../middlewares/permisos.middleware.js';
import { verMatriz, guardar, nuevoPerfil, renombrar, cambiarEstado } from './accesos.controller.js';

export const accesosRoutes = Router();

accesosRoutes.use(autenticar);

// Matriz de permisos
accesosRoutes.get('/', autorizar('ACCESOS', 'CONSULTAR'), verMatriz);
accesosRoutes.put('/:idPerfil', autorizar('ACCESOS', 'MODIFICAR'), guardar);

// Perfiles (los roles son fijos)
accesosRoutes.post('/perfiles', autorizar('ACCESOS', 'CREAR'), nuevoPerfil);
accesosRoutes.put('/perfiles/:idPerfil', autorizar('ACCESOS', 'MODIFICAR'), renombrar);
accesosRoutes.patch('/perfiles/:idPerfil/estado', autorizar('ACCESOS', 'ELIMINAR'), cambiarEstado);
