// Reglas de negocio de Solicitudes. El repositorio se simula: no hay Oracle.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { simular, reiniciar } from './apoyo.js';

const repo = simular('modules/solicitudes/solicitudes.repository.js', [
    'listarTiposVivienda', 'listarTiemposDisponibles', 'listarEspecies', 'listarMascotasAdoptables',
    'buscarMascotaParaSolicitud', 'buscarOpcionVivienda', 'buscarOpcionTiempo', 'insertarSolicitud'
]);

const { recomendarMascotas, crearSolicitud, obtenerOpcionesCuestionario, CANTIDAD_RECOMENDADAS } =
    await import('../src/modules/solicitudes/solicitudes.service.js');

const ADOPTANTE = { documento: '2', rol: 'ADOPTANTE' };
const STAFF = { documento: '1', rol: 'STAFF' };

const cuestionario = (c = {}) => ({
    idTipoVivienda: 1, tieneEspacioExterior: true, idTiempoDisponible: 3,
    experienciaPrevia: true, dispuestoNecesidadesEspeciales: true,
    tieneNinosHogar: false, tieneOtrasMascotasHogar: false, ...c
});

const filaMascota = (cambios = {}) => ({
    ID_MASCOTA: 1, NOMBRE: 'Luna', RAZA: 'Mestizo', ESPECIE: 'PERRO', EDAD_ACTUAL_MESES: 14,
    TAMANIO: 'MEDIANO', NIVEL_TAMANIO: 2, SEXO: 'HEMBRA', NIVEL_ENERGIA_NOMBRE: 'MEDIO', NIVEL_ENERGIA: 2,
    COMPATIBLE_NINOS: 'S', COMPATIBLE_OTRAS_MASCOTAS: 'S', TIENE_NECESIDADES_ESPECIALES: 'N',
    ID_FOTO_PRINCIPAL: 5, ...cambios
});

const opcionNormal = { ID: 1, NIVEL: 3, ES_OTRO: 'N' };

beforeEach(() => {
    reiniciar(repo);
    repo.buscarOpcionVivienda.mock.mockImplementation(async () => opcionNormal);
    repo.buscarOpcionTiempo.mock.mockImplementation(async () => ({ ID: 3, NIVEL: 3, ES_OTRO: 'N' }));
});

async function rechazaCon(promesa, codigoHttp, codigo) {
    await assert.rejects(promesa, (e) => e.codigoHttp === codigoHttp && e.codigo === codigo);
}

describe('obtenerOpcionesCuestionario', () => {
    it('convierte las filas a objetos de la API', async () => {
        repo.listarTiposVivienda.mock.mockImplementation(async () => [{ ID: 1, NOMBRE: 'Casa', DESCRIPCION: 'd', ES_OTRO: 'N' }]);
        repo.listarTiemposDisponibles.mock.mockImplementation(async () => [{ ID: 9, NOMBRE: 'Otro', DESCRIPCION: 'd', ES_OTRO: 'S' }]);
        repo.listarEspecies.mock.mockImplementation(async () => [{ ID_ESPECIE: 1, NOMBRE: 'PERRO' }]);

        const r = await obtenerOpcionesCuestionario();
        assert.equal(r.tiposVivienda[0].esOtro, false);
        assert.equal(r.tiemposDisponibles[0].esOtro, true);
        assert.deepEqual(r.especies, [{ id: 1, nombre: 'PERRO' }]);
    });
});

describe('recomendarMascotas', () => {
    it('solo los adoptantes pueden', async () => {
        await rechazaCon(recomendarMascotas({ cuestionario: cuestionario() }, STAFF), 403, 'SOLO_ADOPTANTES');
    });

    it('exige el cuestionario completo', async () => {
        await rechazaCon(recomendarMascotas({}, ADOPTANTE), 400, 'DATOS_INVALIDOS');
        await rechazaCon(recomendarMascotas({ cuestionario: { idTipoVivienda: 1 } }, ADOPTANTE), 400, 'DATOS_INVALIDOS');
    });

    it('rechaza una especie inválida', async () => {
        await rechazaCon(recomendarMascotas({ cuestionario: cuestionario(), idEspecie: 'x' }, ADOPTANTE), 400, 'DATOS_INVALIDOS');
    });

    it('devuelve como máximo 3, con puntaje, ordenadas y sin datos del motor', async () => {
        repo.listarMascotasAdoptables.mock.mockImplementation(async () => [
            filaMascota({ ID_MASCOTA: 1, NOMBRE: 'A' }),
            filaMascota({ ID_MASCOTA: 2, NOMBRE: 'B' }),
            filaMascota({ ID_MASCOTA: 3, NOMBRE: 'C' }),
            filaMascota({ ID_MASCOTA: 4, NOMBRE: 'D' })
        ]);

        const r = await recomendarMascotas({ cuestionario: cuestionario() }, ADOPTANTE);
        assert.equal(r.recomendadas.length, CANTIDAD_RECOMENDADAS);
        assert.equal(r.recomendadas[0].puntaje, 100);
        assert.equal(r.recomendadas[0].compatibleNinos, undefined);
        assert.equal(r.recomendadas[0].nivelTamanio, undefined);
    });

    it('descarta las que no son compatibles con niños si hay niños', async () => {
        repo.listarMascotasAdoptables.mock.mockImplementation(async () => [
            filaMascota({ ID_MASCOTA: 1, COMPATIBLE_NINOS: 'N' })
        ]);

        const r = await recomendarMascotas({ cuestionario: cuestionario({ tieneNinosHogar: true }) }, ADOPTANTE);
        assert.deepEqual(r.recomendadas, []);
    });

    it('pasa la especie al repositorio', async () => {
        repo.listarMascotasAdoptables.mock.mockImplementation(async () => []);
        await recomendarMascotas({ cuestionario: cuestionario(), idEspecie: '2' }, ADOPTANTE);
        assert.equal(repo.listarMascotasAdoptables.mock.calls[0].arguments[0], 2);
    });

    it('exige el texto cuando se elige "Otro"', async () => {
        repo.buscarOpcionVivienda.mock.mockImplementation(async () => ({ ID: 9, NIVEL: 2, ES_OTRO: 'S' }));
        await rechazaCon(recomendarMascotas({ cuestionario: cuestionario({ idTipoVivienda: 9 }) }, ADOPTANTE), 400, 'DATOS_INVALIDOS');
    });

    it('rechaza una opción que no existe', async () => {
        repo.buscarOpcionTiempo.mock.mockImplementation(async () => undefined);
        await rechazaCon(recomendarMascotas({ cuestionario: cuestionario() }, ADOPTANTE), 400, 'DATOS_INVALIDOS');
    });
});

