import { obtenerConexion } from '../../config/database.js';

export async function buscarPermiso(documento, nombreOpcion) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT po.CREAR, po.MODIFICAR, po.ELIMINAR
               FROM USUARIOS u
               JOIN PERFILES p           ON p.ID_PERFIL      = u.ID_PERFIL
               JOIN PERFILES_OPCIONES po ON po.ID_PERFIL     = p.ID_PERFIL
               JOIN OPCIONES_MENU o      ON o.ID_OPCION_MENU = po.ID_OPCION_MENU
              WHERE u.DOCUMENTO     = :documento
                AND o.NOMBRE_OPCION = :nombreOpcion
                AND u.ACTIVO = 'S'
                AND p.ACTIVO = 'S'
                AND o.ACTIVO = 'S'`,
            { documento, nombreOpcion }
        );

        return resultado.rows[0] || null;
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}