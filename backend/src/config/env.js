import dotenv from 'dotenv';

dotenv.config();

export const config = {
    puerto: process.env.PORT || 3000,

    oracle: {
        usuario: process.env.ORACLE_USER,
        contrasena: process.env.ORACLE_PASSWORD,
        cadenaConexion: process.env.ORACLE_CONNECTION_STRING
    },

    negocio: {
        umbralMatch: Number(process.env.UMBRAL_MATCH),
        diasProcesoFormal: Number(process.env.DIAS_PROCESO_FORMAL),
        diasRespuestaCheckpoint: Number(process.env.DIAS_RESPUESTA_CHECKPOINT)
    }
};