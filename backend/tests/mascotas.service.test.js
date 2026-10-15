// Reglas de negocio de Mascotas. El repositorio se simula: no hay Oracle.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { simular, reiniciar } from './apoyo.js';

const repo = simular('modules/mascotas/mascotas.repository.js', [
    'listarMascotas', 'buscarPorId', 'insertarMascota', 'actualizarMascota', 'desactivarMascota',
    'reactivarMascota', 'contarFotos', 'listarFotos', 'buscarFoto', 'insertarFoto', 'marcarPrincipal',
    'listarEstadosElegibles',
    'eliminarFoto', 'cambiarEstadoSiEs'
]);
const almacen = simular('modules/mascotas/fotos.almacen.js', ['guardarFoto', 'borrarFoto']);

const {
    obtenerTodos, obtenerUno, crearMascota, modificarMascota, cambiarActivoMascota,
    subirFoto, obtenerRutaFoto, marcarFotoPrincipal, obtenerEstadosElegibles, eliminarUnaFoto, LIMITE_FOTOS,
    reservarMascotaParaProceso, liberarMascotaDeProceso, pasarMascotaAPrueba, revertirMascotaAProceso,
    marcarMascotaAdoptada, devolverMascotaAlAlbergue, revertirMascotaAdoptada, revertirDevolucionDeMascota
} = await import('../src/modules/mascotas/mascotas.service.js');

const STAFF = { documento: '1', rol: 'STAFF' };
const ADOPTANTE = { documento: '2', rol: 'ADOPTANTE' };

// Fila tal como la devuelve Oracle (MAYÚSCULAS, 'S'/'N').
function fila(cambios = {}) {
    return {
        ID_MASCOTA: 7, NOMBRE: 'Luna', ID_RAZA: 1, RAZA: 'Mestizo', ID_ESPECIE: 1, ESPECIE: 'PERRO',
        EDAD_MESES_INGRESO: 10, EDAD_ACTUAL_MESES: 14, ID_TAMANIO: 2, TAMANIO: 'MEDIANO',
        ID_SEXO: 2, SEXO: 'HEMBRA', ID_NIVEL_ENERGIA: 2, NIVEL_ENERGIA: 'MEDIO',
        COMPATIBLE_NINOS: 'S', COMPATIBLE_OTRAS_MASCOTAS: 'N',
        TIENE_NECESIDADES_ESPECIALES: 'N', DESCRIPCION_NECESIDADES: null,
        FECHA_INGRESO: new Date('2026-01-10T10:30:00'), FECHA_SALIDA: null,
        ID_ESTADO_MASCOTA: 1, ESTADO: 'DISPONIBLE', ES_VISIBLE: 'S', ES_ADOPTABLE: 'S',
        ACTIVO: 'S', OBSERVACIONES_ESTADO: 'nota interna', ID_FOTO_PRINCIPAL: 3,
        ...cambios
    };
}

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);

const cuerpoValido = {
    nombre: '  Luna ', idRaza: 1, edadMesesIngreso: 10, idTamanio: 2, idSexo: 2, idNivelEnergia: 2,
    compatibleNinos: true, compatibleOtrasMascotas: false, tieneNecesidadesEspeciales: false
};

