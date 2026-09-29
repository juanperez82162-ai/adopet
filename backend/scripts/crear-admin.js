// ADOPET - Crea el primer usuario Admin en la base local.
// Se corre UNA vez por máquina, desde la carpeta backend:
//   npm run crear-admin
// Pide los datos por consola. La contraseña nunca queda en el repositorio.
// Pasa por las MISMAS validaciones del registro público.

import readline from 'node:readline/promises';
import { stdin as entrada, stdout as salida } from 'node:process';
import { iniciarPool, cerrarPool } from '../src/config/database.js';
import { crearAdministrador } from '../src/modules/auth/auth.service.js';
import { ErrorNegocio } from '../src/utils/errores.js';

const consola = readline.createInterface({ input: entrada, output: salida });

async function preguntar(texto) {
    return (await consola.question(texto)).trim();
}

// Pide la contraseña mostrando asteriscos. Lee el teclado directamente,
// por eso se llama cuando la consola de preguntas ya está cerrada.
function preguntarOculto(texto) {
    return new Promise((resolver) => {
        const teclado = process.stdin;
        let valor = '';

        salida.write(texto);
        teclado.setRawMode?.(true);
        teclado.resume();

        function alTeclear(datos) {
            for (const tecla of datos.toString('utf8')) {
                if (tecla === '\r' || tecla === '\n') {
                    teclado.off('data', alTeclear);
                    teclado.setRawMode?.(false);
                    teclado.pause();
                    salida.write('\n');
                    resolver(valor);
                    return;
                }

                if (tecla === '\u0003') {
                    salida.write('\n');
                    process.exit(1);
                }

                if (tecla === '\u007f' || tecla === '\b') {
                    if (valor.length > 0) {
                        valor = valor.slice(0, -1);
                        salida.write('\b \b');
                    }
                    continue;
                }

                valor += tecla;
                salida.write('*');
            }
        }

        teclado.on('data', alTeclear);
    });
}

async function main() {
    console.log('=== ADOPET: crear usuario Admin ===\n');
    console.log('Tipos de documento: 1 = CC, 2 = CE, 4 = Pasaporte');
    console.log('Ciudades: 1 = Medellín, 2 = Bello, 3 = Itagüí, 4 = Envigado ...\n');

    const datos = {
        documento: await preguntar('Documento: '),
        idTipoDocumento: Number(await preguntar('Tipo de documento (número): ')),
        primerNombre: await preguntar('Primer nombre: '),
        segundoNombre: await preguntar('Segundo nombre (Enter si no tiene): '),
        primerApellido: await preguntar('Primer apellido: '),
        segundoApellido: await preguntar('Segundo apellido (Enter si no tiene): '),
        correo: await preguntar('Correo: '),
        telefono: await preguntar('Teléfono (celular o fijo de 10 dígitos): '),
        direccion: await preguntar('Dirección: '),
        idCiudad: Number(await preguntar('Ciudad (número): ')),
        fechaNacimiento: await preguntar('Fecha de nacimiento (AAAA-MM-DD): ')
    };

    consola.close();
    datos.contrasena = await preguntarOculto('Contraseña (mín. 8, letras, números y un carácter especial): ');

    await iniciarPool();

    try {
        const admin = await crearAdministrador(datos);
        console.log(`\nAdmin creado: ${admin.nombre} (${admin.correo})`);
    } catch (err) {
        if (err instanceof ErrorNegocio) {
            console.error(`\nNo se pudo crear: ${err.message}`);

            for (const [campo, mensaje] of Object.entries(err.detalles || {})) {
                console.error(`  - ${campo}: ${mensaje}`);
            }
        } else {
            console.error('\nError inesperado:', err.message);
        }
        process.exitCode = 1;
    } finally {
        await cerrarPool();
    }
}

main();
