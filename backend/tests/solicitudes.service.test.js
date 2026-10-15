// Reglas de negocio de Solicitudes. El repositorio se simula: no hay Oracle.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { simular, reiniciar } from './apoyo.js';

const repo = simular('modules/solicitudes/solicitudes.repository.js', [
    'listarTiposVivienda', 'listarTiemposDisponibles', 'listarEspecies', 'listarMascotasAdoptables',
    'buscarMascotaParaSolicitud', 'buscarOpcionVivienda', 'buscarOpcionTiempo', 'insertarSolicitud',
    'listarSolicitudes', 'buscarSolicitud', 'formalizarSolicitud', 'cancelarSolicitud'
]);
const mascotas = simular('modules/mascotas/mascotas.service.js', ['reservarMascotaParaProceso', 'liberarMascotaDeProceso']);

const {
    recomendarMascotas, crearSolicitud, obtenerOpcionesCuestionario, CANTIDAD_RECOMENDADAS,
    obtenerSolicitudes, obtenerSolicitud, formalizar, cancelar, cancelarPropia
} =
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
    reiniciar(mascotas);
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


// Fila tal como la devuelve SELECT_SOLICITUD (sin cuestionario por defecto).
function filaSolicitud(cambios = {}) {
    return {
        ID_SOLICITUD: 10, DOCUMENTO: '2', NOMBRE_ADOPTANTE: 'Ana Pérez', TELEFONO: '300', CORREO: 'a@a.co',
        USUARIO_ACTIVO: 'S', NOMBRE_PERFIL: 'Adoptante', ID_MASCOTA: 1, MASCOTA: 'Luna', MASCOTA_ACTIVA: 'S',
        ID_ESTADO_MASCOTA: 1, ID_FOTO_PRINCIPAL: 5, NIVEL_TAMANIO: 2, NIVEL_ENERGIA: 2,
        COMPATIBLE_NINOS: 'S', COMPATIBLE_OTRAS_MASCOTAS: 'S', TIENE_NECESIDADES_ESPECIALES: 'N',
        ID_ESTADO_PROCESO: 1, ESTADO: 'SOLICITUD', FECHA_ENVIO: new Date(), FECHA_INICIO: null,
        FECHA_VENCIMIENTO: null, FECHA_RESOLUCION: null, OBSERVACIONES: null,
        ID_TIPO_VIVIENDA: null, TIPO_VIVIENDA: null, NIVEL_VIVIENDA: null, TIPO_VIVIENDA_OTRO: null,
        TIENE_ESPACIO_EXTERIOR: null, ID_TIEMPO_DISPONIBLE: null, TIEMPO_DISPONIBLE: null, NIVEL_TIEMPO: null,
        TIEMPO_DISPONIBLE_OTRO: null, EXPERIENCIA_PREVIA: null, EXPERIENCIA_PREVIA_OBSERVACIONES: null,
        DISPUESTO_NECESIDADES_ESPECIALES: null, TIENE_NINOS_HOGAR: null, TIENE_OTRAS_MASCOTAS_HOGAR: null,
        TIENE_OTRAS_MASCOTAS_HOGAR_OBSERVACIONES: null,
        ...cambios
    };
}

const CON_CUESTIONARIO = {
    ID_TIPO_VIVIENDA: 1, TIPO_VIVIENDA: 'Casa', NIVEL_VIVIENDA: 3, TIENE_ESPACIO_EXTERIOR: 'S',
    ID_TIEMPO_DISPONIBLE: 3, TIEMPO_DISPONIBLE: 'Mucho', NIVEL_TIEMPO: 3, EXPERIENCIA_PREVIA: 'S',
    DISPUESTO_NECESIDADES_ESPECIALES: 'S', TIENE_NINOS_HOGAR: 'N', TIENE_OTRAS_MASCOTAS_HOGAR: 'N'
};

