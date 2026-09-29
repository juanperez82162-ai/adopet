import '../catalogos.css';
import { useEffect, useState } from 'react';
import { useSesion } from '../../../hooks/useSesion.js';
import { listarDefiniciones, listarCatalogo, operacionesDe } from '../catalogos.api.js';

// Explica qué es el nivel y qué significa cada uno en el catálogo elegido.
function ExplicacionNivel({ definicion }) {
    return (
        <div className="explicacion">
            <p className="explicacion-titulo">¿Qué es el nivel?</p>
            <p>
                Es el grupo que usa el sistema para calcular la compatibilidad entre el adoptante y la mascota.
                Varios valores pueden compartir el mismo nivel. Los niveles de este catálogo son:
            </p>
            <ul className="explicacion-niveles">
                {Object.entries(definicion.niveles).map(([nivel, etiqueta]) => (
                    <li key={nivel}>
                        <span className="insignia insignia-nivel">{nivel}</span> {etiqueta}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function Catalogos() {
    const { tienePermiso } = useSesion();
    const puedeCrear = tienePermiso('CATALOGOS', 'crear');
    const puedeModificar = tienePermiso('CATALOGOS', 'modificar');
    const puedeDesactivar = tienePermiso('CATALOGOS', 'eliminar');

    const [definiciones, setDefiniciones] = useState([]);
    const [especies, setEspecies] = useState([]);
    const [seleccionado, setSeleccionado] = useState(null);
    const [idEspecie, setIdEspecie] = useState(null);
    const [valores, setValores] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');

    const [nuevoNombre, setNuevoNombre] = useState('');
    const [editandoId, setEditandoId] = useState(null);
    const [nombreEditado, setNombreEditado] = useState('');
    const [descripcionEditada, setDescripcionEditada] = useState('');

    async function cargarValores(definicion, especie) {
        setCargando(true);
        setError('');

        try {
            setValores(await operacionesDe(definicion, especie).listar());
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    // Al entrar: catálogos disponibles (del backend) y especies (para razas).
    useEffect(() => {
        let vigente = true;

        Promise.all([listarDefiniciones(), listarCatalogo('especies')])
            .then(async ([lista, listaEspecies]) => {
                if (!vigente || lista.length === 0) {
                    return;
                }

                setDefiniciones(lista);
                setEspecies(listaEspecies);
                setIdEspecie(listaEspecies[0]?.id ?? null);
                setSeleccionado(lista[0]);
                setCargando(true);

                const primeros = await operacionesDe(lista[0], listaEspecies[0]?.id).listar();

                if (vigente) {
                    setValores(primeros);
                }
            })
            .catch((err) => vigente && setError(err.message))
            .finally(() => vigente && setCargando(false));

        return () => {
            vigente = false;
        };
    }, []);

    function limpiarEdicion() {
        setEditandoId(null);
        setNuevoNombre('');
        setAviso('');
    }

    function elegirCatalogo(definicion) {
        setSeleccionado(definicion);
        limpiarEdicion();
        cargarValores(definicion, idEspecie);
    }

    function elegirEspecie(evento) {
        const especie = Number(evento.target.value);
        setIdEspecie(especie);
        limpiarEdicion();
        cargarValores(seleccionado, especie);
    }

    // Ejecuta una acción, muestra el resultado y recarga la tabla.
    async function ejecutar(accion, mensajeExito) {
        setError('');
        setAviso('');

        try {
            await accion(operacionesDe(seleccionado, idEspecie));
            setAviso(mensajeExito);
            await cargarValores(seleccionado, idEspecie);
        } catch (err) {
            setError(err.message);
        }
    }

    function crear(evento) {
        evento.preventDefault();
        const nombre = nuevoNombre.trim();

        ejecutar(async (operaciones) => {
            await operaciones.crear({ nombre });
            setNuevoNombre('');
        }, `"${nombre}" se agregó a ${seleccionado.etiqueta.toLowerCase()}.`);
    }

    function empezarEdicion(valor) {
        setEditandoId(valor.id);
        setNombreEditado(valor.nombre);
        setDescripcionEditada(valor.descripcion ?? '');
    }

    function guardarEdicion(valor) {
        const nombre = nombreEditado.trim();
        const datos = seleccionado.conDescripcion
            ? { nombre, descripcion: descripcionEditada.trim() }
            : { nombre };

        ejecutar(async (operaciones) => {
            await operaciones.modificar(valor.id, datos);
            setEditandoId(null);
        }, `"${nombre}" se actualizó.`);
    }

    function alternarEstado(valor) {
        const activar = !valor.activo;

        ejecutar(
            (operaciones) => operaciones.cambiarEstado(valor.id, activar),
            `"${valor.nombre}" quedó ${activar ? 'activo' : 'inactivo'}.`
        );
    }

    const hayAcciones = puedeModificar || puedeDesactivar;

    return (
        <section>
            <header className="cabecera-pagina">
                <h1>Catálogos</h1>
                <p className="texto-suave">
                    Las opciones que aparecen en los formularios del sistema. Nada se borra: los valores se desactivan.
                </p>
            </header>

            <div className="pestanas">
                {definiciones.map((definicion) => (
                    <button
                        key={definicion.clave}
                        type="button"
                        className={seleccionado?.clave === definicion.clave ? 'pestana activa' : 'pestana'}
                        onClick={() => elegirCatalogo(definicion)}
                    >
                        {definicion.etiqueta}
                    </button>
                ))}
            </div>

            {error && <p className="aviso aviso-error">{error}</p>}
            {aviso && <p className="aviso aviso-exito">{aviso}</p>}

            {seleccionado && (
                <div className="tarjeta">
                    {seleccionado.dependeDeEspecie && (
                        <label className="campo campo-filtro">
                            Especie
                            <select value={idEspecie ?? ''} onChange={elegirEspecie}>
                                {especies.map((especie) => (
                                    <option key={especie.id} value={especie.id}>{especie.nombre}</option>
                                ))}
                            </select>
                        </label>
                    )}

                    {seleccionado.conNivel && <ExplicacionNivel definicion={seleccionado} />}

                    {seleccionado.permiteCrear && puedeCrear && (
                        <form className="formulario-linea" onSubmit={crear}>
                            <input
                                value={nuevoNombre}
                                onChange={(e) => setNuevoNombre(e.target.value)}
                                maxLength={seleccionado.largoNombre}
                                placeholder={`Nuevo valor en ${seleccionado.etiqueta.toLowerCase()}`}
                                required
                            />
                            <button type="submit" className="boton">Agregar</button>
                        </form>
                    )}

                    {!seleccionado.permiteCrear && (
                        <p className="nota">
                            {seleccionado.permiteDesactivar
                                ? 'Catálogo predefinido: sus opciones ya vienen definidas. Aquí se puede corregir el texto o desactivar una opción, pero no agregar nuevas.'
                                : 'Catálogo fijo: el flujo de adopción está programado sobre cada estado, así que no se agregan ni se desactivan.'}
                        </p>
                    )}

                    {cargando ? (
                        <p className="mensaje-carga">Cargando...</p>
                    ) : (
                        <div className="tabla-contenedor">
                        <table className="tabla">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    {seleccionado.conDescripcion && <th>Descripción</th>}
                                    {seleccionado.conNivel && <th>Nivel</th>}
                                    <th>Estado</th>
                                    {hayAcciones && <th className="columna-acciones">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {valores.map((valor) => {
                                    const editando = editandoId === valor.id;

                                    return (
                                        <tr key={valor.id} className={valor.activo ? '' : 'fila-inactiva'}>
                                            <td>{valor.id}</td>
                                            <td>
                                                {editando ? (
                                                    <input
                                                        className="entrada-tabla"
                                                        value={nombreEditado}
                                                        onChange={(e) => setNombreEditado(e.target.value)}
                                                        maxLength={seleccionado.largoNombre}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <>
                                                        {valor.nombre}
                                                        {valor.esOtro && <span className="insignia insignia-otro">Opción «Otro»</span>}
                                                    </>
                                                )}
                                            </td>
                                            {seleccionado.conDescripcion && (
                                                <td className="columna-descripcion">
                                                    {editando ? (
                                                        <textarea
                                                            className="entrada-tabla"
                                                            value={descripcionEditada}
                                                            onChange={(e) => setDescripcionEditada(e.target.value)}
                                                            maxLength={seleccionado.largoDescripcion}
                                                            rows={2}
                                                        />
                                                    ) : (
                                                        valor.descripcion
                                                    )}
                                                </td>
                                            )}
                                            {seleccionado.conNivel && (
                                                <td className="columna-nivel">
                                                    <span className="insignia insignia-nivel">{valor.nivel}</span>{' '}
                                                    {valor.etiquetaNivel}
                                                </td>
                                            )}
                                            <td>
                                                <span className={valor.activo ? 'insignia insignia-activa' : 'insignia'}>
                                                    {valor.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            {hayAcciones && (
                                                <td className="columna-acciones">
                                                    {editando ? (
                                                        <>
                                                            <button type="button" className="boton boton-pequeno" onClick={() => guardarEdicion(valor)}>
                                                                Guardar
                                                            </button>
                                                            <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setEditandoId(null)}>
                                                                Cancelar
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {puedeModificar && (
                                                                <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => empezarEdicion(valor)}>
                                                                    Editar
                                                                </button>
                                                            )}
                                                            {puedeDesactivar && seleccionado.permiteDesactivar && (
                                                                <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => alternarEstado(valor)}>
                                                                    {valor.activo ? 'Desactivar' : 'Activar'}
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
