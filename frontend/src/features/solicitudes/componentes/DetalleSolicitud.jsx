import { useEffect, useState } from 'react';
import { FotoMascota } from '../../mascotas/componentes/FotoMascota.jsx';
import { formatearFecha } from '../../mascotas/mascotas.formatos.js';
import { obtenerSolicitud, formalizarSolicitud, cancelarSolicitud, cancelarMiSolicitud, entregarMascota, extenderPlazo } from '../solicitudes.api.js';
import { aSiNo, claseEstadoProceso, etiquetaEstadoProceso, OPCIONES_CANCELACION } from '../solicitudes.formatos.js';

const LARGO_MOTIVO = 500; // SOLICITUDES_ADOPCION.OBSERVACIONES

const ETIQUETA_CONFIRMAR = {
    formalizar: 'Confirmar formalización',
    entregar: 'Confirmar entrega',
    extender: 'Extender plazo',
    cancelar: 'Confirmar cancelación',
    retirar: 'Confirmar cancelación'
};

// Detalle de una solicitud. Si puedeGestionar (staff con permiso de
// modificar), permite formalizarla o cancelarla mientras esté abierta.
// En un trámite activo, el staff también registra la entrega o extiende el plazo.
// Si es esPropia (el adoptante), puede retirar su solicitud mientras no se formalice.
export function DetalleSolicitud({ solicitud, puedeGestionar, esPropia, alCambiar, alCerrar }) {
    const [carga, setCarga] = useState({ id: null, datos: null, error: '' });
    const [accion, setAccion] = useState(null); // null | 'formalizar' | 'cancelar' | 'retirar' | 'entregar' | 'extender'
    const [motivo, setMotivo] = useState('');
    const [dias, setDias] = useState('7');
    const [quienCancela, setQuienCancela] = useState('8');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let vigente = true;

        obtenerSolicitud(solicitud.id)
            .then((datos) => vigente && setCarga({ id: solicitud.id, datos, error: '' }))
            .catch((err) => vigente && setCarga({ id: solicitud.id, datos: null, error: err.message }));

        return () => {
            vigente = false;
        };
    }, [solicitud.id]);

    const lista = carga.id === solicitud.id;
    const s = (lista && carga.datos) || solicitud;
    const c = s.cuestionario;
    const abierta = s.estado === 'SOLICITUD' || s.estado === 'ACTIVO';

    async function confirmar() {
        setError('');

        if (accion === 'cancelar' && !motivo.trim()) {
            setError('Escribe el motivo de la cancelación.');
            return;
        }

        if (accion === 'extender' && !(Number.isInteger(Number(dias)) && Number(dias) >= 1 && Number(dias) <= 365)) {
            setError('Escribe un número de días entre 1 y 365.');
            return;
        }

        setEnviando(true);

        try {
            let actualizada;

            if (accion === 'formalizar') {
                actualizada = await formalizarSolicitud(s.id, motivo.trim() || undefined);
            } else if (accion === 'entregar') {
                actualizada = await entregarMascota(s.id);
            } else if (accion === 'extender') {
                actualizada = await extenderPlazo(s.id, Number(dias));
            } else if (accion === 'retirar') {
                actualizada = await cancelarMiSolicitud(s.id, motivo.trim() || undefined);
            } else {
                actualizada = await cancelarSolicitud(s.id, Number(quienCancela), motivo.trim());
            }

            alCambiar(actualizada, accion);
        } catch (err) {
            setError(err.message);
        } finally {
            setEnviando(false);
        }
    }

    function elegir(nueva) {
        setAccion(nueva);
        setMotivo('');
        setError('');
    }

    return (
        <article className="tarjeta solicitudes-detalle" aria-label={`Solicitud de ${s.adoptante}`}>
            <div className="solicitudes-detalle-cabecera">
                <FotoMascota idFoto={s.idFotoPrincipal} alt={`Foto de ${s.mascota}`} clase="solicitudes-foto" />
                <div>
                    <h2>{s.mascota}</h2>
                    <p className="texto-suave">Solicitada por {s.adoptante} · documento {s.documento}</p>
                    <span className={claseEstadoProceso(s.estado)}>{etiquetaEstadoProceso(s.estado)}</span>
                </div>
            </div>

            {carga.error && lista && <p className="aviso aviso-error">{carga.error}</p>}

            <dl className="datos-fijos">
                <div><dt>Enviada</dt><dd>{formatearFecha(s.fechaEnvio)}</dd></div>
                {s.telefono && <div><dt>Teléfono (WhatsApp)</dt><dd>{s.telefono}</dd></div>}
                {s.correo && <div><dt>Correo</dt><dd>{s.correo}</dd></div>}
                {s.fechaInicio && <div><dt>Trámite iniciado</dt><dd>{formatearFecha(s.fechaInicio)}</dd></div>}
                {s.fechaVencimiento && <div><dt>Vence</dt><dd>{formatearFecha(s.fechaVencimiento)}</dd></div>}
                {s.fechaResolucion && <div><dt>Cerrada</dt><dd>{formatearFecha(s.fechaResolucion)}</dd></div>}
                {s.observaciones && <div><dt>Observaciones</dt><dd>{s.observaciones}</dd></div>}
            </dl>

            {c ? (
                <>
                    <h3>Cuestionario de compatibilidad</h3>
                    {s.compatibilidad && (
                        <p>
                            <span className="insignia">
                                {s.compatibilidad.descartada
                                    ? 'No recomendada para este hogar'
                                    : `${s.compatibilidad.puntaje}% de compatibilidad con ${s.mascota}`}
                            </span>
                        </p>
                    )}
                    <dl className="datos-fijos">
                        <div><dt>Vivienda</dt><dd>{c.tipoViviendaOtro || c.tipoVivienda}</dd></div>
                        <div><dt>Espacio exterior</dt><dd>{aSiNo(c.tieneEspacioExterior)}</dd></div>
                        <div><dt>Tiempo disponible</dt><dd>{c.tiempoDisponibleOtro || c.tiempoDisponible}</dd></div>
                        <div>
                            <dt>Experiencia con mascotas</dt>
                            <dd>{aSiNo(c.experienciaPrevia)}{c.experienciaObservaciones ? ` · ${c.experienciaObservaciones}` : ''}</dd>
                        </div>
                        <div><dt>Dispuesto a necesidades especiales</dt><dd>{aSiNo(c.dispuestoNecesidadesEspeciales)}</dd></div>
                        <div><dt>Niños en el hogar</dt><dd>{aSiNo(c.tieneNinosHogar)}</dd></div>
                        <div>
                            <dt>Otras mascotas</dt>
                            <dd>{aSiNo(c.tieneOtrasMascotasHogar)}{c.otrasMascotasObservaciones ? ` · ${c.otrasMascotasObservaciones}` : ''}</dd>
                        </div>
                    </dl>
                </>
            ) : (
                <p className="texto-suave">Esta solicitud se hizo directamente desde el catálogo, sin cuestionario.</p>
            )}

            {error && <p className="aviso aviso-error" role="alert">{error}</p>}

            {puedeGestionar && abierta && !accion && (
                <div className="solicitudes-acciones">
                    {s.estado === 'SOLICITUD' && (
                        <button type="button" className="boton" onClick={() => elegir('formalizar')}>Formalizar</button>
                    )}
                    {s.estado === 'ACTIVO' && (
                        <>
                            <button type="button" className="boton" onClick={() => elegir('entregar')}>Registrar entrega</button>
                            <button type="button" className="boton boton-secundario" onClick={() => elegir('extender')}>Extender plazo</button>
                        </>
                    )}
                    <button type="button" className="boton boton-peligro" onClick={() => elegir('cancelar')}>Cancelar solicitud</button>
                </div>
            )}

            {esPropia && s.estado === 'SOLICITUD' && !accion && (
                <div className="solicitudes-acciones">
                    <button type="button" className="boton boton-peligro" onClick={() => elegir('retirar')}>
                        Cancelar mi solicitud
                    </button>
                </div>
            )}

            {esPropia && s.estado === 'ACTIVO' && (
                <p className="texto-suave">
                    Tu solicitud ya es un trámite activo. Si quieres cancelarlo, comunícate con el albergue.
                </p>
            )}

            {accion && (
                <div className="solicitudes-confirmacion">
                    {accion === 'entregar' ? (
                        <p>
                            Confirma que {s.mascota} ya fue entregada. Empieza el <strong>periodo de prueba</strong> y
                            se programan los seguimientos del día 3, la semana 3 y el mes 3.
                        </p>
                    ) : accion === 'extender' ? (
                        <p>Suma días al plazo del trámite{s.fechaVencimiento ? ` (hoy vence el ${formatearFecha(s.fechaVencimiento)})` : ''}.</p>
                    ) : accion === 'retirar' ? (
                        <p>
                            Vas a cancelar tu solicitud para adoptar a {s.mascota}. Después no se puede reactivar,
                            pero podrás enviar otra cuando quieras.
                        </p>
                    ) : accion === 'formalizar' ? (
                        <p>
                            La solicitud pasará a <strong>trámite activo</strong> y {s.mascota} quedará en proceso.
                            La persona tendrá un plazo para concretar la adopción.
                        </p>
                    ) : (
                        <>
                            <p>
                                La solicitud se cerrará y no se puede reactivar.
                                {s.estado === 'ACTIVO' && ` ${s.mascota} volverá a estar disponible.`}
                            </p>
                            <label className="campo">
                                ¿Quién cancela?
                                <select value={quienCancela} onChange={(e) => setQuienCancela(e.target.value)}>
                                    {OPCIONES_CANCELACION.map((o) => <option key={o.id} value={o.id}>{o.texto}</option>)}
                                </select>
                            </label>
                        </>
                    )}

                    {accion === 'extender' && (
                        <label className="campo">
                            Días a sumar
                            <input type="number" min="1" max="365" value={dias} onChange={(e) => setDias(e.target.value)} />
                        </label>
                    )}

                    {accion !== 'entregar' && accion !== 'extender' && (
                    <label className="campo">
                        {accion === 'cancelar' ? 'Motivo' : accion === 'retirar' ? 'Motivo (opcional)' : 'Observaciones (opcional)'}
                        <input type="text" value={motivo} maxLength={LARGO_MOTIVO} onChange={(e) => setMotivo(e.target.value)} />
                    </label>
                    )}

                    <div className="solicitudes-acciones">
                        <button type="button" className="boton boton-secundario" onClick={() => setAccion(null)} disabled={enviando}>
                            Volver
                        </button>
                        <button
                            type="button"
                            className={accion === 'cancelar' || accion === 'retirar' ? 'boton boton-peligro' : 'boton'}
                            onClick={confirmar}
                            disabled={enviando}
                        >
                            {enviando ? 'Guardando...' : ETIQUETA_CONFIRMAR[accion]}
                        </button>
                    </div>
                </div>
            )}

            <button type="button" className="boton boton-secundario" onClick={alCerrar}>Cerrar</button>
        </article>
    );
}
