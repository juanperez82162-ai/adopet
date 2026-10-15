// Almacén de fotos en el disco del servidor. En la base solo se guarda la
// ruta (RUTA_ARCHIVO), nunca la imagen. El nombre lo genera el servidor
// (UUID): el que pone el usuario se ignora, así no hay choques ni rutas
// maliciosas. La ruta guardada es relativa a config.fotos.carpeta.

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config/env.js';

const SUBCARPETA = 'mascotas';

// Guarda el archivo y devuelve la ruta relativa, por ejemplo
// "mascotas/3f2a…c1.jpg".
export async function guardarFoto(buffer, extension) {
    const relativa = `${SUBCARPETA}/${randomUUID()}.${extension}`;
    const absoluta = path.join(config.fotos.carpeta, relativa);

    await fs.mkdir(path.dirname(absoluta), { recursive: true });
    await fs.writeFile(absoluta, buffer);
    return relativa;
}

// Borra el archivo del disco. Se usa para deshacer una subida que la base
// no llegó a guardar, y al eliminar una foto: es la única excepción a
// "nada se borra", porque una foto no es un dato de negocio.
export async function borrarFoto(relativa) {
    await fs.rm(path.join(config.fotos.carpeta, relativa), { force: true });
}