describe('consulta de solicitudes', () => {
    it('el staff ve todas con datos de contacto', async () => {
        repo.listarSolicitudes.mock.mockImplementation(async () => [filaSolicitud()]);
        const r = await obtenerSolicitudes({}, STAFF);

        assert.equal(r[0].telefono, '300');
        assert.equal(repo.listarSolicitudes.mock.calls[0].arguments[0].documento, undefined);
    });

    it('el adoptante solo pide las suyas y no ve el contacto', async () => {
        repo.listarSolicitudes.mock.mockImplementation(async () => [filaSolicitud()]);
        const r = await obtenerSolicitudes({}, ADOPTANTE);

        assert.equal(r[0].telefono, undefined);
        assert.equal(repo.listarSolicitudes.mock.calls[0].arguments[0].documento, '2');
    });

    it('rechaza un filtro de estado inválido', async () => {
        await rechazaCon(obtenerSolicitudes({ idEstadoProceso: 'x' }, STAFF), 400, 'DATOS_INVALIDOS');
    });

    it('incluye cuestionario y compatibilidad cuando lo hay', async () => {
        repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud(CON_CUESTIONARIO));
        const r = await obtenerSolicitud(10, STAFF);

        assert.equal(r.conCuestionario, true);
        assert.equal(r.cuestionario.tipoVivienda, 'Casa');
        assert.equal(r.compatibilidad.puntaje, 100);
    });

    it('sin cuestionario no hay compatibilidad', async () => {
        repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud());
        const r = await obtenerSolicitud(10, STAFF);

        assert.equal(r.conCuestionario, false);
        assert.equal(r.compatibilidad, undefined);
    });

    it('un adoptante no ve la solicitud de otra persona (404)', async () => {
        repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud({ DOCUMENTO: '99' }));
        await rechazaCon(obtenerSolicitud(10, ADOPTANTE), 404, 'SOLICITUD_NO_ENCONTRADA');
    });
});

describe('formalizar', () => {
    beforeEach(() => {
        repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud());
        mascotas.reservarMascotaParaProceso.mock.mockImplementation(async () => true);
        mascotas.liberarMascotaDeProceso.mock.mockImplementation(async () => true);
        repo.formalizarSolicitud.mock.mockImplementation(async () => 1);
    });

    it('reserva la mascota y pasa la solicitud a ACTIVO', async () => {
        await formalizar(10, {}, STAFF);

        assert.equal(mascotas.reservarMascotaParaProceso.mock.calls[0].arguments[0], 1);
        const args = repo.formalizarSolicitud.mock.calls[0].arguments;
        assert.equal(args[0], 10);
        assert.equal(args[1], '1');
        assert.equal(mascotas.liberarMascotaDeProceso.mock.callCount(), 0);
    });

    it('no deja formalizar la propia solicitud', async () => {
        await rechazaCon(formalizar(10, {}, { documento: '2', rol: 'STAFF' }), 403, 'SOLICITUD_PROPIA');
    });

    it('solo se formaliza una solicitud en estado SOLICITUD', async () => {
        repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud({ ID_ESTADO_PROCESO: 2 }));
        await rechazaCon(formalizar(10, {}, STAFF), 409, 'SOLICITUD_NO_ABIERTA');
    });

    it('rechaza a una persona vetada o inactiva', async () => {
        repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud({ NOMBRE_PERFIL: 'Vetado' }));
        await rechazaCon(formalizar(10, {}, STAFF), 409, 'ADOPTANTE_NO_HABILITADO');

        repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud({ USUARIO_ACTIVO: 'N' }));
        await rechazaCon(formalizar(10, {}, STAFF), 409, 'ADOPTANTE_NO_HABILITADO');
    });

    it('409 si la mascota ya no está disponible y no toca la solicitud', async () => {
        mascotas.reservarMascotaParaProceso.mock.mockImplementation(async () => false);
        await rechazaCon(formalizar(10, {}, STAFF), 409, 'MASCOTA_NO_DISPONIBLE');
        assert.equal(repo.formalizarSolicitud.mock.callCount(), 0);
    });

    it('si la persona ya tiene un trámite vigente, libera la mascota y avisa', async () => {
        repo.formalizarSolicitud.mock.mockImplementation(async () => {
            const err = new Error('ORA-00001: unique constraint (ADOPET.UX_PROCESO_VIGENTE_POR_USUARIO) violated');
            err.errorNum = 1;
            throw err;
        });

        await rechazaCon(formalizar(10, {}, STAFF), 409, 'ADOPTANTE_CON_PROCESO_VIGENTE');
        assert.equal(mascotas.liberarMascotaDeProceso.mock.callCount(), 1);
    });

    it('si la solicitud cambió mientras tanto, libera la mascota', async () => {
        repo.formalizarSolicitud.mock.mockImplementation(async () => 0);
        await rechazaCon(formalizar(10, {}, STAFF), 409, 'SOLICITUD_NO_ABIERTA');
        assert.equal(mascotas.liberarMascotaDeProceso.mock.callCount(), 1);
    });
});

