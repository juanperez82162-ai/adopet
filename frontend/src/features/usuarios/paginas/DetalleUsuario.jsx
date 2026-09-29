import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSesion } from '../../../hooks/useSesion.js';
import { listarCatalogo } from '../../catalogos/catalogos.api.js';
import { FormularioDatosUsuario } from '../componentes/FormularioDatosUsuario.jsx';
import {
    obtenerUsuario,
    listarPerfiles,
    editarUsuario,
    cambiarPerfilUsuario,
    cambiarEstadoUsuario
} from '../usuarios.api.js';

export function DetalleUsuario() {
    const { documento } = useParams();
    const ubicacion = useLocation();
    const { usuario: yo, tienePermiso, actualizarUsuario } = useSesion();

    const [usuario, setUsuario] = useState(null);
    const [perfiles, setPerfiles] = useState([]);
    const [ciudades, setCiudades] = useState([]);
    const [error, setError] = useState('');

    const esYo = documento === yo.documento;
    const volverA = `/usuarios${ubicacion.state?.desde ? `?${ubicacion.state.desde}` : ''}`;

    useEffect(() => {
        let vigente = true;

        Promise.all([obtenerUsuario(documento), listarPerfiles(), listarCatalogo('ciudades')])
            .then(([datosUsuario, listaPerfiles, listaCiudades]) => {
                if (vigente) {
                    setUsuario(datosUsuario);
                    setPerfiles(listaPerfiles);
                    setCiudades(listaCiudades);
                }
            })
            .catch((err) => vigente && setError(err.message));

        return () => {
            vigente = false;
        };
    }, [documento]);

    async function guardarDatos(datos) {
        const actualizado = await editarUsuario(documento, datos);
        setUsuario(actualizado);

        // Si el Admin se edita a sí mismo desde aquí, se refresca el encabezado.
        if (esYo) {
            actualizarUsuario({ nombre: actualizado.nombre, correo: actualizado.correo });
        }

        return actualizado;
    }

    return (
        <section>
            <Link to={volverA} className="enlace-volver">← Volver a usuarios</Link>

            {error && <p className="aviso aviso-error">{error}</p>}
            {!usuario && !error && <p className="mensaje-carga">Cargando...</p>}

            {usuario && (
                <>
                    <header className="cabecera-pagina cabecera-usuario">
                        <h1>{usuario.nombreCompleto}</h1>
                        <div className="insignias">
                            <span className={`insignia insignia-perfil-${usuario.perfil.toLowerCase()}`}>{usuario.perfil}</span>
                            <span className={usuario.activo ? 'insignia insignia-activa' : 'insignia'}>
                                {usuario.activo ? 'Activo' : 'Desactivado'}
                            </span>
                            {esYo && <span className="insignia insignia-tu">Tú</span>}
                        </div>
                    </header>

                    <div className="perfil-rejilla">
                        <FormularioDatosUsuario
                            key={usuario.documento}
                            usuario={usuario}
                            ciudades={ciudades}
                            puedeModificar={tienePermiso('USUARIOS', 'modificar')}
                            guardar={guardarDatos}
                        />

                        <div className="columna-tarjetas">
                            <TarjetaPerfil
                                usuario={usuario}
                                perfiles={perfiles}
                                esYo={esYo}
                                puedeModificar={tienePermiso('USUARIOS', 'modificar')}
                                alCambiar={setUsuario}
                            />
                            <TarjetaEstado
                                usuario={usuario}
                                esYo={esYo}
                                puedeDesactivar={tienePermiso('USUARIOS', 'eliminar')}
                                alCambiar={setUsuario}
                            />
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}

// ---- Perfil ------------------------------------------------------------

function TarjetaPerfil({ usuario, perfiles, esYo, puedeModificar, alCambiar }) {
    const [idPerfil, setIdPerfil] = useState(String(usuario.idPerfil));
    const [aviso, setAviso] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const bloqueado = esYo || !puedeModificar;
    const sinCambios = idPerfil === String(usuario.idPerfil);

    async function guardar(evento) {
        evento.preventDefault();
        setAviso(null);
        setGuardando(true);

        try {
            const actualizado = await cambiarPerfilUsuario(usuario.documento, Number(idPerfil));
            alCambiar(actualizado);
            setAviso({ tipo: 'exito', texto: `Ahora tiene el perfil ${actualizado.perfil}.` });
        } catch (err) {
            setAviso({ tipo: 'error', texto: err.message });
        } finally {
            setGuardando(false);
        }
    }

    return (
        <form className="tarjeta formulario" onSubmit={guardar}>
            <h2>Perfil</h2>
            <p className="texto-suave">
                El perfil decide qué módulos ve y qué puede hacer. Con <strong>Vetado</strong> la persona sigue
                entrando, pero sin acceso a ningún módulo.
            </p>

            <label className="campo">
                Perfil
                <select value={idPerfil} onChange={(e) => setIdPerfil(e.target.value)} disabled={bloqueado || guardando}>
                    {perfiles.map((perfil) => (
                        <option key={perfil.id} value={perfil.id}>
                            {perfil.nombre} ({perfil.rol === 'STAFF' ? 'staff' : 'adoptante'})
                        </option>
                    ))}
                </select>
            </label>

            {esYo && <p className="nota">No puedes cambiar tu propio perfil. Pídeselo a otro administrador.</p>}
            {aviso && <p className={`aviso aviso-${aviso.tipo}`}>{aviso.texto}</p>}

            {!bloqueado && (
                <button type="submit" className="boton" disabled={sinCambios || guardando}>
                    {guardando ? 'Guardando...' : 'Cambiar perfil'}
                </button>
            )}
        </form>
    );
}

// ---- Activar / desactivar ---------------------------------------------

function TarjetaEstado({ usuario, esYo, puedeDesactivar, alCambiar }) {
    const [confirmando, setConfirmando] = useState(false);
    const [aviso, setAviso] = useState(null);
    const [guardando, setGuardando] = useState(false);

    async function cambiar(activo) {
        setAviso(null);
        setGuardando(true);

        try {
            const actualizado = await cambiarEstadoUsuario(usuario.documento, activo);
            alCambiar(actualizado);
            setConfirmando(false);
            setAviso({ tipo: 'exito', texto: activo ? 'La cuenta se activó.' : 'La cuenta se desactivó.' });
        } catch (err) {
            setAviso({ tipo: 'error', texto: err.message });
        } finally {
            setGuardando(false);
        }
    }

    return (
        <div className="tarjeta formulario">
            <h2>Cuenta</h2>
            <p className="texto-suave">
                {usuario.activo
                    ? 'La cuenta está activa. Si la desactivas, la persona no podrá iniciar sesión.'
                    : 'La cuenta está desactivada: la persona no puede iniciar sesión.'}
            </p>

            {esYo && <p className="nota">No puedes desactivar tu propia cuenta.</p>}
            {aviso && <p className={`aviso aviso-${aviso.tipo}`}>{aviso.texto}</p>}

            {puedeDesactivar && !esYo && usuario.activo && !confirmando && (
                <button type="button" className="boton boton-peligro" onClick={() => setConfirmando(true)}>
                    Desactivar cuenta
                </button>
            )}

            {confirmando && (
                <div className="confirmacion">
                    <p>¿Seguro que quieres desactivar a {usuario.nombre}?</p>
                    <div className="confirmacion-botones">
                        <button type="button" className="boton boton-peligro" onClick={() => cambiar(false)} disabled={guardando}>
                            {guardando ? 'Desactivando...' : 'Sí, desactivar'}
                        </button>
                        <button type="button" className="boton boton-secundario" onClick={() => setConfirmando(false)} disabled={guardando}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {puedeDesactivar && !usuario.activo && (
                <button type="button" className="boton" onClick={() => cambiar(true)} disabled={guardando}>
                    {guardando ? 'Activando...' : 'Activar cuenta'}
                </button>
            )}
        </div>
    );
}
