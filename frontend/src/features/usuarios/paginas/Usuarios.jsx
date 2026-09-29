import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSesion } from '../../../hooks/useSesion.js';
import { listarUsuarios, listarPerfiles } from '../usuarios.api.js';

// Los filtros viven en la URL (?buscar=...&idPerfil=...&estado=...):
// así, al volver del detalle de un usuario, la búsqueda sigue igual.
export function Usuarios() {
    const { usuario: yo } = useSesion();
    const [parametros, setParametros] = useSearchParams();

    const filtros = {
        buscar: parametros.get('buscar') || '',
        idPerfil: parametros.get('idPerfil') || '',
        estado: parametros.get('estado') || ''
    };
    const clave = parametros.toString();

    const [perfiles, setPerfiles] = useState([]);
    const [textoBusqueda, setTextoBusqueda] = useState(filtros.buscar);

    // resultado guarda para qué filtros se pidió: si no coincide con los
    // actuales, es que la búsqueda nueva todavía está cargando.
    const [resultado, setResultado] = useState(null);
    const cargando = resultado?.clave !== clave;

    useEffect(() => {
        listarPerfiles().then(setPerfiles).catch(() => setPerfiles([]));
    }, []);

    useEffect(() => {
        let vigente = true;

        listarUsuarios({
            buscar: parametros.get('buscar'),
            idPerfil: parametros.get('idPerfil'),
            estado: parametros.get('estado')
        })
            .then((datos) => vigente && setResultado({ clave, ...datos, error: '' }))
            .catch((err) => vigente && setResultado({ clave, usuarios: [], hayMas: false, error: err.message }));

        return () => {
            vigente = false;
        };
    }, [parametros, clave]);

    function aplicar(cambios) {
        const nuevos = { ...filtros, ...cambios };
        const limpios = Object.fromEntries(Object.entries(nuevos).filter(([, valor]) => valor));
        setParametros(limpios);
    }

    function buscar(evento) {
        evento.preventDefault();
        aplicar({ buscar: textoBusqueda.trim() });
    }

    function limpiar() {
        setTextoBusqueda('');
        setParametros({});
    }

    const hayFiltros = Boolean(filtros.buscar || filtros.idPerfil || filtros.estado);

    return (
        <section>
            <header className="cabecera-pagina">
                <h1>Usuarios</h1>
                <p className="texto-suave">
                    Consulta y administra las cuentas. Nada se borra: las cuentas se desactivan.
                </p>
            </header>

            <form className="tarjeta filtros" onSubmit={buscar}>
                <label className="campo filtro-busqueda">
                    Buscar
                    <input
                        type="search"
                        value={textoBusqueda}
                        onChange={(e) => setTextoBusqueda(e.target.value)}
                        placeholder="Documento, nombre o correo"
                        maxLength={100}
                    />
                </label>

                <label className="campo">
                    Perfil
                    <select value={filtros.idPerfil} onChange={(e) => aplicar({ idPerfil: e.target.value })}>
                        <option value="">Todos</option>
                        {perfiles.map((perfil) => (
                            <option key={perfil.id} value={perfil.id}>{perfil.nombre}</option>
                        ))}
                    </select>
                </label>

                <label className="campo">
                    Estado
                    <select value={filtros.estado} onChange={(e) => aplicar({ estado: e.target.value })}>
                        <option value="">Todos</option>
                        <option value="activos">Activos</option>
                        <option value="inactivos">Desactivados</option>
                    </select>
                </label>

                <div className="filtros-botones">
                    <button type="submit" className="boton">Buscar</button>
                    {hayFiltros && (
                        <button type="button" className="boton boton-secundario" onClick={limpiar}>Limpiar</button>
                    )}
                </div>
            </form>

            {resultado?.error && <p className="aviso aviso-error">{resultado.error}</p>}

            <div className="tarjeta">
                {cargando ? (
                    <p className="mensaje-carga">Buscando...</p>
                ) : resultado.usuarios.length === 0 ? (
                    <p className="mensaje-carga">
                        {hayFiltros ? 'Ningún usuario coincide con la búsqueda.' : 'Todavía no hay usuarios.'}
                    </p>
                ) : (
                    <>
                        <p className="texto-suave conteo">
                            {resultado.hayMas
                                ? `Se muestran los ${resultado.usuarios.length} más recientes. Usa el buscador para encontrar a alguien en particular.`
                                : `${resultado.usuarios.length} ${resultado.usuarios.length === 1 ? 'usuario' : 'usuarios'}`}
                        </p>

                        <div className="tabla-contenedor">
                            <table className="tabla tabla-usuarios">
                                <thead>
                                    <tr>
                                        <th>Documento</th>
                                        <th>Nombre</th>
                                        <th>Correo</th>
                                        <th>Perfil</th>
                                        <th>Estado</th>
                                        <th className="columna-acciones">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resultado.usuarios.map((fila) => (
                                        <tr key={fila.documento} className={fila.activo ? '' : 'fila-inactiva'}>
                                            <td>{fila.tipoDocumento} {fila.documento}</td>
                                            <td>
                                                {fila.nombreCompleto}
                                                {fila.documento === yo.documento && <span className="insignia insignia-tu">Tú</span>}
                                            </td>
                                            <td>{fila.correo}</td>
                                            <td>
                                                <span className={`insignia insignia-perfil-${fila.perfil.toLowerCase()}`}>
                                                    {fila.perfil}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={fila.activo ? 'insignia insignia-activa' : 'insignia'}>
                                                    {fila.activo ? 'Activo' : 'Desactivado'}
                                                </span>
                                            </td>
                                            <td className="columna-acciones">
                                                <Link
                                                    to={`/usuarios/${encodeURIComponent(fila.documento)}`}
                                                    state={{ desde: parametros.toString() }}
                                                    className="boton boton-secundario boton-pequeno boton-enlace"
                                                >
                                                    Ver
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