describe('Mascotas', () => {
    beforeEach(() => {
        reiniciar(repo);
        reiniciar(almacen);
        repo.listarFotos.mock.mockImplementation(async () => [{ ID_FOTO: 3, ES_PRINCIPAL: 'S' }]);
        repo.buscarPorId.mock.mockImplementation(async () => fila());
        repo.listarMascotas.mock.mockImplementation(async () => [fila()]);
    });

    describe('lo que ve cada quien', () => {
        it('el adoptante pide solo visibles y no recibe datos internos', async () => {
            const [m] = await obtenerTodos({ estado: 'inactivos', idEstadoMascota: '3' }, ADOPTANTE);
            const filtros = repo.listarMascotas.mock.calls[0].arguments[0];

            assert.equal(filtros.soloVisibles, true);
            assert.equal(filtros.estado, 'todos');
            assert.equal(filtros.idEstadoMascota, null);
            for (const interno of ['observacionesEstado', 'fechaIngreso', 'fechaSalida', 'activo']) {
                assert.equal(interno in m, false, `no debe traer ${interno}`);
            }
        });

        it('el staff ve todo, incluidos los datos internos', async () => {
            const [m] = await obtenerTodos({ estado: 'inactivos' }, STAFF);
            const filtros = repo.listarMascotas.mock.calls[0].arguments[0];

            assert.equal(filtros.soloVisibles, false);
            assert.equal(filtros.estado, 'inactivos');
            assert.equal(m.observacionesEstado, 'nota interna');
            assert.equal(m.activo, true);
        });

        it('al adoptante una mascota inactiva o no visible le da 404', async () => {
            repo.buscarPorId.mock.mockImplementation(async () => fila({ ACTIVO: 'N' }));
            await assert.rejects(() => obtenerUno(7, ADOPTANTE), { codigoHttp: 404 });

            repo.buscarPorId.mock.mockImplementation(async () => fila({ ES_VISIBLE: 'N' }));
            await assert.rejects(() => obtenerUno(7, ADOPTANTE), { codigoHttp: 404 });
            assert.equal((await obtenerUno(7, STAFF)).id, 7);
        });
    });

    describe('crear', () => {
        beforeEach(() => repo.insertarMascota.mock.mockImplementation(async () => 7));

        it('limpia el nombre, convierte a S/N y deja DISPONIBLE por defecto', async () => {
            await crearMascota(cuerpoValido, STAFF);
            const datos = repo.insertarMascota.mock.calls[0].arguments[0];

            assert.equal(datos.nombre, 'Luna');
            assert.equal(datos.compatibleNinos, 'S');
            assert.equal(datos.compatibleOtrasMascotas, 'N');
            assert.equal(datos.idEstadoMascota, 1);
        });

        it('el staff no puede elegir estados que maneja el sistema', async () => {
            for (const idEstadoMascota of [3, 4, 5]) {
                await assert.rejects(
                    () => crearMascota({ ...cuerpoValido, idEstadoMascota }, STAFF),
                    (e) => e.codigoHttp === 400 && 'idEstadoMascota' in e.detalles
                );
            }
        });

        it('marca cada campo inválido', async () => {
            await assert.rejects(
                () => crearMascota({ nombre: '', edadMesesIngreso: 0 }, STAFF),
                (e) => ['nombre', 'idRaza', 'edadMesesIngreso', 'compatibleNinos'].every((c) => c in e.detalles)
            );
            await assert.rejects(
                () => crearMascota({ ...cuerpoValido, nombre: 'x'.repeat(51) }, STAFF),
                (e) => 'nombre' in e.detalles
            );
        });

        it('sin necesidades especiales la descripción se guarda NULL', async () => {
            await crearMascota({ ...cuerpoValido, descripcionNecesidades: 'algo' }, STAFF);
            assert.equal(repo.insertarMascota.mock.calls[0].arguments[0].descripcionNecesidades, null);

            await crearMascota({ ...cuerpoValido, tieneNecesidadesEspeciales: true, descripcionNecesidades: ' ciega ' }, STAFF);
            const datos = repo.insertarMascota.mock.calls[1].arguments[0];
            assert.equal(datos.tieneNecesidadesEspeciales, 'S');
            assert.equal(datos.descripcionNecesidades, 'ciega');
        });

        it('una llave foránea inexistente se traduce al campo correcto', async () => {
            repo.insertarMascota.mock.mockImplementation(async () => {
                throw Object.assign(new Error('ORA-02291: ... (ADOPET.FK_MASCOTAS_RAZA) ...'), { errorNum: 2291 });
            });
            await assert.rejects(
                () => crearMascota(cuerpoValido, STAFF),
                (e) => e.codigoHttp === 400 && 'idRaza' in e.detalles
            );
        });
    });

    describe('modificar', () => {
        beforeEach(() => repo.actualizarMascota.mock.mockImplementation(async () => 1));

        it('entre DISPONIBLE y EN_TRATAMIENTO sí deja cambiar', async () => {
            await modificarMascota(7, { ...cuerpoValido, idEstadoMascota: 2 }, STAFF);
            assert.equal(repo.actualizarMascota.mock.calls[0].arguments[1].idEstadoMascota, 2);
        });

        it('si el sistema maneja el estado, no deja cambiarlo pero sí editar lo demás', async () => {
            repo.buscarPorId.mock.mockImplementation(async () => fila({ ID_ESTADO_MASCOTA: 3 }));

            await assert.rejects(
                () => modificarMascota(7, { ...cuerpoValido, idEstadoMascota: 1 }, STAFF),
                { codigoHttp: 409, codigo: 'ESTADO_NO_MODIFICABLE' }
            );

            await modificarMascota(7, cuerpoValido, STAFF);
            assert.equal(repo.actualizarMascota.mock.calls[0].arguments[1].idEstadoMascota, 3);
        });

        it('una mascota inexistente da 404', async () => {
            repo.buscarPorId.mock.mockImplementation(async () => undefined);
            await assert.rejects(() => modificarMascota(99, cuerpoValido, STAFF), { codigoHttp: 404 });
        });
    });

    describe('desactivar', () => {
        beforeEach(() => repo.desactivarMascota.mock.mockImplementation(async () => 1));

        it('exige el motivo', async () => {
            await assert.rejects(
                () => cambiarActivoMascota(7, { activo: false, observaciones: '  ' }, STAFF),
                (e) => e.codigoHttp === 400 && 'observaciones' in e.detalles
            );
            assert.equal(repo.desactivarMascota.mock.callCount(), 0);
        });

        it('desactiva con motivo; sin fecha, la fecha de salida queda para la base', async () => {
            await cambiarActivoMascota(7, { activo: false, observaciones: ' Falleció ' }, STAFF);
            assert.deepEqual(repo.desactivarMascota.mock.calls[0].arguments[1],
                { observaciones: 'Falleció', fechaSalida: null });
        });

        it('rechaza fecha mal escrita o anterior al ingreso', async () => {
            for (const fechaSalida of ['15/10/2026', '2025-12-31']) {
                await assert.rejects(
                    () => cambiarActivoMascota(7, { activo: false, observaciones: 'x', fechaSalida }, STAFF),
                    (e) => e.codigoHttp === 400 && 'fechaSalida' in e.detalles
                );
            }
        });

        it('no desactiva a una mascota en proceso o en prueba, ni a una ya inactiva', async () => {
            for (const id of [3, 4]) {
                repo.buscarPorId.mock.mockImplementation(async () => fila({ ID_ESTADO_MASCOTA: id }));
                await assert.rejects(
                    () => cambiarActivoMascota(7, { activo: false, observaciones: 'x' }, STAFF),
                    { codigo: 'MASCOTA_EN_ADOPCION' }
                );
            }

            repo.buscarPorId.mock.mockImplementation(async () => fila({ ACTIVO: 'N' }));
            await assert.rejects(
                () => cambiarActivoMascota(7, { activo: false, observaciones: 'x' }, STAFF),
                { codigo: 'MASCOTA_YA_INACTIVA' }
            );
        });

        it('activo debe ser true o false', async () => {
            await assert.rejects(
                () => cambiarActivoMascota(7, { observaciones: 'x' }, STAFF),
                { codigoHttp: 400 }
            );
        });
    });

    describe('reactivar (una adoptada que regresa al albergue)', () => {
        const inactiva = () => fila({ ACTIVO: 'N', ID_ESTADO_MASCOTA: 5, ES_VISIBLE: 'N', FECHA_SALIDA: new Date('2026-03-01') });

        beforeEach(() => {
            repo.buscarPorId.mock.mockImplementation(async () => inactiva());
            repo.reactivarMascota.mock.mockImplementation(async () => 1);
        });

        it('vuelve la misma fila, DISPONIBLE por defecto, con el motivo del regreso', async () => {
            await cambiarActivoMascota(7, { activo: true, observaciones: ' El dueño falleció ' }, STAFF);

            assert.deepEqual(repo.reactivarMascota.mock.calls[0].arguments,
                [7, { idEstadoMascota: 1, observaciones: 'El dueño falleció' }]);
            assert.equal(repo.insertarMascota.mock.callCount(), 0);
        });

        it('puede volver EN_TRATAMIENTO, pero no en un estado que maneja el sistema', async () => {
            await cambiarActivoMascota(7, { activo: true, observaciones: 'x', idEstadoMascota: 2 }, STAFF);
            assert.equal(repo.reactivarMascota.mock.calls[0].arguments[1].idEstadoMascota, 2);

            for (const idEstadoMascota of [3, 4, 5]) {
                await assert.rejects(
                    () => cambiarActivoMascota(7, { activo: true, observaciones: 'x', idEstadoMascota }, STAFF),
                    (e) => e.codigoHttp === 400 && 'idEstadoMascota' in e.detalles
                );
            }
        });

        it('exige el motivo del regreso', async () => {
            await assert.rejects(
                () => cambiarActivoMascota(7, { activo: true, observaciones: '' }, STAFF),
                (e) => e.codigoHttp === 400 && 'observaciones' in e.detalles
            );
            assert.equal(repo.reactivarMascota.mock.callCount(), 0);
        });

        it('no reactiva a una que ya está en el albergue', async () => {
            repo.buscarPorId.mock.mockImplementation(async () => fila());
            await assert.rejects(
                () => cambiarActivoMascota(7, { activo: true, observaciones: 'x' }, STAFF),
                { codigo: 'MASCOTA_YA_ACTIVA' }
            );
        });
    });

    describe('fotos', () => {
        beforeEach(() => {
            repo.contarFotos.mock.mockImplementation(async () => 0);
            repo.insertarFoto.mock.mockImplementation(async () => 10);
            almacen.guardarFoto.mock.mockImplementation(async (b, ext) => `mascotas/abc.${ext}`);
            almacen.borrarFoto.mock.mockImplementation(async () => undefined);
        });

        it('la ficha trae las fotos por id, nunca la ruta del archivo', async () => {
            const m = await obtenerUno(7, STAFF);
            assert.deepEqual(m.fotos, [{ id: 3, esPrincipal: true }]);
            assert.equal(JSON.stringify(m).includes('RUTA'), false);
        });

        it('acepta JPG, PNG y WEBP por su contenido real y la primera queda principal', async () => {
            for (const [buffer, ext] of [[JPG, 'jpg'], [PNG, 'png'], [WEBP, 'webp']]) {
                await subirFoto(7, { buffer, originalname: 'cualquiera.txt' }, STAFF);
                assert.equal(almacen.guardarFoto.mock.calls.at(-1).arguments[1], ext);
            }
            assert.deepEqual(repo.insertarFoto.mock.calls[0].arguments[0],
                { idMascota: 7, ruta: 'mascotas/abc.jpg', esPrincipal: true });
        });

        it('las siguientes no son principales', async () => {
            repo.contarFotos.mock.mockImplementation(async () => 2);
            await subirFoto(7, { buffer: PNG }, STAFF);
            assert.equal(repo.insertarFoto.mock.calls[0].arguments[0].esPrincipal, false);
        });

        it('rechaza lo que no es imagen aunque se llame foto.jpg', async () => {
            await assert.rejects(
                () => subirFoto(7, { buffer: Buffer.from('<?php echo 1; ?> esto es un script'), originalname: 'foto.jpg', mimetype: 'image/jpeg' }, STAFF),
                (e) => e.codigoHttp === 400 && 'foto' in e.detalles
            );
            assert.equal(almacen.guardarFoto.mock.callCount(), 0);
        });

        it('exige elegir una foto', async () => {
            await assert.rejects(() => subirFoto(7, undefined, STAFF), { codigoHttp: 400 });
        });

        it(`no admite más de ${5} fotos por mascota`, async () => {
            repo.contarFotos.mock.mockImplementation(async () => LIMITE_FOTOS);
            await assert.rejects(() => subirFoto(7, { buffer: JPG }, STAFF), { codigo: 'LIMITE_FOTOS' });
            assert.equal(almacen.guardarFoto.mock.callCount(), 0);
        });

        it('si la base falla, se deshace el archivo para no dejar basura', async () => {
            repo.insertarFoto.mock.mockImplementation(async () => { throw new Error('ORA-fallo'); });
            await assert.rejects(() => subirFoto(7, { buffer: JPG }, STAFF), /ORA-fallo/);
            assert.deepEqual(almacen.borrarFoto.mock.calls[0].arguments, ['mascotas/abc.jpg']);
        });

        it('el adoptante solo ve fotos de mascotas activas y visibles', async () => {
            const foto = { ID_FOTO: 3, ID_MASCOTA: 7, RUTA_ARCHIVO: 'mascotas/abc.jpg', ES_PRINCIPAL: 'S', ACTIVO: 'S', ES_VISIBLE: 'S' };

            repo.buscarFoto.mock.mockImplementation(async () => foto);
            assert.equal(await obtenerRutaFoto(3, ADOPTANTE), 'mascotas/abc.jpg');

            for (const cambio of [{ ACTIVO: 'N' }, { ES_VISIBLE: 'N' }]) {
                repo.buscarFoto.mock.mockImplementation(async () => ({ ...foto, ...cambio }));
                await assert.rejects(() => obtenerRutaFoto(3, ADOPTANTE), { codigoHttp: 404 });
                assert.equal(await obtenerRutaFoto(3, STAFF), 'mascotas/abc.jpg');
            }

            repo.buscarFoto.mock.mockImplementation(async () => undefined);
            await assert.rejects(() => obtenerRutaFoto(99, STAFF), { codigoHttp: 404 });
        });

        it('eliminar borra la fila y el archivo, y avisa si era la principal', async () => {
            const foto = { ID_FOTO: 3, ID_MASCOTA: 7, RUTA_ARCHIVO: 'mascotas/abc.jpg', ES_PRINCIPAL: 'S' };
            repo.buscarFoto.mock.mockImplementation(async () => foto);
            repo.eliminarFoto.mock.mockImplementation(async () => undefined);

            await eliminarUnaFoto(3, STAFF);

            assert.deepEqual(repo.eliminarFoto.mock.calls[0].arguments, [3, 7, true]);
            assert.deepEqual(almacen.borrarFoto.mock.calls[0].arguments, ['mascotas/abc.jpg']);

            repo.buscarFoto.mock.mockImplementation(async () => ({ ...foto, ES_PRINCIPAL: 'N' }));
            await eliminarUnaFoto(3, STAFF);
            assert.equal(repo.eliminarFoto.mock.calls[1].arguments[2], false);
        });

        it('eliminar una foto que no existe da 404 y no toca el disco', async () => {
            repo.buscarFoto.mock.mockImplementation(async () => undefined);
            await assert.rejects(() => eliminarUnaFoto(99, STAFF), { codigoHttp: 404 });
            assert.equal(repo.eliminarFoto.mock.callCount(), 0);
            assert.equal(almacen.borrarFoto.mock.callCount(), 0);
        });

        it('si el archivo no se puede borrar, la eliminación igual sale bien', async () => {
            repo.buscarFoto.mock.mockImplementation(async () => (
                { ID_FOTO: 3, ID_MASCOTA: 7, RUTA_ARCHIVO: 'mascotas/abc.jpg', ES_PRINCIPAL: 'N' }
            ));
            repo.eliminarFoto.mock.mockImplementation(async () => undefined);
            almacen.borrarFoto.mock.mockImplementation(async () => { throw new Error('EPERM'); });

            const silencio = (await import('node:test')).mock.method(console, 'error', () => undefined);
            await eliminarUnaFoto(3, STAFF);
            silencio.mock.restore();
        });

        it('cambiar la principal solo escribe si la foto no lo era ya', async () => {
            repo.marcarPrincipal.mock.mockImplementation(async () => undefined);
            const base = { ID_FOTO: 4, ID_MASCOTA: 7, ES_PRINCIPAL: 'N' };

            repo.buscarFoto.mock.mockImplementation(async () => base);
            await marcarFotoPrincipal(4, STAFF);
            assert.deepEqual(repo.marcarPrincipal.mock.calls[0].arguments, [4, 7]);

            repo.buscarFoto.mock.mockImplementation(async () => ({ ...base, ES_PRINCIPAL: 'S' }));
            await marcarFotoPrincipal(4, STAFF);
            assert.equal(repo.marcarPrincipal.mock.callCount(), 1);
        });
    });

    describe('estados', () => {
        it('ofrece solo Disponible y En tratamiento, con nombre legible', async () => {
            repo.listarEstadosElegibles.mock.mockImplementation(async () => [
                { ID_ESTADO_MASCOTA: 1, NOMBRE: 'DISPONIBLE' },
                { ID_ESTADO_MASCOTA: 2, NOMBRE: 'EN_TRATAMIENTO' }
            ]);

            assert.deepEqual(await obtenerEstadosElegibles(), [
                { id: 1, nombre: 'Disponible' },
                { id: 2, nombre: 'En tratamiento' }
            ]);
            assert.deepEqual(repo.listarEstadosElegibles.mock.calls[0].arguments[0], [1, 2]);
        });

        it('la ficha muestra el estado legible', async () => {
            repo.buscarPorId.mock.mockImplementation(async () => fila({ ESTADO: 'EN_TRATAMIENTO' }));
            assert.equal((await obtenerUno(7, STAFF)).estado, 'En tratamiento');
        });
    });
});

