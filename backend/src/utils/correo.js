import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

// Único punto del backend que sabe enviar correos.
// Sin CORREO_HOST configurado, el correo se imprime en la consola:
// así se puede probar todo el flujo sin una cuenta de correo real.

let transporte = null;

function obtenerTransporte() {
    if (!transporte) {
        transporte = nodemailer.createTransport({
            host: config.correo.host,
            port: config.correo.puerto,
            secure: config.correo.puerto === 465,
            auth: {
                user: config.correo.usuario,
                pass: config.correo.contrasena
            }
        });
    }

    return transporte;
}

export async function enviarCorreo({ para, asunto, texto, html }) {
    if (!config.correo.host) {
        console.log('\n================ CORREO (modo desarrollo, no se envió) ================');
        console.log(`Para:    ${para}`);
        console.log(`Asunto:  ${asunto}`);
        console.log(texto);
        console.log('========================================================================\n');
        return;
    }

    await obtenerTransporte().sendMail({
        from: config.correo.remitente,
        to: para,
        subject: asunto,
        text: texto,
        html
    });
}
