// Apoyo común de las pruebas.
//
// Las pruebas NO usan Oracle: reemplazan el repositorio de un módulo por
// funciones falsas (mocks) que devuelven lo que cada prueba necesita.
// Así se prueba solo la lógica del service, y las pruebas corren en
// GitHub Actions, donde no hay base de datos.
//
// Importante: el mock debe declararse ANTES de importar el service, por
// eso los services se importan con await import(...) después de simular().

import { mock } from 'node:test';

const VERSION_NODE = Number(process.versions.node.split('.')[0]);

// config/env.js exige JWT_SECRETO. En GitHub no hay .env, así que las
// pruebas usan uno de mentira (nunca el real).
process.env.JWT_SECRETO ??= 'secreto-solo-para-pruebas';

// Ruta absoluta a un archivo de src/, en el formato que usa import().
export function rutaSrc(relativa) {
    return new URL(`../src/${relativa}`, import.meta.url).href;
}

// Reemplaza un módulo de src/ por funciones falsas con los nombres dados.
// Cada función, si una prueba la llama sin haberle dicho qué devolver,
// falla con un mensaje claro. Se configura en cada prueba con:
//     repositorio.nombreFuncion.mock.mockImplementation(async () => valor);
export function simular(relativa, nombres) {
    const funciones = Object.fromEntries(nombres.map((nombre) => [
        nombre,
        mock.fn(async () => {
            throw new Error(`La prueba no esperaba que se llamara a ${nombre}()`);
        })
    ]));

    // Node 24 llama a esta opción "exports"; las versiones anteriores, "namedExports".
    const opcion = VERSION_NODE >= 24 ? 'exports' : 'namedExports';
    mock.module(rutaSrc(relativa), { [opcion]: funciones });
    return funciones;
}

// Deja todas las funciones falsas sin configurar y con el conteo en cero.
export function reiniciar(funciones) {
    for (const funcion of Object.values(funciones)) {
        funcion.mock.resetCalls();
        funcion.mock.restore();
    }
}
