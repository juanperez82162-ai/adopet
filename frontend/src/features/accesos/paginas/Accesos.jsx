import '../accesos.css';
import { useEffect, useState } from 'react';
import { useSesion } from '../../../hooks/useSesion.js';
import { iconoDe } from '../../../componentes/iconosModulos.js';
import {
    obtenerMatriz,
    guardarPermisos,
    crearPerfil,
    renombrarPerfil,
    cambiarEstadoPerfil
} from '../accesos.api.js';

const ACCIONES = [
    ['ver', 'Ver'],
    ['crear', 'Crear'],
    ['modificar', 'Modificar'],
    ['eliminar', 'Eliminar']
];

const SIN_PERMISO = { ver: false, crear: false, modificar: false, eliminar: false };

// Cómo se muestra cada rol en pantalla.
const DESCRIPCION_ROL = {
    STAFF: 'Staff: trabaja en la fundación',
    ADOPTANTE: 'Adoptante: quiere adoptar'
};

function nombreRol(rol) {
    return rol === 'STAFF' ? 'Staff' : 'Adoptante';
}

// Arma { idOpcion: { ver, crear, modificar, eliminar } } para un perfil.
// "Ver" es que exista la fila en PERFILES_OPCIONES.
function borradorDe(matriz, idPerfil) {
    const borrador = {};

    for (const opcion of matriz.opciones) {
        const permiso = matriz.permisos.find((fila) => fila.idPerfil === idPerfil && fila.idOpcion === opcion.id);
        borrador[opcion.id] = permiso
            ? { ver: true, crear: permiso.crear, modificar: permiso.modificar, eliminar: permiso.eliminar }
            : { ...SIN_PERMISO };
    }

    return borrador;
}

