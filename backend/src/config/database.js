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

// Presta una conexión del pool, ejecuta el trabajo y la devuelve SIEMPRE,
// salga bien o mal. Así ningún repositorio puede olvidar cerrarla: una
// conexión sin cerrar queda ocupada y, cuando se acaban las del pool,
// la aplicación se congela.
//
// Uso en un repositorio:
//     export async function listar() {
//         return conConexion(async (conexion) => {
//             const resultado = await conexion.execute('SELECT ...');
//             return resultado.rows;
//         });
//     }
export async function conConexion(trabajo) {
    const conexion = await obtenerConexion();

    try {
        return await trabajo(conexion);
    } finally {
        await conexion.close();
    }
}

// Igual que conConexion, pero todo lo que haga el trabajo es UNA transacción:
// si termina bien se hace commit; si algo falla, rollback y no cambia nada.
// Dentro del trabajo NO se usa autoCommit.
export async function enTransaccion(trabajo) {
    return conConexion(async (conexion) => {
        try {
            const resultado = await trabajo(conexion);
            await conexion.commit();
            return resultado;
        } catch (err) {
            await conexion.rollback();
            throw err;
        }
    });
}

export async function cerrarPool() {
    if (pool) {
        await pool.close(10);
        pool = undefined;
    }
}