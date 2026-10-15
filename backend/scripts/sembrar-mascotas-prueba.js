// ADOPET - Crea mascotas de PRUEBA en la base local (solo para desarrollo).
// Se corre desde la carpeta backend:
//   npm run sembrar-mascotas
// Pasa por las MISMAS validaciones que el formulario de Mascotas. Si una
// mascota con ese nombre ya existe, la salta: se puede correr varias veces.
// No sube fotos: se agregan desde la pantalla Mascotas > Fotos.

import { iniciarPool, cerrarPool, conConexion } from '../src/config/database.js';
import { crearMascota } from '../src/modules/mascotas/mascotas.service.js';

const STAFF = { documento: 'script', rol: 'STAFF' };

// especie, raza, tamaño, energía y sexo se escriben por nombre, tal como quedaron en los catálogos (V6).
const MASCOTAS = [
    { nombre: 'Luna', especie: 'Perro', raza: 'Mestizo', meses: 14, tamanio: 'Mediano', sexo: 'Hembra', energia: 'Medio', ninos: true, mascotas: true, necesidades: null },
    { nombre: 'Rocky', especie: 'Perro', raza: 'Labrador', meses: 30, tamanio: 'Grande', sexo: 'Macho', energia: 'Alto', ninos: true, mascotas: true, necesidades: null },
    { nombre: 'Peque', especie: 'Perro', raza: 'Chihuahua', meses: 48, tamanio: 'Pequeño', sexo: 'Macho', energia: 'Medio', ninos: false, mascotas: false, necesidades: null },
    { nombre: 'Canela', especie: 'Perro', raza: 'Criollo', meses: 8, tamanio: 'Mediano', sexo: 'Hembra', energia: 'Alto', ninos: true, mascotas: false, necesidades: null },
    { nombre: 'Thor', especie: 'Perro', raza: 'Pastor Alemán', meses: 72, tamanio: 'Grande', sexo: 'Macho', energia: 'Bajo', ninos: false, mascotas: true, necesidades: 'Displasia de cadera: necesita medicación diaria y paseos cortos.' },
    { nombre: 'Misu', especie: 'Gato', raza: 'Mestizo', meses: 12, tamanio: 'Pequeño', sexo: 'Hembra', energia: 'Medio', ninos: true, mascotas: true, necesidades: null },
    { nombre: 'Simba', especie: 'Gato', raza: 'Siamés', meses: 36, tamanio: 'Pequeño', sexo: 'Macho', energia: 'Bajo', ninos: false, mascotas: false, necesidades: null },
    { nombre: 'Nube', especie: 'Gato', raza: 'Persa', meses: 60, tamanio: 'Pequeño', sexo: 'Hembra', energia: 'Bajo', ninos: true, mascotas: true, necesidades: 'Ciego de un ojo; requiere un hogar sin escaleras.' }
];

// Devuelve { clave → id } de un catálogo, por NOMBRE.
async function idPorNombre(conexion, sql) {
    const r = await conexion.execute(sql);
    return Object.fromEntries(r.rows.map((f) => [f.CLAVE, f.ID]));
}

async function main() {
    await iniciarPool();

    try {
        const { razas, tamanios, sexos, energias, existentes } = await conConexion(async (c) => ({
            razas: await idPorNombre(c, `SELECT e.NOMBRE || '|' || r.NOMBRE AS CLAVE, r.ID_RAZA AS ID
                                           FROM RAZAS r JOIN ESPECIES e ON e.ID_ESPECIE = r.ID_ESPECIE`),
            tamanios: await idPorNombre(c, 'SELECT NOMBRE AS CLAVE, ID_TAMANIO AS ID FROM TAMANIOS'),
            sexos: await idPorNombre(c, 'SELECT NOMBRE AS CLAVE, ID_SEXO AS ID FROM SEXOS'),
            energias: await idPorNombre(c, 'SELECT NOMBRE AS CLAVE, ID_NIVEL_ENERGIA AS ID FROM NIVELES_ENERGIA'),
            existentes: new Set((await c.execute('SELECT NOMBRE FROM MASCOTAS')).rows.map((f) => f.NOMBRE))
        }));

        for (const m of MASCOTAS) {
            if (existentes.has(m.nombre)) {
                console.log(`- ${m.nombre}: ya existe, se salta.`);
                continue;
            }

            await crearMascota({
                nombre: m.nombre,
                idRaza: razas[`${m.especie}|${m.raza}`],
                edadMesesIngreso: m.meses,
                idTamanio: tamanios[m.tamanio],
                idSexo: sexos[m.sexo],
                idNivelEnergia: energias[m.energia],
                compatibleNinos: m.ninos,
                compatibleOtrasMascotas: m.mascotas,
                tieneNecesidadesEspeciales: m.necesidades !== null,
                descripcionNecesidades: m.necesidades ?? undefined
            }, STAFF);

            console.log(`+ ${m.nombre}: creada.`);
        }
    } finally {
        await cerrarPool();
    }
}

main().catch((err) => {
    console.error('No se pudo sembrar:', err.message, err.detalles ?? '');
    process.exitCode = 1;
});
