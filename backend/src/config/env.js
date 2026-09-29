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

    negocio: {
        umbralMatch: Number(process.env.UMBRAL_MATCH),
        diasProcesoFormal: Number(process.env.DIAS_PROCESO_FORMAL),
        diasRespuestaCheckpoint: Number(process.env.DIAS_RESPUESTA_CHECKPOINT)
    }
};