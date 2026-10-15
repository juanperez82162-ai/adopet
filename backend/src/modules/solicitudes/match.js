// MOTOR DE MATCH: función pura (sin base de datos, sin HTTP).
// Compara el cuestionario del adoptante con una mascota y devuelve un
// puntaje de 0 a 100. Al ser pura se prueba fácil y se puede ajustar sin
// tocar el resto del módulo.
//
// Entradas (todo ya convertido a números y booleanos por el service):
//   cuestionario: { nivelVivienda 1-3, tieneEspacioExterior, nivelTiempo 1-3,
//                   experienciaPrevia, dispuestoNecesidadesEspeciales,
//                   tieneNinosHogar, tieneOtrasMascotasHogar }
//   mascota:      { nivelTamanio 1-3, nivelEnergia 1-3, compatibleNinos,
//                   compatibleOtrasMascotas, tieneNecesidadesEspeciales }
//
// Los niveles salen de la columna NIVEL de los catálogos TIPOS_VIVIENDA,
// TIEMPOS_DISPONIBLES, TAMANIOS y NIVELES_ENERGIA.

// Peso de cada criterio. Deben sumar 100.
export const PESOS = {
    espacio: 35,
    tiempo: 35,
    otrasMascotas: 20,
    experiencia: 10
};

// Puntaje de un criterio "necesidad vs capacidad" (ej. tamaño vs espacio):
// si la capacidad alcanza → 100; falta un nivel → 50; faltan dos → 0.
function puntajePorNivel(capacidad, necesidad) {
    const faltante = necesidad - capacidad;

    if (faltante <= 0) return 100;
    if (faltante === 1) return 50;
    return 0;
}

// Reglas que DESCARTAN a la mascota sin importar el puntaje, porque no son
// cuestión de gusto sino de seguridad o de cuidado:
//   - Hay niños en el hogar y la mascota no es compatible con niños.
//   - La mascota tiene necesidades especiales y el adoptante no está
//     dispuesto a atenderlas.
export function estaDescartada(cuestionario, mascota) {
    if (cuestionario.tieneNinosHogar && !mascota.compatibleNinos) return true;
    if (mascota.tieneNecesidadesEspeciales && !cuestionario.dispuestoNecesidadesEspeciales) return true;
    return false;
}

// Devuelve { descartada, puntaje } con el puntaje redondeado a entero.
export function calcularMatch(cuestionario, mascota) {
    if (estaDescartada(cuestionario, mascota)) {
        return { descartada: true, puntaje: 0 };
    }

    // Un espacio exterior suma un nivel al espacio de la vivienda (máximo 3).
    const espacio = Math.min(3, cuestionario.nivelVivienda + (cuestionario.tieneEspacioExterior ? 1 : 0));

    const espacioPuntos = puntajePorNivel(espacio, mascota.nivelTamanio);
    const tiempoPuntos = puntajePorNivel(cuestionario.nivelTiempo, mascota.nivelEnergia);

    const otrasMascotasPuntos =
        cuestionario.tieneOtrasMascotasHogar && !mascota.compatibleOtrasMascotas ? 0 : 100;

    // Sin experiencia, una mascota grande o muy activa es más difícil de manejar.
    const esExigente = mascota.nivelTamanio === 3 || mascota.nivelEnergia === 3;
    const experienciaPuntos = !cuestionario.experienciaPrevia && esExigente ? 40 : 100;

    const total =
        (espacioPuntos * PESOS.espacio +
            tiempoPuntos * PESOS.tiempo +
            otrasMascotasPuntos * PESOS.otrasMascotas +
            experienciaPuntos * PESOS.experiencia) / 100;

    return { descartada: false, puntaje: Math.round(total) };
}

// Ordena de mayor a menor puntaje, deja solo las que alcanzan el umbral y
// devuelve las primeras "cantidad". Empata por nombre para que el orden sea estable.
export function mejoresCoincidencias(cuestionario, mascotas, umbral, cantidad) {
    return mascotas
        .map((mascota) => ({ mascota, ...calcularMatch(cuestionario, mascota) }))
        .filter((r) => !r.descartada && r.puntaje >= umbral)
        .sort((a, b) => b.puntaje - a.puntaje || a.mascota.nombre.localeCompare(b.mascota.nombre, 'es'))
        .slice(0, cantidad);
}
