import { app } from './src/app.js';
import { config } from './src/config/env.js';
import { iniciarPool, cerrarPool } from './src/config/database.js';
import { iniciarJobVencimiento } from './src/jobs/vencimiento.job.js';

async function iniciar() {
    try {
        await iniciarPool();
        console.log('Pool de conexiones a Oracle iniciado');

        app.listen(config.puerto, () => {
            console.log(`Servidor escuchando en http://localhost:${config.puerto}`);
        });

        // Tareas programadas (node-cron).
        iniciarJobVencimiento();
    } catch (err) {
        console.error('No se pudo iniciar el servidor:', err.message);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    console.log('\nCerrando servidor...');
    await cerrarPool();
    process.exit(0);
});

iniciar();