import { useEffect, useState } from 'react';
import { useSesion } from '../../../hooks/useSesion.js';
import { listarDefiniciones, listarCatalogo, operacionesDe } from '../catalogos.api.js';

const NIVELES = [
    { valor: 1, etiqueta: '1 · Bajo' },
    { valor: 2, etiqueta: '2 · Medio' },
    { valor: 3, etiqueta: '3 · Alto' }
];

function SelectorNivel({ valor, onChange, className = '' }) {
    return (
        <select className={className} value={valor} onChange={(e) => onChange(Number(e.target.value))}>
            {NIVELES.map((nivel) => (
                <option key={nivel.valor} value={nivel.valor}>{nivel.etiqueta}</option>
            ))}
        </select>
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
    const [nuevoNivel, setNuevoNivel] = useState(2);
    const [editandoId, setEditandoId] = useState(null);
    const [nombreEditado, setNombreEditado] = useState('');
    const [nivelEditado, setNivelEditado] = useState(2);

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
        setNuevoNivel(2);
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

    // Arma los datos a enviar: el nivel solo va en los catálogos que lo usan.
    function armarDatos(nombre, nivel) {
        return seleccionado.conNivel ? { nombre, nivel } : { nombre };
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
            await operaciones.crear(armarDatos(nombre, nuevoNivel));
            setNuevoNombre('');
            setNuevoNivel(2);
        }, `"${nombre}" se agregó a ${seleccionado.etiqueta.toLowerCase()}.`);
    }

    function empezarEdicion(valor) {
        setEditandoId(valor.id);
        setNombreEditado(valor.nombre);
        setNivelEditado(valor.nivel ?? 2);
    }

    function guardarEdicion(valor) {
        const nombre = nombreEditado.trim();

        ejecutar(async (operaciones) => {
            await operaciones.modificar(valor.id, armarDatos(nombre, nivelEditado));
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

                    {seleccionado.conNivel && (
                        <p className="nota">
                            <strong>Nivel:</strong> {seleccionado.descripcionNivel}. El motor de compatibilidad
                            compara niveles, así que cada valor nuevo debe tener su nivel correcto.
                        </p>
                    )}

                    {seleccionado.permiteCrear && puedeCrear && (
                        <form className="formulario-linea" onSubmit={crear}>
                            <input
                                value={nuevoNombre}
                                onChange={(e) => setNuevoNombre(e.target.value)}
                                maxLength={seleccionado.largoNombre}
                                placeholder={`Nuevo valor en ${seleccionado.etiqueta.toLowerCase()}`}
                                required
                            />
                            {seleccionado.conNivel && (
                                <SelectorNivel valor={nuevoNivel} onChange={setNuevoNivel} className="selector-linea" />
                            )}
                            <button type="submit" className="boton">Agregar</button>
                        </form>
                    )}

                    {!seleccionado.permiteCrear && (
                        <p className="nota">
                            Este catálogo tiene valores fijos: el flujo de adopción está programado sobre cada uno,
                            así que no se agregan ni se desactivan desde aquí.
                        </p>
                    )}

                    {cargando ? (
                        <p className="mensaje-carga">Cargando...</p>
                    ) : (
                        <table className="tabla">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
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
                                            {seleccionado.conNivel && (
                                                <td>
                                                    {editando ? (
                                                        <SelectorNivel valor={nivelEditado} onChange={setNivelEditado} className="entrada-tabla" />
                                                    ) : (
                                                        <span className="insignia insignia-nivel">{valor.nivel}</span>
                                                    )}
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
                    )}
                </div>
            )}
        </section>
    );
}
