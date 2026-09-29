import { exito } from '../../utils/respuesta.js';
import { obtenerResumen } from './inicio.service.js';

export async function verResumen(req, res) {
    // El documento sale del token: cada quien recibe SU resumen.
    return exito(res, await obtenerResumen(req.usuario.documento));
}
