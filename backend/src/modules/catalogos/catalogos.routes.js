import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';
import { autorizar } from '../../middlewares/permisos.middleware.js';
import {
    resolverCatalogo,
    listarDefiniciones,
    listarPublico,
    listarAdmin,
    crearValor,
    modificarValor,
    cambiarEstadoValor
} from './catalogos.controller.js';
import {
    listarRazasPublico,
    listarRazasAdmin,
    crearRazaValor,
    renombrarRazaValor,
    cambiarEstadoRazaValor
} from './razas.controller.js';

export const catalogosRoutes = Router();

// Razas va ANTES de las rutas con :catalogo, para que "razas" no se
// confunda con el nombre de un catálogo simple.
catalogosRoutes.get('/razas', listarRazasPublico);
catalogosRoutes.get('/razas/admin', autenticar, autorizar('CATALOGOS', 'CONSULTAR'), listarRazasAdmin);
catalogosRoutes.post('/razas', autenticar, autorizar('CATALOGOS', 'CREAR'), crearRazaValor);
catalogosRoutes.put('/razas/:id', autenticar, autorizar('CATALOGOS', 'MODIFICAR'), renombrarRazaValor);
catalogosRoutes.patch('/razas/:id/estado', autenticar, autorizar('CATALOGOS', 'ELIMINAR'), cambiarEstadoRazaValor);

catalogosRoutes.param('catalogo', resolverCatalogo);

// Lista de catálogos administrables y sus reglas (para la pantalla).
catalogosRoutes.get('/', autenticar, autorizar('CATALOGOS', 'CONSULTAR'), listarDefiniciones);

// Lectura pública: solo valores activos, para llenar formularios.
catalogosRoutes.get('/:catalogo', listarPublico);

// Administración: requiere sesión y permiso sobre el módulo CATALOGOS.
catalogosRoutes.get('/:catalogo/admin', autenticar, autorizar('CATALOGOS', 'CONSULTAR'), listarAdmin);
catalogosRoutes.post('/:catalogo', autenticar, autorizar('CATALOGOS', 'CREAR'), crearValor);
catalogosRoutes.put('/:catalogo/:id', autenticar, autorizar('CATALOGOS', 'MODIFICAR'), modificarValor);
catalogosRoutes.patch('/:catalogo/:id/estado', autenticar, autorizar('CATALOGOS', 'ELIMINAR'), cambiarEstadoValor);
