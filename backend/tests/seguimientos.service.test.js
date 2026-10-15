// Seguimientos: por ahora solo programar los checkpoints. El repositorio se simula.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { simular } from './apoyo.js';

const repo = simular('modules/seguimientos/seguimientos.repository.js', ['programarSeguimientos']);
const { programarCheckpoints } = await import('../src/modules/seguimientos/seguimientos.service.js');

describe('programarCheckpoints', () => {
    it('programa los seguimientos desde la fecha de entrega y devuelve cuántos creó', async () => {
        const entrega = new Date('2026-10-15T10:00:00');
        repo.programarSeguimientos.mock.mockImplementation(async () => 3);

        assert.equal(await programarCheckpoints(10, entrega), 3);
        assert.deepEqual(repo.programarSeguimientos.mock.calls[0].arguments, [10, entrega]);
    });
});
