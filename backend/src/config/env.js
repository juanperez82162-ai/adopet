import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRETO) {
    throw new Error('Falta la variable JWT_SECRETO en el archivo .env');
}

export const config = {
    puerto: process.env.PORT || 3000,

    oracle: {
        usuario: process.env.ORACLE_USER,
        contrasena: process.env.ORACLE_PASSWORD,
        cadenaConexion: process.env.ORACLE_CONNECTION_STRING
    },

    jwt: {
        secreto: process.env.JWT_SECRETO,
        expira: process.env.JWT_EXPIRA || '8h'
    },

    // Envío de correos (recuperación de contraseña).
    // Si CORREO_HOST está vacío, el correo NO se envía: se imprime en la
    // consola del backend. Sirve para desarrollar sin una cuenta real.
    correo: {
        host: process.env.CORREO_HOST || '',
        puerto: Number(process.env.CORREO_PUERTO || 587),
        usuario: process.env.CORREO_USUARIO || '',
        contrasena: process.env.CORREO_CONTRASENA || '',
        remitente: process.env.CORREO_REMITENTE || 'ADOPET <no-responder@adopet.local>'
    },

    // Dirección del frontend, para armar los enlaces que van en los correos.
    frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),

    // Carpeta donde se guardan las fotos de las mascotas (fuera de git).
    // Si no es una ruta absoluta, se cuenta desde la carpeta backend/.
    fotos: {
        carpeta: path.resolve(
            fileURLToPath(new URL('../../', import.meta.url)),
            process.env.UPLOADS_DIR || 'uploads'
        )
    },

    negocio: {
        umbralMatch: Number(process.env.UMBRAL_MATCH || 60),
        diasProcesoFormal: Number(process.env.DIAS_PROCESO_FORMAL || 15),
        diasRespuestaCheckpoint: Number(process.env.DIAS_RESPUESTA_CHECKPOINT || 7)
    }
};