export function Accesos() {
    const { usuario, tienePermiso, refrescarMenu } = useSesion();
    const puedeCrear = tienePermiso('ACCESOS', 'crear');
    const puedeModificar = tienePermiso('ACCESOS', 'modificar');
    const puedeDesactivar = tienePermiso('ACCESOS', 'eliminar');
    const [creando, setCreando] = useState(false);

    const [matriz, setMatriz] = useState(null);
    const [idPerfil, setIdPerfil] = useState(null);
    const [borrador, setBorrador] = useState({});
    const [hayCambios, setHayCambios] = useState(false);
    const [aviso, setAviso] = useState(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        obtenerMatriz()
            .then((datos) => {
                const primero = datos.perfiles[0]?.id ?? null;
                setMatriz(datos);
                setIdPerfil(primero);
                setBorrador(primero ? borradorDe(datos, primero) : {});
            })
            .catch((err) => setAviso({ tipo: 'error', texto: err.message }));
    }, []);

    const perfil = matriz?.perfiles.find((fila) => fila.id === idPerfil);

    function elegirPerfil(id) {
        setIdPerfil(id);
        setBorrador(borradorDe(matriz, id));
        setHayCambios(false);
        setAviso(null);
    }

    function esProtegida(opcion) {
        return perfil?.opcionesProtegidas.includes(opcion.nombre);
    }

    function cambiar(idOpcion, accion) {
        setBorrador((anterior) => {
            const actual = anterior[idOpcion];
            const marcado = !actual[accion];
            let nuevo;

            if (accion === 'ver') {
                // Sin "Ver" no hay nada más: se desmarca toda la fila.
                nuevo = marcado ? { ...actual, ver: true } : { ...SIN_PERMISO };
            } else {
                // Cualquier acción implica poder ver el módulo.
                nuevo = { ...actual, [accion]: marcado, ver: actual.ver || marcado };
            }

            return { ...anterior, [idOpcion]: nuevo };
        });

        setHayCambios(true);
        setAviso(null);
    }

    function descartar() {
        setBorrador(borradorDe(matriz, idPerfil));
        setHayCambios(false);
        setAviso(null);
    }

    async function guardar() {
        setGuardando(true);
        setAviso(null);

        const permisos = matriz.opciones
            .filter((opcion) => borrador[opcion.id].ver)
            .map((opcion) => ({
                idOpcion: opcion.id,
                crear: borrador[opcion.id].crear,
                modificar: borrador[opcion.id].modificar,
                eliminar: borrador[opcion.id].eliminar
            }));

        try {
            const actualizada = await guardarPermisos(idPerfil, permisos);
            setMatriz(actualizada);
            setBorrador(borradorDe(actualizada, idPerfil));
            setHayCambios(false);
            setAviso({ tipo: 'exito', texto: `Se guardaron los accesos de ${perfil.nombre}. Aplican de inmediato.` });

            // Si se cambió el perfil de quien está usando la pantalla, su menú cambia ya.
            if (perfil.nombre === usuario.perfil) {
                await refrescarMenu();
            }
        } catch (err) {
            setAviso({ tipo: 'error', texto: err.message });
        } finally {
            setGuardando(false);
        }
    }

    // Tras crear, renombrar o activar un perfil, la matriz llega de nuevo
    // desde el backend y se deja seleccionado el perfil indicado.
    function recargar(nuevaMatriz, idSeleccionar, texto) {
        setMatriz(nuevaMatriz);
        setIdPerfil(idSeleccionar);
        setBorrador(borradorDe(nuevaMatriz, idSeleccionar));
        setHayCambios(false);
        setAviso(texto ? { tipo: 'exito', texto } : null);
    }

    const editable = puedeModificar && perfil?.activo && !perfil?.bloqueado;

    return (
        <section>
            <header className="cabecera-pagina">
                <h1>Accesos</h1>
                <p className="texto-suave">
                    Qué módulos ve cada perfil y qué puede hacer en ellos. Eliminar significa desactivar: en ADOPET nada se borra.
                </p>
            </header>

            {!matriz && !aviso && <p className="mensaje-carga">Cargando...</p>}

            {matriz && (
                <>
                    {creando ? (
                        <FormularioNuevoPerfil
                            roles={matriz.roles}
                            alCancelar={() => setCreando(false)}
                            alCrear={({ idPerfil: nuevo, matriz: nuevaMatriz }) => {
                                setCreando(false);
                                recargar(nuevaMatriz, nuevo, 'Perfil creado. Nace sin permisos: márcale los módulos y guarda.');
                            }}
                        />
                    ) : (
                        puedeCrear && (
                            <button
                                type="button"
                                className="boton boton-secundario boton-nuevo-perfil"
                                onClick={() => setCreando(true)}
                                disabled={hayCambios}
                            >
                                + Nuevo perfil
                            </button>
                        )
                    )}

                    <div className="pestanas">
                        {matriz.perfiles.map((fila) => (
                            <button
                                key={fila.id}
                                type="button"
                                className={`pestana${fila.id === idPerfil ? ' activa' : ''}${fila.activo ? '' : ' pestana-inactiva'}`}
                                onClick={() => elegirPerfil(fila.id)}
                                disabled={hayCambios && fila.id !== idPerfil}
                                title={hayCambios && fila.id !== idPerfil ? 'Guarda o descarta los cambios primero' : undefined}
                            >
                                {fila.nombre}
                            </button>
                        ))}
                    </div>

                    <div className="tarjeta">
                        {perfil && (
                            <DatosPerfil
                                key={perfil.id}
                                perfil={perfil}
                                puedeModificar={puedeModificar && !hayCambios}
                                puedeDesactivar={puedeDesactivar && !hayCambios}
                                alCambiar={(nuevaMatriz, texto) => recargar(nuevaMatriz, perfil.id, texto)}
                                alFallar={(texto) => setAviso({ tipo: 'error', texto })}
                            />
                        )}

                        {perfil && !perfil.activo && (
                            <p className="nota">
                                Este perfil está desactivado: nadie puede tenerlo asignado. Actívalo para cambiar sus accesos.
                            </p>
                        )}

                        {perfil?.bloqueado && (
                            <p className="nota">
                                El perfil <strong>{perfil.nombre}</strong> no puede tener accesos: quien lo tiene entra al sistema
                                y solo ve el aviso de que su cuenta está vetada.
                            </p>
                        )}

                        {perfil?.opcionesProtegidas.length > 0 && (
                            <p className="nota">
                                Los módulos marcados con 🔒 no se pueden quitar al perfil {perfil.nombre}: sin ellos nadie podría
                                volver a administrar usuarios ni accesos.
                            </p>
                        )}

                        <div className="tabla-contenedor">
                            <table className="tabla tabla-accesos">
                                <thead>
                                    <tr>
                                        <th>Módulo</th>
                                        {ACCIONES.map(([clave, etiqueta]) => (
                                            <th key={clave} className="columna-casilla">{etiqueta}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {matriz.opciones.map((opcion) => {
                                        const permiso = borrador[opcion.id] || SIN_PERMISO;
                                        const protegida = esProtegida(opcion);
                                        const bloqueada = !editable || protegida || guardando;

                                        return (
                                            <tr key={opcion.id} className={permiso.ver ? '' : 'fila-inactiva'}>
                                                <td>
                                                    <span className="modulo-nombre">
                                                        <span aria-hidden="true">{iconoDe(opcion.nombre)}</span>
                                                        {opcion.etiqueta}
                                                        {protegida && <span title="Protegido" aria-label="Protegido"> 🔒</span>}
                                                    </span>
                                                </td>
                                                {ACCIONES.map(([clave, etiqueta]) => (
                                                    <td key={clave} className="columna-casilla">
                                                        <input
                                                            type="checkbox"
                                                            className="casilla"
                                                            checked={permiso[clave]}
                                                            onChange={() => cambiar(opcion.id, clave)}
                                                            disabled={bloqueada}
                                                            aria-label={`${etiqueta} en ${opcion.etiqueta}`}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {aviso && <p className={`aviso aviso-${aviso.tipo}`}>{aviso.texto}</p>}

                        {editable && (
                            <div className="acciones-accesos">
                                {hayCambios && <span className="texto-suave">Tienes cambios sin guardar.</span>}
                                <button type="button" className="boton boton-secundario" onClick={descartar} disabled={!hayCambios || guardando}>
                                    Descartar
                                </button>
                                <button type="button" className="boton" onClick={guardar} disabled={!hayCambios || guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {!matriz && aviso && <p className={`aviso aviso-${aviso.tipo}`}>{aviso.texto}</p>}
        </section>
    );
}

// ---- Datos del perfil elegido: rol, usuarios, renombrar, activar ----------

function DatosPerfil({ perfil, puedeModificar, puedeDesactivar, alCambiar, alFallar }) {
    const [renombrando, setRenombrando] = useState(false);
    const [nombre, setNombre] = useState(perfil.nombre);
    const [error, setError] = useState('');
    const [ocupado, setOcupado] = useState(false);

    async function guardarNombre(evento) {
        evento.preventDefault();
        setError('');
        setOcupado(true);

        try {
            const nuevaMatriz = await renombrarPerfil(perfil.id, nombre);
            setRenombrando(false);
            alCambiar(nuevaMatriz, 'El perfil se renombró.');
        } catch (err) {
            setError(err.detalles?.nombre || err.message);
        } finally {
            setOcupado(false);
        }
    }

    async function cambiarEstado(activo) {
        setOcupado(true);

        try {
            const nuevaMatriz = await cambiarEstadoPerfil(perfil.id, activo);
            alCambiar(nuevaMatriz, activo ? 'El perfil se activó.' : 'El perfil se desactivó.');
        } catch (err) {
            alFallar(err.message);
        } finally {
            setOcupado(false);
        }
    }

    const usuarios = perfil.totalUsuarios === 1 ? '1 usuario' : `${perfil.totalUsuarios} usuarios`;

    return (
        <div className="datos-perfil">
            {renombrando ? (
                <form className="renombrar" onSubmit={guardarNombre} noValidate>
                    <label className={error ? 'campo campo-con-error' : 'campo'}>
                        Nombre del perfil
                        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={25} autoFocus />
                        {error && <small className="campo-error">{error}</small>}
                    </label>
                    <button type="submit" className="boton boton-pequeno" disabled={ocupado}>Guardar</button>
                    <button
                        type="button"
                        className="boton boton-secundario boton-pequeno"
                        onClick={() => { setRenombrando(false); setNombre(perfil.nombre); setError(''); }}
                    >
                        Cancelar
                    </button>
                </form>
            ) : (
                <div className="datos-perfil-resumen">
                    <span className="insignia">Rol: {nombreRol(perfil.rol)}</span>
                    <span className="insignia">{usuarios}</span>
                    {!perfil.activo && <span className="insignia insignia-perfil-vetado">Desactivado</span>}
                    {perfil.base && <span className="insignia">Perfil base del sistema</span>}
                </div>
            )}

            {!perfil.base && !renombrando && (
                <div className="datos-perfil-botones">
                    {puedeModificar && (
                        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setRenombrando(true)}>
                            Renombrar
                        </button>
                    )}
                    {puedeDesactivar && (
                        perfil.activo ? (
                            <button type="button" className="boton boton-peligro boton-pequeno" onClick={() => cambiarEstado(false)} disabled={ocupado}>
                                Desactivar perfil
                            </button>
                        ) : (
                            <button type="button" className="boton boton-pequeno" onClick={() => cambiarEstado(true)} disabled={ocupado}>
                                Activar perfil
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    );
}

// ---- Nuevo perfil ---------------------------------------------------------

function FormularioNuevoPerfil({ roles, alCrear, alCancelar }) {
    const [nombre, setNombre] = useState('');
    const [idRol, setIdRol] = useState('');
    const [errores, setErrores] = useState({});
    const [aviso, setAviso] = useState('');
    const [guardando, setGuardando] = useState(false);

    async function crear(evento) {
        evento.preventDefault();
        setAviso('');

        const locales = {};

        if (nombre.trim().length < 3) {
            locales.nombre = 'Escribe un nombre de al menos 3 letras.';
        }

        if (!idRol) {
            locales.idRol = 'Selecciona un rol.';
        }

        setErrores(locales);

        if (Object.keys(locales).length > 0) {
            return;
        }

        setGuardando(true);

        try {
            alCrear(await crearPerfil(nombre, Number(idRol)));
        } catch (err) {
            if (err.detalles) {
                setErrores(err.detalles);
            } else {
                setAviso(err.message);
            }
        } finally {
            setGuardando(false);
        }
    }

    return (
        <form className="tarjeta formulario nuevo-perfil" onSubmit={crear} noValidate>
            <h2>Nuevo perfil</h2>
            <p className="texto-suave">
                El rol dice qué es la persona para la fundación; el perfil, qué puede hacer. El perfil nace sin permisos.
            </p>

            <div className="fila">
                <label className={errores.nombre ? 'campo campo-con-error' : 'campo'}>
                    Nombre
                    <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={25} placeholder="Ej: Voluntario" autoFocus />
                    {errores.nombre && <small className="campo-error">{errores.nombre}</small>}
                </label>

                <label className={errores.idRol ? 'campo campo-con-error' : 'campo'}>
                    Rol
                    <select value={idRol} onChange={(e) => setIdRol(e.target.value)}>
                        <option value="">Seleccione...</option>
                        {roles.map((rol) => (
                            <option key={rol.id} value={rol.id}>{DESCRIPCION_ROL[rol.nombre] || rol.nombre}</option>
                        ))}
                    </select>
                    {errores.idRol && <small className="campo-error">{errores.idRol}</small>}
                </label>
            </div>

            {aviso && <p className="aviso aviso-error">{aviso}</p>}

            <div className="acciones-accesos">
                <button type="button" className="boton boton-secundario" onClick={alCancelar} disabled={guardando}>Cancelar</button>
                <button type="submit" className="boton" disabled={guardando}>{guardando ? 'Creando...' : 'Crear perfil'}</button>
            </div>
        </form>
    );
}
