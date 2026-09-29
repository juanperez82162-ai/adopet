import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';
import { autorizar } from '../../middlewares/permisos.middleware.js';
import {
    resolverCatalogo,
    listarPublico,
    listarAdmin,
    crearValor,
    renombrarValor,
    cambiarEstadoValor
} from './catalogos.controller.js';

export const catalogosRoutes = Router();

catalogosRoutes.param('catalogo', resolverCatalogo);

// Lectura pública: solo valores activos, para llenar formularios.
catalogosRoutes.get('/:catalogo', listarPublico);

// Administración: requiere sesión y permiso sobre el módulo CATALOGOS.
catalogosRoutes.get('/:catalogo/admin', autenticar, autorizar('CATALOGOS', 'CONSULTAR'), listarAdmin);
catalogosRoutes.post('/:catalogo', autenticar, autorizar('CATALOGOS', 'CREAR'), crearValor);
catalogosRoutes.put('/:catalogo/:id', autenticar, autorizar('CATALOGOS', 'MODIFICAR'), renombrarValor);
catalogosRoutes.patch('/:catalogo/:id/estado', autenticar, autorizar('CATALOGOS', 'ELIMINAR'), cambiarEstadoValor);
