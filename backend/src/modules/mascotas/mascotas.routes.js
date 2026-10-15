// Capa de RUTAS de MASCOTAS: solo dice qué URL llama a qué función del
// controller y qué permiso exige. No tiene lógica.
// Todo el módulo exige sesión: sin iniciar sesión no se ve nada de mascotas.

import { Router } from 'express';
import multer from 'multer';
import { autenticar } from '../../middlewares/autenticacion.middleware.js';
import { autorizar } from '../../middlewares/permisos.middleware.js';
import { ErrorNegocio } from '../../utils/errores.js';
import { TAMANIO_MAXIMO_FOTO } from './mascotas.service.js';
import {
    listar, ver, crear, modificar, cambiarEstado,
    subir, verFoto, hacerPrincipal, estados, eliminarFotoMascota
} from './mascotas.controller.js';

// Debe coincidir con OPCIONES_MENU.NOMBRE_OPCION.
const OPCION = 'MASCOTAS';

// La foto llega en el campo "foto" de un formulario multipart y se queda
// en memoria (máximo 5 MB): el service revisa su contenido antes de
// escribirla en el disco.
const recibir = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TAMANIO_MAXIMO_FOTO, files: 1 }
}).single('foto');

// Traduce los errores de multer al formato de errores de la API.
function recibirFoto(req, res, next) {
    recibir(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError) {
            const demasiadoGrande = err.code === 'LIMIT_FILE_SIZE';
            const mensaje = demasiadoGrande
                ? `La foto supera el máximo de ${TAMANIO_MAXIMO_FOTO / 1024 / 1024} MB.`
                : 'No se pudo leer la foto. Envía una sola imagen en el campo "foto".';

            return next(new ErrorNegocio(demasiadoGrande ? 413 : 400, 'FOTO_INVALIDA', mensaje, { foto: mensaje }));
        }

        return next(err);
    });
}

export const mascotasRoutes = Router();

mascotasRoutes.use(autenticar);

// La acción de cada ruta sale de PERFILES_OPCIONES:
// CONSULTAR = la fila existe · CREAR · MODIFICAR · ELIMINAR (= desactivar).
mascotasRoutes.get('/', autorizar(OPCION, 'CONSULTAR'), listar);
// Va antes de '/:id': si no, Express tomaría "estados" como un id.
mascotasRoutes.get('/estados', autorizar(OPCION, 'CONSULTAR'), estados);
mascotasRoutes.get('/:id', autorizar(OPCION, 'CONSULTAR'), ver);
mascotasRoutes.post('/', autorizar(OPCION, 'CREAR'), crear);
mascotasRoutes.put('/:id', autorizar(OPCION, 'MODIFICAR'), modificar);

// En ADOPET nada se borra: "eliminar" es desactivar, y usa la acción ELIMINAR.
mascotasRoutes.patch('/:id/estado', autorizar(OPCION, 'ELIMINAR'), cambiarEstado);

// Fotos: subir o cambiar la principal es modificar la mascota.
mascotasRoutes.post('/:id/fotos', autorizar(OPCION, 'MODIFICAR'), recibirFoto, subir);
mascotasRoutes.get('/fotos/:idFoto', autorizar(OPCION, 'CONSULTAR'), verFoto);
mascotasRoutes.patch('/fotos/:idFoto/principal', autorizar(OPCION, 'MODIFICAR'), hacerPrincipal);

// Las fotos sí se pueden borrar de verdad (única excepción a "nada se borra").
mascotasRoutes.delete('/fotos/:idFoto', autorizar(OPCION, 'MODIFICAR'), eliminarFotoMascota);
