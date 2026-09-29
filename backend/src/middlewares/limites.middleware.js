import { rateLimit } from 'express-rate-limit';
import { error } from '../utils/respuesta.js';

// Límite de intentos por IP en las rutas que un atacante podría usar
// para adivinar contraseñas o tokens, o para llenar de correos a alguien.
//
// Los contadores viven en la memoria del backend: se reinician cuando el
// backend se reinicia. Para varios servidores haría falta un almacén
// compartido (por ejemplo Redis).

const MINUTO = 60 * 1000;

// Respuesta 429 con el formato estándar de la API.
function crearLimite({ ventanaMinutos, maximo, soloFallidos = false }) {
    return rateLimit({
        windowMs: ventanaMinutos * MINUTO,
        limit: maximo,
        // true: las peticiones que salen bien (código < 400) no cuentan.
        skipSuccessfulRequests: soloFallidos,
        // Cabeceras estándar RateLimit-*: el cliente sabe cuánto le queda.
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: (req, res) => error(
            res,
            429,
            'DEMASIADOS_INTENTOS',
            `Demasiados intentos. Espera ${ventanaMinutos} minutos e inténtalo de nuevo.`
        )
    });
}

// Login: 10 intentos FALLIDOS cada 15 minutos. Quien entra bien no se bloquea.
export const limiteLogin = crearLimite({ ventanaMinutos: 15, maximo: 10, soloFallidos: true });

// Recuperar contraseña: 5 solicitudes por hora (cada una envía un correo).
export const limiteRecuperar = crearLimite({ ventanaMinutos: 60, maximo: 5 });

// Restablecer contraseña: 10 intentos cada 15 minutos (evita probar tokens).
export const limiteRestablecer = crearLimite({ ventanaMinutos: 15, maximo: 10 });
