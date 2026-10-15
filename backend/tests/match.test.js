// Motor de match: función pura, no necesita simulaciones.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcularMatch, estaDescartada, mejoresCoincidencias, PESOS } from '../src/modules/solicitudes/match.js';

const adoptante = (c = {}) => ({
    nivelVivienda: 3, tieneEspacioExterior: false, nivelTiempo: 3,
    experienciaPrevia: true, dispuestoNecesidadesEspeciales: true,
    tieneNinosHogar: false, tieneOtrasMascotasHogar: false, ...c
});

const mascota = (m = {}) => ({
    nombre: 'Luna', nivelTamanio: 2, nivelEnergia: 2,
    compatibleNinos: true, compatibleOtrasMascotas: true,
    tieneNecesidadesEspeciales: false, ...m
});

describe('calcularMatch', () => {
    it('los pesos suman 100', () => {
        assert.equal(Object.values(PESOS).reduce((a, b) => a + b, 0), 100);
    });

    it('da 100 cuando todo encaja', () => {
        assert.deepEqual(calcularMatch(adoptante(), mascota()), { descartada: false, puntaje: 100 });
    });

    it('un nivel de espacio faltante resta la mitad del peso del espacio', () => {
        // Vivienda 1 (habitación) vs mascota grande (3): faltan 2 niveles → 0 puntos de espacio.
        const r = calcularMatch(adoptante({ nivelVivienda: 1 }), mascota({ nivelTamanio: 3 }));
        assert.equal(r.puntaje, 65);
        // Vivienda 2 vs grande: falta 1 nivel → 50% del peso (35) = 17.5 → total 82.5 → 83.
        const r2 = calcularMatch(adoptante({ nivelVivienda: 2 }), mascota({ nivelTamanio: 3 }));
        assert.equal(r2.puntaje, 83);
    });

    it('el espacio exterior suma un nivel de espacio (máximo 3)', () => {
        const sin = calcularMatch(adoptante({ nivelVivienda: 2 }), mascota({ nivelTamanio: 3 }));
        const con = calcularMatch(adoptante({ nivelVivienda: 2, tieneEspacioExterior: true }), mascota({ nivelTamanio: 3 }));
        assert.ok(con.puntaje > sin.puntaje);
        assert.equal(con.puntaje, 100);
    });

    it('poco tiempo con una mascota muy activa baja el puntaje', () => {
        const r = calcularMatch(adoptante({ nivelTiempo: 1 }), mascota({ nivelEnergia: 3 }));
        assert.equal(r.puntaje, 65);
    });

    it('tener otras mascotas con una mascota no compatible resta el peso completo', () => {
        const r = calcularMatch(adoptante({ tieneOtrasMascotasHogar: true }), mascota({ compatibleOtrasMascotas: false }));
        assert.equal(r.puntaje, 80);
    });

    it('sin experiencia y con mascota exigente resta parte del peso de experiencia', () => {
        const r = calcularMatch(adoptante({ experienciaPrevia: false }), mascota({ nivelTamanio: 3 }));
        assert.equal(r.puntaje, 94);
    });

    it('sin experiencia y con mascota fácil no resta nada', () => {
        const r = calcularMatch(adoptante({ experienciaPrevia: false }), mascota());
        assert.equal(r.puntaje, 100);
    });
});

describe('estaDescartada', () => {
    it('descarta si hay niños y la mascota no es compatible con niños', () => {
        assert.equal(estaDescartada(adoptante({ tieneNinosHogar: true }), mascota({ compatibleNinos: false })), true);
    });

    it('no descarta si hay niños y la mascota sí es compatible', () => {
        assert.equal(estaDescartada(adoptante({ tieneNinosHogar: true }), mascota()), false);
    });

    it('descarta si la mascota tiene necesidades especiales y no está dispuesto', () => {
        const c = adoptante({ dispuestoNecesidadesEspeciales: false });
        assert.equal(estaDescartada(c, mascota({ tieneNecesidadesEspeciales: true })), true);
    });

    it('una descartada devuelve puntaje 0', () => {
        const r = calcularMatch(adoptante({ tieneNinosHogar: true }), mascota({ compatibleNinos: false }));
        assert.deepEqual(r, { descartada: true, puntaje: 0 });
    });
});

describe('mejoresCoincidencias', () => {
    const lista = [
        mascota({ nombre: 'Bruno', nivelTamanio: 3 }),
        mascota({ nombre: 'Ana' }),
        mascota({ nombre: 'Zeta' }),
        mascota({ nombre: 'Kira', compatibleNinos: false }),
        mascota({ nombre: 'Rex', nivelTamanio: 3, nivelEnergia: 3 })
    ];

    it('ordena de mayor a menor, empata por nombre y respeta la cantidad', () => {
        const r = mejoresCoincidencias(adoptante({ tieneNinosHogar: true }), lista, 60, 3);
        assert.deepEqual(r.map((x) => x.mascota.nombre), ['Ana', 'Bruno', 'Rex']);
    });

    it('deja fuera las descartadas', () => {
        const r = mejoresCoincidencias(adoptante({ tieneNinosHogar: true }), lista, 0, 10);
        assert.ok(!r.some((x) => x.mascota.nombre === 'Kira'));
    });

    it('deja fuera las que no alcanzan el umbral', () => {
        const c = adoptante({ nivelVivienda: 1, nivelTiempo: 1 });
        const r = mejoresCoincidencias(c, [mascota({ nivelTamanio: 3, nivelEnergia: 3 })], 60, 3);
        assert.deepEqual(r, []);
    });
});
