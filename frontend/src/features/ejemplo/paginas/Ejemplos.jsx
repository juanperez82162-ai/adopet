import '../ejemplo.css';
import { useEffect, useState } from 'react';
import { useSesion } from '../../../hooks/useSesion.js';
import { listarEjemplos, cambiarEstadoEjemplo } from '../ejemplo.api.js';
import { FormularioEjemplo } from '../componentes/FormularioEjemplo.jsx';
import { EstadoVacio } from '../../../componentes/EstadoVacio.jsx';
import { IconoLupa } from '../../../componentes/Iconos.jsx';

// CAMBIA ESTO: el nombre de la opción del menú (OPCIONES_MENU.NOMBRE_OPCION).
const OPCION = 'EJEMPLO';

// Página principal del módulo: lista con filtros, alta, edición y
// activar / desactivar. Muestra los tres estados de toda lista:
// cargando, error y vacía.
//
// Los botones se muestran según los permisos del perfil. Eso es solo
// experiencia de usuario: la seguridad real es autorizar() en el backend.
export function Ejemplos() {
    const { tienePermiso } = useSesion();
    const puedeCrear = tienePermiso(OPCION, 'crear');
    const puedeModificar = tienePermiso(OPCION, 'modificar');
    const puedeEliminar = tienePermiso(OPCION, 'eliminar');

    const [filtros, setFiltros] = useState({ texto: '', estado: '' });
    const [textoBusqueda, setTextoBusqueda] = useState('');

    // null = cargando. Si falla, error trae el mensaje.
    const [registros, setRegistros] = useState(null);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');

    // Formulario abierto: undefined = cerrado, null = nuevo, objeto = editar.
    const [enEdicion, setEnEdicion] = useState(undefined);

    // Cada vez que cambian los filtros se vuelve a pedir la lista.
    // vigente evita pintar una respuesta vieja si los filtros cambiaron
    // antes de que llegara.
    useEffect(() => {
        let vigente = true;

        listarEjemplos(filtros)
            .then((datos) => {
                if (vigente) {
                    setRegistros(datos);
                    setError('');
                }
            })
            .catch((err) => {
                if (vigente) {
                    setRegistros([]);
                    setError(err.message);
                }
            });

        return () => {
            vigente = false;
        };
    }, [filtros]);

    function buscar(evento) {
        evento.preventDefault();
        setRegistros(null);
        setFiltros((anterior) => ({ ...anterior, texto: textoBusqueda.trim() }));
    }

    function cambiarEstadoFiltro(estado) {
        setRegistros(null);
        setFiltros((anterior) => ({ ...anterior, estado }));
    }

    // Reemplaza (o agrega) un registro en la lista sin volver a pedirla.
    function actualizarEnLista(registro) {
        setRegistros((anterior) => {
            const existe = anterior.some((fila) => fila.id === registro.id);
            return existe
                ? anterior.map((fila) => (fila.id === registro.id ? registro : fila))
                : [registro, ...anterior];
        });
    }

    function alGuardar(registro) {
        actualizarEnLista(registro);
        setEnEdicion(undefined);
        setAviso('Los datos se guardaron.');
    }

    async function alternarEstado(registro) {
        setAviso('');

        try {
            actualizarEnLista(await cambiarEstadoEjemplo(registro.id, !registro.activo));
        } catch (err) {
            setError(err.message);
        }
    }

    const hayFiltros = Boolean(filtros.texto || filtros.estado);

    return (
        <section>
            <header className="cabecera-pagina">
                {/* CAMBIA ESTO: título y explicación del módulo. */}
                <h1>Ejemplos</h1>
                <p className="texto-suave">Plantilla de un módulo: copia esta carpeta para crear uno nuevo.</p>
            </header>

            <form className="tarjeta ejemplo-barra" onSubmit={buscar}>
                <label className="campo">
                    Buscar
                    <input
                        type="search"
                        value={textoBusqueda}
                        onChange={(e) => setTextoBusqueda(e.target.value)}
                        placeholder="Nombre"
                        maxLength={60}
                    />
                </label>

                <label className="campo">
                    Estado
                    <select value={filtros.estado} onChange={(e) => cambiarEstadoFiltro(e.target.value)}>
                        <option value="">Todos</option>
                        <option value="activos">Activos</option>
                        <option value="inactivos">Desactivados</option>
                    </select>
                </label>

                <div className="ejemplo-botones">
                    <button type="submit" className="boton">Buscar</button>
                    {puedeCrear && enEdicion === undefined && (
                        <button type="button" className="boton boton-secundario" onClick={() => setEnEdicion(null)}>
                            Nuevo
                        </button>
                    )}
                </div>
            </form>

            {/* key: al pasar de un registro a otro, el formulario arranca de cero. */}
            {enEdicion !== undefined && (
                <FormularioEjemplo
                    key={enEdicion?.id ?? 'nuevo'}
                    ejemplo={enEdicion}
                    alGuardar={alGuardar}
                    alCancelar={() => setEnEdicion(undefined)}
                />
            )}

            {error && <p className="aviso aviso-error">{error}</p>}
            {aviso && <p className="aviso aviso-exito">{aviso}</p>}

            <div className="tarjeta">
                {registros === null ? (
                    <p className="mensaje-carga">Cargando...</p>
                ) : registros.length === 0 ? (
                    // Lista vacía: el mensaje cambia si hay filtros o no.
                    hayFiltros ? (
                        <EstadoVacio
                            icono={IconoLupa}
                            titulo="Sin resultados"
                            texto="Ningún registro coincide con la búsqueda."
                        />
                    ) : (
                        // CAMBIA ESTO: ícono y textos del módulo (ej. icono={IconoMascota}).
                        <EstadoVacio titulo="Todavía no hay registros" texto="Cuando se cree el primero aparecerá aquí.">
                            {puedeCrear && enEdicion === undefined && (
                                <button type="button" className="boton" onClick={() => setEnEdicion(null)}>
                                    Crear el primero
                                </button>
                            )}
                        </EstadoVacio>
                    )
                ) : (
                    <div className="tabla-contenedor">
                        <table className="tabla">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Descripción</th>
                                    <th>Estado</th>
                                    {(puedeModificar || puedeEliminar) && <th className="columna-acciones">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {registros.map((fila) => (
                                    <tr key={fila.id} className={fila.activo ? '' : 'fila-inactiva'}>
                                        <td>{fila.nombre}</td>
                                        <td>{fila.descripcion || '—'}</td>
                                        <td>
                                            <span className={fila.activo ? 'insignia insignia-activa' : 'insignia'}>
                                                {fila.activo ? 'Activo' : 'Desactivado'}
                                            </span>
                                        </td>
                                        {(puedeModificar || puedeEliminar) && (
                                            <td className="columna-acciones">
                                                {puedeModificar && (
                                                    <button
                                                        type="button"
                                                        className="boton boton-secundario boton-pequeno"
                                                        onClick={() => setEnEdicion(fila)}
                                                    >
                                                        Editar
                                                    </button>
                                                )}
                                                {puedeEliminar && (
                                                    <button
                                                        type="button"
                                                        className={fila.activo ? 'boton boton-peligro boton-pequeno' : 'boton boton-pequeno'}
                                                        onClick={() => alternarEstado(fila)}
                                                    >
                                                        {fila.activo ? 'Desactivar' : 'Activar'}
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
