// Reglas de formato del registro (auth.validaciones.js).
// Son funciones puras: no necesitan simular nada.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    limpiarNombre,
    errorNombre,
    errorDocumento,
    errorTelefono,
    errorContrasena,
    errorDireccion,
    errorFechaNacimiento,
    calcularEdad
} from '../src/modules/auth/auth.validaciones.js';

// Reglas de TIPOS_DOCUMENTO sembradas en la V7.
const CC = { soloNumeros: true, largoMinimo: 6, largoMaximo: 10 };
const PASAPORTE = { soloNumeros: false, largoMinimo: 5, largoMaximo: 20 };

// Fecha fija: si las pruebas usaran la fecha real, cambiarían de resultado con los días.
const HOY = new Date(2026, 8, 29); // 29 de septiembre de 2026

describe('Nombres', () => {
    it('se guardan con mayúscula inicial y sin espacios de sobra', () => {
        assert.equal(limpiarNombre('  maría   josé '), 'María José');
        assert.equal(limpiarNombre("o'neil"), "O'Neil");
    });

    it('aceptan tildes, ñ, apóstrofo y guion', () => {
        assert.equal(errorNombre('Muñoz', 'apellido', true), null);
        assert.equal(errorNombre('Pérez-Gómez', 'apellido', true), null);
    });

    it('rechazan números y símbolos', () => {
        assert.match(errorNombre('Juan2', 'nombre', true), /Solo letras/);
    });

    it('el segundo nombre es opcional, el primero no', () => {
        assert.equal(errorNombre('', 'segundo nombre', false), null);
        assert.match(errorNombre('', 'primer nombre', true), /Escribe/);
    });
});

describe('Documento', () => {
    it('CC: solo números, de 6 a 10 dígitos', () => {
        assert.equal(errorDocumento('1036123456', CC), null);
        assert.match(errorDocumento('12345', CC), /de 6 a 10/);
        assert.match(errorDocumento('10361234567', CC), /de 6 a 10/);
        assert.match(errorDocumento('AB12345', CC), /solo lleva números/);
    });

    it('Pasaporte: letras y números, de 5 a 20', () => {
        assert.equal(errorDocumento('AB123456', PASAPORTE), null);
        assert.match(errorDocumento('AB-123', PASAPORTE), /Solo letras y números/);
    });
});

describe('Teléfono', () => {
    it('acepta celular (3…) y fijo (60…) de 10 dígitos', () => {
        assert.equal(errorTelefono('3001234567'), null);
        assert.equal(errorTelefono('6041234567'), null);
    });

    it('rechaza otros formatos', () => {
        assert.notEqual(errorTelefono('2001234567'), null);
        assert.notEqual(errorTelefono('300123456'), null);
    });
});

describe('Contraseña', () => {
    it('exige 8 caracteres con letra, número y carácter especial', () => {
        assert.equal(errorContrasena('Perro123!'), null);
        assert.notEqual(errorContrasena('Perro123'), null);
        assert.notEqual(errorContrasena('perro!!!'), null);
        assert.notEqual(errorContrasena('Pe1!'), null);
    });

    it('no pasa de 72 caracteres (límite de bcrypt)', () => {
        assert.match(errorContrasena(`Aa1!${'x'.repeat(70)}`), /Máximo 72/);
    });
});

describe('Dirección', () => {
    it('se mide en bytes: una tilde ocupa 2', () => {
        assert.equal(errorDireccion('a'.repeat(200)), null);
        assert.match(errorDireccion('á'.repeat(101)), /Máximo 200/);
    });
});

describe('Fecha de nacimiento', () => {
    it('calcula la edad según si ya cumplió años este año', () => {
        assert.equal(calcularEdad('2008-09-29', HOY), 18);
        assert.equal(calcularEdad('2008-09-30', HOY), 17);
    });

    it('rechaza menores de 18 y acepta desde el día que los cumple', () => {
        assert.match(errorFechaNacimiento('2008-09-30', HOY), /mayor de edad/);
        assert.equal(errorFechaNacimiento('2008-09-29', HOY), null);
    });

    it('rechaza fechas inválidas y demasiado antiguas', () => {
        assert.match(errorFechaNacimiento('2001-02-30', HOY), /no es válida/);
        assert.match(errorFechaNacimiento('1920-01-01', HOY), /demasiado antigua/);
    });
});
