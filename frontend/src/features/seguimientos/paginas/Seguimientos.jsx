import '../seguimientos.css';
import { useEffect, useState } from 'react';
import { useSesion } from '../../../hooks/useSesion.js';
import { formatearFecha } from '../../mascotas/mascotas.formatos.js';
import { EstadoVacio } from '../../../componentes/EstadoVacio.jsx';
import { IconoSeguimiento } from '../../../componentes/Iconos.jsx';
import { FormularioCheckpoint } from '../componentes/FormularioCheckpoint.jsx';
import { DetalleCheckpoint } from '../componentes/DetalleCheckpoint.jsx';
import { listarSeguimientos } from '../seguimientos.api.js';
import { claseEstadoSeguimiento, claseSemaforo, etiquetaEstadoSeguimiento, etiquetaEtapa } from '../seguimientos.formatos.js';

// El adoptante ve sus checkpoints y responde los pendientes (sin ver su
// evaluación). El staff ve todos con el semáforo y abre el detalle.
export function Seguimientos() {
    const { usuario } = useSesion();
    const esStaff = usuario?.rol === 'STAFF';

    const [seguimientos, setSeguimientos] = useState(null);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');
    const [elegido, setElegido] = useState(null);

    useEffect(() => {
        let vigente = true;

        listarSeguimientos()
            .then((datos) => vigente && setSeguimientos(datos))
            .catch((err) => {
                if (vigente) {
                    setSeguimientos([]);
                    setError(err.message);
                }
            });

        return () => {
            vigente = false;
        };
    }, []);

    function alResponder(actualizado) {
        setSeguimientos((anterior) => anterior.map((s) => (s.id === actualizado.id ? actualizado : s)));
        setElegido(null);
        setAviso('¡Gracias! Recibimos tus respuestas.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return (
        <section>
            <header className="cabecera-pagina">
                <h1>Seguimientos</h1>
                <p className="texto-suave">
                    {esStaff
                        ? 'Los checkpoints de las adopciones en periodo de prueba.'
                        : 'Cuéntanos cómo va todo con tu nueva mascota.'}
                </p>
            </header>

            {elegido && (esStaff
                ? <DetalleCheckpoint seguimiento={elegido} alCerrar={() => setElegido(null)} />
                : <FormularioCheckpoint seguimiento={elegido} alResponder={alResponder} alCerrar={() => setElegido(null)} />)}

            {error && <p className="aviso aviso-error">{error}</p>}
            {aviso && <p className="aviso aviso-exito">{aviso}</p>}

            {seguimientos === null ? (
                <p className="tarjeta mensaje-carga">Cargando...</p>
            ) : seguimientos.length === 0 ? (
                <div className="tarjeta">
                    <EstadoVacio
                        icono={IconoSeguimiento}
                        titulo="Todavía no hay seguimientos"
                        texto={esStaff
                            ? 'Aparecerán cuando se entregue una mascota.'
                            : 'Aparecerán cuando recibas tu mascota.'}
                    />
                </div>
            ) : (
                <div className="tabla-contenedor">
                    <table className="tabla">
                        <thead>
                            <tr>
                                <th>Mascota</th>
                                {esStaff && <th>Adoptante</th>}
                                <th>Etapa</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                {esStaff && <th>Semáforo</th>}
                                <th aria-label="Acciones" />
                            </tr>
                        </thead>
                        <tbody>
                            {seguimientos.map((s) => (
                                <tr key={s.id}>
                                    <td>{s.mascota}</td>
                                    {esStaff && <td>{s.adoptante}<br /><small className="texto-suave">{s.documento}</small></td>}
                                    <td>{etiquetaEtapa(s.etapa)}</td>
                                    <td>{formatearFecha(s.fechaProgramada)}</td>
                                    <td><span className={claseEstadoSeguimiento(s.estado)}>{etiquetaEstadoSeguimiento(s.estado)}</span></td>
                                    {esStaff && (
                                        <td>{s.semaforo ? <span className={claseSemaforo(s.semaforo)}>{s.semaforo}</span> : '—'}</td>
                                    )}
                                    <td>
                                        {esStaff ? (
                                            <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setElegido(s)}>
                                                Ver detalle
                                            </button>
                                        ) : s.estado === 'PENDIENTE' ? (
                                            <button type="button" className="boton boton-pequeno" onClick={() => { setAviso(''); setElegido(s); }}>
                                                Responder
                                            </button>
                                        ) : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
