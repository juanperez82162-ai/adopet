import oracledb from 'oracledb';
import { config } from './env.js';

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool;

export async function iniciarPool() {
    pool = await oracledb.createPool({
        user: config.oracle.usuario,
        password: config.oracle.contrasena,
        connectString: config.oracle.cadenaConexion,
        poolMin: 2,
        poolMax: 10,
        poolIncrement: 1
    });

    return pool;
}

export async function obtenerConexion() {
    if (!pool) {
        throw new Error('El pool de conexiones no ha sido inicializado');
    }

    return pool.getConnection();
}

export async function cerrarPool() {
    if (pool) {
        await pool.close(10);
        pool = undefined;
    }
}