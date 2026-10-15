// JOB de vencimiento: vence los trámites activos cuyo plazo se cumplió y
// libera sus mascotas. Corre una vez al arrancar el servidor (por si estuvo
// apagado) y luego todos los días a las 00:05, hora de Bogotá.
// La lógica está en el service de solicitudes; aquí solo se agenda.

import cron from 'node-cron';
import { vencerSolicitudes } from '../modules/solicitudes/solicitudes.service.js';

async function ejecutar() {
    try {
        const vencidas = await vencerSolicitudes();

        if (vencidas > 0) {
            console.log(`Vencimiento: ${vencidas} trámite(s) vencido(s) y sus mascotas liberadas.`);
        }
    } catch (err) {
        console.error('Falló el job de vencimiento:', err.message);
    }
}

export function iniciarJobVencimiento() {
    cron.schedule('5 0 * * *', ejecutar, { timezone: 'America/Bogota' });
    return ejecutar();
}