describe('crearSolicitud', () => {
    const mascotaOk = { ID_MASCOTA: 1, NOMBRE: 'Luna', ACTIVO: 'S', ES_ADOPTABLE: 'S' };

    beforeEach(() => {
        repo.buscarMascotaParaSolicitud.mock.mockImplementation(async () => mascotaOk);
        repo.insertarSolicitud.mock.mockImplementation(async () => ({ idSolicitud: 10, fechaEnvio: new Date() }));
    });

    it('solo los adoptantes pueden', async () => {
        await rechazaCon(crearSolicitud({ idMascota: 1 }, STAFF), 403, 'SOLO_ADOPTANTES');
    });

    it('exige la mascota', async () => {
        await rechazaCon(crearSolicitud({}, ADOPTANTE), 400, 'DATOS_INVALIDOS');
    });

    it('404 si la mascota no existe o está inactiva', async () => {
        repo.buscarMascotaParaSolicitud.mock.mockImplementation(async () => undefined);
        await rechazaCon(crearSolicitud({ idMascota: 1 }, ADOPTANTE), 404, 'MASCOTA_NO_ENCONTRADA');

        repo.buscarMascotaParaSolicitud.mock.mockImplementation(async () => ({ ...mascotaOk, ACTIVO: 'N' }));
        await rechazaCon(crearSolicitud({ idMascota: 1 }, ADOPTANTE), 404, 'MASCOTA_NO_ENCONTRADA');
    });

    it('409 si la mascota no es adoptable', async () => {
        repo.buscarMascotaParaSolicitud.mock.mockImplementation(async () => ({ ...mascotaOk, ES_ADOPTABLE: 'N' }));
        await rechazaCon(crearSolicitud({ idMascota: 1 }, ADOPTANTE), 409, 'MASCOTA_NO_ADOPTABLE');
    });

    it('crea la solicitud directa con el cuestionario vacío', async () => {
        const r = await crearSolicitud({ idMascota: 1 }, ADOPTANTE);
        const datos = repo.insertarSolicitud.mock.calls[0].arguments[0];

        assert.equal(r.idSolicitud, 10);
        assert.equal(r.conCuestionario, false);
        assert.equal(datos.documento, '2');
        assert.equal(datos.idTipoVivienda, null);
        assert.equal(datos.tieneNinos, null);
    });

    it('crea la solicitud con el cuestionario convertido a S/N', async () => {
        const r = await crearSolicitud({ idMascota: 1, cuestionario: cuestionario({ tieneNinosHogar: true }) }, ADOPTANTE);
        const datos = repo.insertarSolicitud.mock.calls[0].arguments[0];

        assert.equal(r.conCuestionario, true);
        assert.equal(datos.tieneNinos, 'S');
        assert.equal(datos.tieneEspacioExterior, 'S');
        assert.equal(datos.experienciaPrevia, 'S');
    });

    it('un cuestionario incompleto se rechaza (no se guarda a medias)', async () => {
        await rechazaCon(crearSolicitud({ idMascota: 1, cuestionario: { idTipoVivienda: 1 } }, ADOPTANTE), 400, 'DATOS_INVALIDOS');
        assert.equal(repo.insertarSolicitud.mock.callCount(), 0);
    });

    it('traduce el índice de solicitud abierta a 409', async () => {
        repo.insertarSolicitud.mock.mockImplementation(async () => {
            const err = new Error('ORA-00001: unique constraint (ADOPET.UX_SOLICITUD_ABIERTA_POR_USUARIO_MASCOTA) violated');
            err.errorNum = 1;
            throw err;
        });
        await rechazaCon(crearSolicitud({ idMascota: 1 }, ADOPTANTE), 409, 'SOLICITUD_DUPLICADA');
    });

    it('deja pasar otros errores de la base', async () => {
        repo.insertarSolicitud.mock.mockImplementation(async () => { throw new Error('boom'); });
        await assert.rejects(crearSolicitud({ idMascota: 1 }, ADOPTANTE), /boom/);
    });
});
