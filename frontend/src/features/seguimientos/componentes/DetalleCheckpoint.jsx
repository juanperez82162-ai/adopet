import { useEffect, useState } from 'react';
import { Ventana } from '../../../componentes/Ventana.jsx';
import { formatearFecha } from '../../mascotas/mascotas.formatos.js';
import { obtenerSeguimiento } from '../seguimientos.api.js';
import { claseEstadoSeguimiento, claseSemaforo, etiquetaEstadoSeguimiento, etiquetaEtapa } from '../seguimientos.formatos.js';

// Vista del staff: quién es, qué respondió y cómo salió el semáforo.
export function DetalleCheckpoint({ seguimiento, alCerrar }) {
    const [carga, setCarga] = useState({ datos: null, error: '' });

    useEffect(() => {
        let vigente = true;

        obtenerSeguimiento(seguimiento.id)
            .then((datos) => vigente && setCarga({ datos, error: '' }))
            .catch((err) => vigente && setCarga({ datos: null, error: err.message }));

        return () => {
            vigente = false;
        };
    }, [seguimiento.id]);

    const s = carga.datos ?? seguimiento;

    return (
        <Ventana titulo={`${s.mascota} · ${etiquetaEtapa(s.etapa)}`} alCerrar={alCerrar}>
            {carga.error && <p className="aviso aviso-error">{carga.error}</p>}

            <p>
                <span className={claseEstadoSeguimiento(s.estado)}>{etiquetaEstadoSeguimiento(s.estado)}</span>{' '}
                {s.semaforo && <span className={claseSemaforo(s.semaforo)}>{s.semaforo} · {s.puntaje}</span>}
            </p>

            <p><strong>Adoptante:</strong> {s.adoptante} ({s.documento}){s.telefono ? ` · ${s.telefono}` : ''}</p>
            <p><strong>Fecha programada:</strong> {formatearFecha(s.fechaProgramada)} · <strong>Límite:</strong> {formatearFecha(s.fechaLimite)}</p>

            {s.fechaRespuesta && (
                <>
                    <p><strong>Respondido:</strong> {formatearFecha(s.fechaRespuesta)}</p>
                    {s.solicitaContacto && <p className="seguimientos-alarma">Pidió que el albergue lo contacte.</p>}
                    {s.comentario && <p><strong>Comentario:</strong> {s.comentario}</p>}

                    <ul className="seguimientos-respuestas">
                        {(s.respuestas ?? []).map((r) => (
                            <li key={r.pregunta}>
                                <small className="texto-suave">{r.pregunta}</small><br />
                                <span className={r.esAlarma ? 'seguimientos-alarma' : ''}>{r.respuesta}</span>
                                {' '}<small className="texto-suave">({r.puntaje})</small>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Ventana>
    );
}