describe('estado EN_PROCESO manejado por solicitudes', () => {
    beforeEach(() => reiniciar(repo));

    it('reservar pasa de DISPONIBLE (1) a EN_PROCESO (3)', async () => {
        repo.cambiarEstadoSiEs.mock.mockImplementation(async () => 1);
        assert.equal(await reservarMascotaParaProceso(7), true);
        assert.deepEqual(repo.cambiarEstadoSiEs.mock.calls[0].arguments, [7, 1, 3]);
    });

    it('reservar devuelve false si la mascota ya no estaba disponible', async () => {
        repo.cambiarEstadoSiEs.mock.mockImplementation(async () => 0);
        assert.equal(await reservarMascotaParaProceso(7), false);
    });

    it('liberar pasa de EN_PROCESO (3) a DISPONIBLE (1)', async () => {
        repo.cambiarEstadoSiEs.mock.mockImplementation(async () => 1);
        assert.equal(await liberarMascotaDeProceso(7), true);
        assert.deepEqual(repo.cambiarEstadoSiEs.mock.calls[0].arguments, [7, 3, 1]);
    });
});

describe('estado EN_PRUEBA manejado por solicitudes', () => {
    beforeEach(() => reiniciar(repo));

    it('pasar a prueba cambia EN_PROCESO (3) a EN_PRUEBA (4)', async () => {
        repo.cambiarEstadoSiEs.mock.mockImplementation(async () => 1);
        assert.equal(await pasarMascotaAPrueba(7), true);
        assert.deepEqual(repo.cambiarEstadoSiEs.mock.calls[0].arguments, [7, 3, 4]);
    });

    it('revertir cambia EN_PRUEBA (4) a EN_PROCESO (3)', async () => {
        repo.cambiarEstadoSiEs.mock.mockImplementation(async () => 1);
        assert.equal(await revertirMascotaAProceso(7), true);
        assert.deepEqual(repo.cambiarEstadoSiEs.mock.calls[0].arguments, [7, 4, 3]);
    });

    it('devuelve false si la mascota no estaba en el estado esperado', async () => {
        repo.cambiarEstadoSiEs.mock.mockImplementation(async () => 0);
        assert.equal(await pasarMascotaAPrueba(7), false);
    });
});

describe('cierre del periodo de prueba', () => {
    beforeEach(() => {
        reiniciar(repo);
        repo.cambiarEstadoSiEs.mock.mockImplementation(async () => 1);
    });

    it('marcar adoptada cambia EN_PRUEBA (4) a ADOPTADA (5)', async () => {
        assert.equal(await marcarMascotaAdoptada(7), true);
        assert.deepEqual(repo.cambiarEstadoSiEs.mock.calls[0].arguments, [7, 4, 5]);
    });

    it('devolver al albergue cambia EN_PRUEBA (4) a DISPONIBLE (1)', async () => {
        assert.equal(await devolverMascotaAlAlbergue(7), true);
        assert.deepEqual(repo.cambiarEstadoSiEs.mock.calls[0].arguments, [7, 4, 1]);
    });

    it('los dos reversos vuelven a EN_PRUEBA (4)', async () => {
        await revertirMascotaAdoptada(7);
        await revertirDevolucionDeMascota(7);
        assert.deepEqual(repo.cambiarEstadoSiEs.mock.calls[0].arguments, [7, 5, 4]);
        assert.deepEqual(repo.cambiarEstadoSiEs.mock.calls[1].arguments, [7, 1, 4]);
    });
});
