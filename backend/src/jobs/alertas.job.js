// JOB de alertas: avisa a los adoptantes de los seguimientos que ya pueden responder y al staff de checkpoints sin responder, trámites por
// vencer y periodos de prueba cumplidos. Cada alerta se crea una sola vez, así
// que puede correr cuantas veces haga falta. Corre al arrancar el servidor y
// luego cada hora (un seguimiento puede habilitarse a cualquier hora), hora de Bogotá. La lógica está en los
// services; aquí solo se agenda.

import cron from 'node-cron';
import { alertarCheckpointsNoAtendidos, alertarCheckpointsDisponibles } from '../modules/seguimientos/seguimientos.service.js';
import { alertarTramitesPorVencer, alertarPruebasCumplidas } from '../modules/solicitudes/solicitudes.service.js';

const ALERTAS = [
    ['seguimientos por responder (adoptantes)', alertarCheckpointsDisponibles],
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
    cron.schedule('0 * * * *', ejecutar, { timezone: 'America/Bogota' });
    return ejecutar();
}