describe('cancelar', () => {
    beforeEach(() => {
        repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud());
        repo.cancelarSolicitud.mock.mockImplementation(async () => 1);
        mascotas.liberarMascotaDeProceso.mock.mockImplementation(async () => true);
    });

    it('exige un motivo', async () => {
        await rechazaCon(cancelar(10, { idEstadoProceso: 8 }, STAFF), 400, 'DATOS_INVALIDOS');
    });

    it('solo acepta los estados de cancelación', async () => {
        await rechazaCon(cancelar(10, { idEstadoProceso: 2, observaciones: 'x' }, STAFF), 400, 'DATOS_INVALIDOS');
    });

    it('cancelar una SOLICITUD no toca la mascota', async () => {
        await cancelar(10, { idEstadoProceso: 7, observaciones: 'Ya no quiere' }, STAFF);

        const args = repo.cancelarSolicitud.mock.calls[0].arguments;
        assert.deepEqual(args, [10, 1, 7, '1', 'Ya no quiere']);
        assert.equal(mascotas.liberarMascotaDeProceso.mock.callCount(), 0);
    });

    it('cancelar un trámite ACTIVO libera la mascota', async () => {
        repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud({ ID_ESTADO_PROCESO: 2 }));
        await cancelar(10, { idEstadoProceso: 8, observaciones: 'No fue a la cita' }, STAFF);

        assert.equal(mascotas.liberarMascotaDeProceso.mock.callCount(), 1);
    });

    it('una solicitud cerrada o en prueba no se cancela', async () => {
        for (const estado of [3, 4, 6, 8]) {
            repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud({ ID_ESTADO_PROCESO: estado }));
            await rechazaCon(cancelar(10, { idEstadoProceso: 8, observaciones: 'x' }, STAFF), 409, 'SOLICITUD_NO_CANCELABLE');
        }
    });

    it('409 si cambió de estado mientras tanto y no libera la mascota', async () => {
        repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud({ ID_ESTADO_PROCESO: 2 }));
        repo.cancelarSolicitud.mock.mockImplementation(async () => 0);

        await rechazaCon(cancelar(10, { idEstadoProceso: 8, observaciones: 'x' }, STAFF), 409, 'SOLICITUD_NO_CANCELABLE');
        assert.equal(mascotas.liberarMascotaDeProceso.mock.callCount(), 0);
    });
});

describe('cancelarPropia (el adoptante retira su solicitud)', () => {
    beforeEach(() => {
        repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud());
        repo.cancelarSolicitud.mock.mockImplementation(async () => 1);
    });

    it('cancela como CANCELADO_ADOPTANTE sin staff y con motivo opcional', async () => {
        await cancelarPropia(10, {}, ADOPTANTE);
        assert.deepEqual(repo.cancelarSolicitud.mock.calls[0].arguments, [10, 1, 7, null, null]);

        await cancelarPropia(10, { observaciones: 'Cambié de opinión' }, ADOPTANTE);
        assert.equal(repo.cancelarSolicitud.mock.calls[1].arguments[4], 'Cambié de opinión');
    });

    it('no toca la mascota', async () => {
        await cancelarPropia(10, {}, ADOPTANTE);
        assert.equal(mascotas.liberarMascotaDeProceso.mock.callCount(), 0);
    });

    it('solo los adoptantes pueden', async () => {
        await rechazaCon(cancelarPropia(10, {}, STAFF), 403, 'SOLO_ADOPTANTES');
    });

    it('no puede cancelar la solicitud de otra persona (404)', async () => {
        repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud({ DOCUMENTO: '99' }));
        await rechazaCon(cancelarPropia(10, {}, ADOPTANTE), 404, 'SOLICITUD_NO_ENCONTRADA');
    });

    it('un trámite activo se cancela hablando con el albergue', async () => {
        repo.buscarSolicitud.mock.mockImplementation(async () => filaSolicitud({ ID_ESTADO_PROCESO: 2 }));
        await rechazaCon(cancelarPropia(10, {}, ADOPTANTE), 409, 'SOLICITUD_NO_CANCELABLE');
        assert.equal(repo.cancelarSolicitud.mock.callCount(), 0);
    });

    it('409 si cambió de estado mientras tanto', async () => {
        repo.cancelarSolicitud.mock.mockImplementation(async () => 0);
        await rechazaCon(cancelarPropia(10, {}, ADOPTANTE), 409, 'SOLICITUD_NO_CANCELABLE');
    });
});
