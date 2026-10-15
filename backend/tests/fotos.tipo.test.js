// El tipo de imagen se decide por los primeros bytes, no por el nombre.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectarTipoImagen } from '../src/modules/mascotas/fotos.tipo.js';

describe('Tipo de imagen', () => {
    it('reconoce JPG, PNG y WEBP', () => {
        assert.equal(detectarTipoImagen(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), 'jpg');
        assert.equal(detectarTipoImagen(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])), 'png');
        assert.equal(detectarTipoImagen(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')])), 'webp');
    });

    it('rechaza GIF, otros RIFF (como WAV), texto, vacíos y valores que no son buffer', () => {
        assert.equal(detectarTipoImagen(Buffer.from('GIF89a000000')), null);
        assert.equal(detectarTipoImagen(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE')])), null);
        assert.equal(detectarTipoImagen(Buffer.from('<?php echo 1; ?>')), null);
        assert.equal(detectarTipoImagen(Buffer.alloc(0)), null);
        assert.equal(detectarTipoImagen(null), null);
        assert.equal(detectarTipoImagen('texto'), null);
    });
});
