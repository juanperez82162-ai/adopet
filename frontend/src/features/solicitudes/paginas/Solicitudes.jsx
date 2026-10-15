import '../solicitudes.css';
import { useEffect, useState } from 'react';
import { useSesion } from '../../../hooks/useSesion.js';
import { listarCatalogo } from '../../catalogos/catalogos.api.js';
import { formatearFecha } from '../../mascotas/mascotas.formatos.js';
import { EstadoVacio } from '../../../componentes/EstadoVacio.jsx';
import { IconoLupa, IconoSolicitud } from '../../../componentes/Iconos.jsx';
import { DetalleSolicitud } from '../componentes/DetalleSolicitud.jsx';
import { listarSolicitudes } from '../solicitudes.api.js';
import { claseEstadoProceso, etiquetaEstadoProceso } from '../solicitudes.formatos.js';

// Debe coincidir con OPCIONES_MENU.NOMBRE_OPCION.
const OPCION = 'SOLICITUDES';

// El staff ve todas las solicitudes y las gestiona; el adoptante ve solo
// las suyas (el backend ya filtra). Los botones dependen del permiso de
// MODIFICAR; la seguridad real es autorizar() en el backend.
export function Solicitudes() {
    const { usuario, tienePermiso } = useSesion();
    const esStaff = usuario?.rol === 'STAFF';
    const puedeGestionar = tienePermiso(OPCION, 'modificar');

    const [filtros, setFiltros] = useState({ texto: '', idEstadoProceso: '' });
    const [textoBusqueda, setTextoBusqueda] = useState('');
    const [estados, setEstados] = useState([]);
    const [solicitudes, setSolicitudes] = useState(null);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');
    const [elegida, setElegida] = useState(null);

    useEffect(() => {
        let vigente = true;

        listarCatalogo('estados-proceso')
            .then((lista) => vigente && setEstados(lista))
            .catch(() => undefined);

        return () => {
            vigente = false;
        };
    }, []);

    useEffect(() => {
        let vigente = true;

        listarSolicitudes(filtros)
            .then((datos) => {
                if (vigente) {
                    setSolicitudes(datos);
                    setError('');
                }
            })
            .catch((err) => {
                if (vigente) {
                    setSolicitudes([]);
                    setError(err.message);
                }
            });

        return () => {
            vigente = false;
        };
    }, [filtros]);

    function buscar(evento) {
        evento.preventDefault();
        setSolicitudes(null);
        setFiltros((anterior) => ({ ...anterior, texto: textoBusqueda.trim() }));
    }

    function cambiarEstado(valor) {
        setSolicitudes(null);
        setFiltros((anterior) => ({ ...anterior, idEstadoProceso: valor }));
    }

    function alCambiar(actualizada, accion) {
        setSolicitudes((anterior) => anterior.map((s) => (s.id === actualizada.id ? actualizada : s)));
        setElegida(null);
        const avisos = {
            formalizar: `La solicitud de ${actualizada.adoptante} pasó a trámite activo.`,
            entregar: `Se registró la entrega de ${actualizada.mascota}. Empezó el periodo de prueba.`,
            extender: 'Se extendió el plazo del trámite.',
            retirar: 'Cancelaste tu solicitud.',
            cancelar: 'La solicitud se canceló.'
        };
        setAviso(avisos[accion]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function abrir(solicitud) {
        setAviso('');
        setElegida(solicitud);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const hayFiltros = Boolean(filtros.texto || filtros.idEstadoProceso);

    return (
        <section>
            <header className="cabecera-pagina">
                <h1>Solicitudes</h1>
                <p className="texto-suave">
                    {esStaff
                        ? 'Las solicitudes de adopción recibidas y su avance.'
                        : 'Las solicitudes de adopción que has enviado.'}
                </p>
            </header>

            <form className="tarjeta mascotas-barra" onSubmit={buscar}>
                <label className="campo">
                    Buscar
                    <input
                        type="search"
                        value={textoBusqueda}
                        onChange={(e) => setTextoBusqueda(e.target.value)}
                        placeholder={esStaff ? 'Adoptante, documento o mascota' : 'Mascota'}
                        maxLength={50}
                    />
                </label>

                <label className="campo">
                    Estado
                    <select value={filtros.idEstadoProceso} onChange={(e) => cambiarEstado(e.target.value)}>
                        <option value="">Todos</option>
                        {estados.map((e) => <option key={e.id} value={e.id}>{etiquetaEstadoProceso(e.nombre)}</option>)}
                    </select>
                </label>

                <div className="mascotas-botones">
                    <button type="submit" className="boton">Buscar</button>
                </div>
            </form>

            {elegida && (
                <DetalleSolicitud
                    key={elegida.id}
                    solicitud={elegida}
                    puedeGestionar={puedeGestionar}
                    esPropia={!esStaff}
                    alCambiar={alCambiar}
                    alCerrar={() => setElegida(null)}
                />
            )}

            {error && <p className="aviso aviso-error">{error}</p>}
            {aviso && <p className="aviso aviso-exito">{aviso}</p>}

            {solicitudes === null ? (
                <p className="tarjeta mensaje-carga">Cargando...</p>
            ) : solicitudes.length === 0 ? (
                <div className="tarjeta">
                    {hayFiltros ? (
                        <EstadoVacio icono={IconoLupa} titulo="Sin resultados" texto="Ninguna solicitud coincide con la búsqueda." />
                    ) : (
                        <EstadoVacio
                            icono={IconoSolicitud}
                            titulo="Todavía no hay solicitudes"
                            texto={esStaff
                                ? 'Cuando alguien pida adoptar una mascota aparecerá aquí.'
                                : 'Cuando pidas adoptar una mascota la verás aquí.'}
                        />
                    )}
                </div>
            ) : (
                <div className="tabla-contenedor">
                    <table className="tabla">
                        <thead>
                            <tr>
                                <th>Mascota</th>
                                {esStaff && <th>Adoptante</th>}
                                <th>Enviada</th>
                                <th>Estado</th>
                                <th>Cuestionario</th>
                                <th aria-label="Acciones" />
                            </tr>
                        </thead>
                        <tbody>
                            {solicitudes.map((s) => (
                                <tr key={s.id}>
                                    <td>{s.mascota}</td>
                                    {esStaff && <td>{s.adoptante}<br /><small className="texto-suave">{s.documento}</small></td>}
                                    <td>{formatearFecha(s.fechaEnvio)}</td>
                                    <td><span className={claseEstadoProceso(s.estado)}>{etiquetaEstadoProceso(s.estado)}</span></td>
                                    <td>{s.conCuestionario ? 'Sí' : 'No'}</td>
                                    <td>
                                        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => abrir(s)}>
                                            Ver detalle
                                        </button>
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
