import express from 'express';
import cors from 'cors';
import { obtenerConexion } from './config/database.js';
import { exito, error } from './utils/respuesta.js';
import { manejarErrores } from './middlewares/errores.middleware.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { catalogosRoutes } from './modules/catalogos/catalogos.routes.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
    let conexion;

    try {
        conexion = await obtenerConexion();
        const resultado = await conexion.execute('SELECT 1 AS PRUEBA FROM DUAL');

        return exito(res, {
            servidor: 'activo',
            baseDatos: resultado.rows.length > 0 ? 'conectada' : 'sin respuesta'
        });
    } catch (err) {
        console.error('Error en /api/health:', err.message);
        return error(res, 500, 'ERROR_CONEXION_BD', 'No se pudo conectar con la base de datos.');
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
});

// Rutas de cada módulo
app.use('/api/auth', authRoutes);
app.use('/api/catalogos', catalogosRoutes);

// El manejador de errores va SIEMPRE al final, después de todas las rutas.
app.use(manejarErrores);
