import '../mascotas.css';
import '../../solicitudes/solicitudes.css';
import { useEffect, useState } from 'react';
import { useSesion } from '../../../hooks/useSesion.js';
import { listarCatalogo } from '../../catalogos/catalogos.api.js';
import { listarMascotas, listarEstados } from '../mascotas.api.js';
import { formatearEdad } from '../mascotas.formatos.js';
import { FormularioMascota } from '../componentes/FormularioMascota.jsx';
import { FormularioAlbergue } from '../componentes/FormularioAlbergue.jsx';
import { FichaMascota } from '../componentes/FichaMascota.jsx';
import { FotoMascota } from '../componentes/FotoMascota.jsx';
import { EstadoVacio } from '../../../componentes/EstadoVacio.jsx';
import { IconoLupa, IconoMascota } from '../../../componentes/Iconos.jsx';
import { CuestionarioCompatibilidad } from '../../solicitudes/componentes/CuestionarioCompatibilidad.jsx';
import { ConfirmarSolicitud } from '../../solicitudes/componentes/ConfirmarSolicitud.jsx';

// Debe coincidir con OPCIONES_MENU.NOMBRE_OPCION.
const OPCION = 'MASCOTAS';
const OPCION_SOLICITUDES = 'SOLICITUDES';

// Catálogo de mascotas. Todos los perfiles con acceso ven las tarjetas y
// la ficha; el staff además filtra por estado en el albergue y administra.
// Los botones se muestran según los permisos (experiencia de usuario): la
// seguridad real es autorizar() en el backend.
export function Mascotas() {
    const { usuario, tienePermiso } = useSesion();
    const esStaff = usuario?.rol === 'STAFF';
    const puedeCrear = tienePermiso(OPCION, 'crear');
    const puedeModificar = tienePermiso(OPCION, 'modificar');
    const puedeEliminar = tienePermiso(OPCION, 'eliminar');

    // Quien es adoptante y puede crear solicitudes ve "Quiero adoptarla" y
    // el cuestionario de compatibilidad (opcional). El backend lo exige igual.
    const puedeSolicitar = usuario?.rol === 'ADOPTANTE' && tienePermiso(OPCION_SOLICITUDES, 'crear');

    const [filtros, setFiltros] = useState({ texto: '', idEspecie: '', estado: '' });
    const [textoBusqueda, setTextoBusqueda] = useState('');
    const [especies, setEspecies] = useState([]);

    // Los estados que el staff puede elegir; null mientras carga.
    const [estados, setEstados] = useState(esStaff ? null : []);

    // null = cargando. Si falla, error trae el mensaje.
    const [mascotas, setMascotas] = useState(null);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');

    // Panel abierto sobre la lista: null = ninguno, o { tipo, mascota }.
    // tipo: 'ficha' | 'nueva' | 'editar' | 'desactivar' | 'reactivar'.
    const [panel, setPanel] = useState(null);

    // Ventanas emergentes de adopción: el cuestionario abierto y/o la
    // solicitud por confirmar { mascota, cuestionario }.
    const [cuestionarioAbierto, setCuestionarioAbierto] = useState(false);
    const [solicitud, setSolicitud] = useState(null);

    useEffect(() => {
        let vigente = true;

        listarCatalogo('especies')
            .then((lista) => vigente && setEspecies(lista))
            .catch(() => undefined);

        if (esStaff) {
            listarEstados()
                .then((lista) => vigente && setEstados(lista))
                .catch((err) => vigente && setError(err.message));
        }

        return () => {
            vigente = false;
        };
    }, [esStaff]);

    // Cada vez que cambian los filtros se vuelve a pedir la lista.
    // vigente evita pintar una respuesta vieja.
    useEffect(() => {
        let vigente = true;

        listarMascotas(filtros)
            .then((datos) => {
                if (vigente) {
                    setMascotas(datos);
                    setError('');
                }
            })
            .catch((err) => {
                if (vigente) {
                    setMascotas([]);
                    setError(err.message);
                }
            });

        return () => {
            vigente = false;
        };
    }, [filtros]);

    function buscar(evento) {
        evento.preventDefault();
        setMascotas(null);
        setFiltros((anterior) => ({ ...anterior, texto: textoBusqueda.trim() }));
    }

    function cambiarFiltro(campo, valor) {
        setMascotas(null);
        setFiltros((anterior) => ({ ...anterior, [campo]: valor }));
    }

    // Reemplaza (o agrega) una mascota en la lista sin volver a pedirla.
    function actualizarEnLista(mascota) {
        setMascotas((anterior) => {
            const existe = anterior.some((fila) => fila.id === mascota.id);
            return existe
                ? anterior.map((fila) => (fila.id === mascota.id ? mascota : fila))
                : [mascota, ...anterior];
        });
    }

    // Guardar datos: una nueva sigue abierta en edición, para poder subir
    // sus fotos; una editada vuelve a la lista.
    function alGuardar(mascota, esNueva) {
        actualizarEnLista(mascota);

        if (esNueva) {
            setPanel({ tipo: 'editar', mascota });
            setAviso(`${mascota.nombre} se creó. Abajo del formulario puedes agregar sus fotos.`);
            subirAlInicio();
        } else {
            setPanel(null);
            setAviso('Los datos se guardaron.');
        }
    }

    // Solo cambiaron las fotos: se actualiza la lista y se sigue editando.
    function alCambiarFotos(mascota) {
        actualizarEnLista(mascota);
        setPanel((actual) => (actual ? { ...actual, mascota } : actual));
    }

    function alCambiarAlbergue(mascota) {
        actualizarEnLista(mascota);
        setPanel(null);
        setAviso(mascota.activo ? `${mascota.nombre} volvió al albergue.` : `${mascota.nombre} se desactivó.`);
    }

    // Los paneles se abren arriba de la lista: se sube para que se vean.
    function subirAlInicio() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function abrir(tipo, mascota = null) {
        setAviso('');
        setPanel({ tipo, mascota });
        subirAlInicio();
    }

    // Camino directo: desde el catálogo o la ficha, sin cuestionario.
    function empezarSolicitud(mascota) {
        setSolicitud({ mascota, cuestionario: undefined });
    }

    // Camino por match: la mascota elegida de las recomendadas, con las respuestas.
    function elegirRecomendada(mascota, cuestionario) {
        setCuestionarioAbierto(false);
        setSolicitud({ mascota, cuestionario });
    }

    function alTerminarSolicitud() {
        setSolicitud(null);
        setAviso('Tu solicitud fue enviada. El albergue se pondrá en contacto contigo.');
        subirAlInicio();
    }

    const hayFiltros = Boolean(filtros.texto || filtros.idEspecie || filtros.estado);
    const panelListo = estados !== null;

    return (
        <section>
            <header className="cabecera-pagina">
                <h1>Mascotas</h1>
                <p className="texto-suave">
                    {esStaff
                        ? 'Los animales del albergue: sus datos, sus fotos y su situación.'
                        : 'Conoce a las mascotas que esperan un hogar.'}
                </p>
            </header>

            {puedeSolicitar && (
                <div className="tarjeta solicitudes-banner">
                    <p>¿No sabes cuál peludito elegir? Haz nuestro cuestionario de compatibilidad y te diremos cuáles encajan mejor contigo.</p>
                    <button type="button" className="boton" onClick={() => setCuestionarioAbierto(true)}>
                        Hacer el cuestionario
                    </button>
                </div>
            )}

            <form className="tarjeta mascotas-barra" onSubmit={buscar}>
                <label className="campo">
                    Buscar
                    <input
                        type="search"
                        value={textoBusqueda}
                        onChange={(e) => setTextoBusqueda(e.target.value)}
                        placeholder="Nombre"
                        maxLength={50}
                    />
                </label>

                <label className="campo">
                    Especie
                    <select value={filtros.idEspecie} onChange={(e) => cambiarFiltro('idEspecie', e.target.value)}>
                        <option value="">Todas</option>
                        {especies.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                </label>

                {esStaff && (
                    <label className="campo">
                        En el albergue
                        <select value={filtros.estado} onChange={(e) => cambiarFiltro('estado', e.target.value)}>
                            <option value="">Todas</option>
                            <option value="activos">En el albergue</option>
                            <option value="inactivos">Desactivadas</option>
                        </select>
                    </label>
                )}

                <div className="mascotas-botones">
                    <button type="submit" className="boton">Buscar</button>
                    {puedeCrear && !panel && (
                        <button type="button" className="boton boton-secundario" onClick={() => abrir('nueva')}>
                            Nueva mascota
                        </button>
                    )}
                </div>
            </form>

            {panel?.tipo === 'ficha' && (
                <FichaMascota
                    key={panel.mascota.id}
                    mascota={panel.mascota}
                    alCerrar={() => setPanel(null)}
                    alAdoptar={puedeSolicitar ? empezarSolicitud : undefined}
                />
            )}

            {(panel?.tipo === 'nueva' || panel?.tipo === 'editar') && (
                panelListo ? (
                    <FormularioMascota
                        key={panel.mascota?.id ?? 'nueva'}
                        mascota={panel.mascota}
                        estados={estados}
                        alGuardar={alGuardar}
                        alCambiar={alCambiarFotos}
                        alCancelar={() => setPanel(null)}
                    />
                ) : <p className="tarjeta mensaje-carga">Cargando...</p>
            )}

            {(panel?.tipo === 'desactivar' || panel?.tipo === 'reactivar') && (
                panelListo ? (
                    <FormularioAlbergue
                        key={`${panel.tipo}-${panel.mascota.id}`}
                        mascota={panel.mascota}
                        modo={panel.tipo}
                        estados={estados}
                        alGuardar={alCambiarAlbergue}
                        alCancelar={() => setPanel(null)}
                    />
                ) : <p className="tarjeta mensaje-carga">Cargando...</p>
            )}

            {error && <p className="aviso aviso-error">{error}</p>}
            {aviso && <p className="aviso aviso-exito">{aviso}</p>}

            {mascotas === null ? (
                <p className="tarjeta mensaje-carga">Cargando...</p>
            ) : mascotas.length === 0 ? (
                <div className="tarjeta">
                    {hayFiltros ? (
                        <EstadoVacio
                            icono={IconoLupa}
                            titulo="Sin resultados"
                            texto="Ninguna mascota coincide con la búsqueda."
                        />
                    ) : (
                        <EstadoVacio
                            icono={IconoMascota}
                            titulo="Todavía no hay mascotas"
                            texto={esStaff ? 'Cuando registres la primera aparecerá aquí.' : 'Pronto habrá nuevos amigos esperando un hogar.'}
                        >
                            {puedeCrear && !panel && (
                                <button type="button" className="boton" onClick={() => abrir('nueva')}>
                                    Registrar la primera
                                </button>
                            )}
                        </EstadoVacio>
                    )}
                </div>
            ) : (
                <ul className="mascotas-rejilla">
                    {mascotas.map((m) => (
                        <li key={m.id} className={m.activo === false ? 'tarjeta mascotas-tarjeta fila-inactiva' : 'tarjeta mascotas-tarjeta'}>
                            <FotoMascota idFoto={m.idFotoPrincipal} alt={`Foto de ${m.nombre}`} />

                            <div className="mascotas-tarjeta-cuerpo">
                                <h2>{m.nombre}</h2>
                                <p className="texto-suave">{m.especie} · {m.raza}</p>
                                <p>{formatearEdad(m.edadActualMeses)} · {m.sexo} · {m.tamanio}</p>

                                <div className="mascotas-insignias">
                                    {!m.esAdoptable && <span className="insignia">{m.estado}</span>}
                                    {m.activo === false && <span className="insignia">Desactivada</span>}
                                </div>
                            </div>

                            <div className="mascotas-botones">
                                <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => abrir('ficha', m)}>
                                    Ver ficha
                                </button>
                                {puedeSolicitar && m.esAdoptable && (
                                    <button type="button" className="boton boton-pequeno" onClick={() => empezarSolicitud(m)}>
                                        Quiero adoptarla
                                    </button>
                                )}
                                {puedeModificar && (
                                    <>
                                        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => abrir('editar', m)}>
                                            Editar
                                        </button>
                                        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => abrir('editar', m)}>
                                            Fotos
                                        </button>
                                    </>
                                )}
                                {puedeEliminar && (
                                    <button
                                        type="button"
                                        className={m.activo ? 'boton boton-peligro boton-pequeno' : 'boton boton-pequeno'}
                                        onClick={() => abrir(m.activo ? 'desactivar' : 'reactivar', m)}
                                    >
                                        {m.activo ? 'Desactivar' : 'Reactivar'}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {cuestionarioAbierto && (
                <CuestionarioCompatibilidad
                    alElegir={elegirRecomendada}
                    alCerrar={() => setCuestionarioAbierto(false)}
                />
            )}

            {solicitud && (
                <ConfirmarSolicitud
                    mascota={solicitud.mascota}
                    cuestionario={solicitud.cuestionario}
                    alTerminar={alTerminarSolicitud}
                    alCancelar={() => setSolicitud(null)}
                />
            )}
        </section>
    );
}
