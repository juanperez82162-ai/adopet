// JOB de alertas al staff: avisa de checkpoints sin responder, trámites por
// vencer y periodos de prueba cumplidos. Cada alerta se crea una sola vez, así
// que puede correr cuantas veces haga falta. Corre al arrancar el servidor y
// luego todos los días a las 07:00, hora de Bogotá. La lógica está en los
// services; aquí solo se agenda.

import cron from 'node-cron';
import { alertarCheckpointsNoAtendidos } from '../modules/seguimientos/seguimientos.service.js';
import { alertarTramitesPorVencer, alertarPruebasCumplidas } from '../modules/solicitudes/solicitudes.service.js';

const ALERTAS = [
    ['checkpoints sin responder', alertarCheckpointsNoAtendidos],
    ['trámites por vencer', alertarTramitesPorVencer],
    ['periodos de prueba cumplidos', alertarPruebasCumplidas]
];

async function ejecutar() {
    for (const [nombre, alertar] of ALERTAS) {
        try {
            const nuevas = await alertar();

            if (nuevas > 0) {
                console.log(`Alertas: ${nuevas} nueva(s) de ${nombre}.`);
            }
        } catch (err) {
            console.error(`Falló el job de alertas (${nombre}):`, err.message);
        }
    }
}

export function iniciarJobAlertas() {
    cron.schedule('0 7 * * *', ejecutar, { timezone: 'America/Bogota' });
    return ejecutar();
}
