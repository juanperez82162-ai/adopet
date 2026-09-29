import { useEffect, useRef, useState } from 'react';
import { useSesion } from '../../../hooks/useSesion.js';
import { useFormulario, enfocarPrimerError } from '../../../hooks/useFormulario.js';
import { Campo } from '../../../componentes/Campo.jsx';
import { InputContrasena } from '../../../componentes/InputContrasena.jsx';
import { RequisitosContrasena } from '../../auth/componentes/RequisitosContrasena.jsx';
import { listarCatalogo } from '../../catalogos/catalogos.api.js';
import { obtenerMiPerfil, actualizarMiPerfil, cambiarMiContrasena } from '../usuarios.api.js';
import {
    validarDatosPerfil,
    validarCambioContrasena,
    LARGO_MAXIMO_NOMBRE,
    LARGO_MAXIMO_CORREO,
    LARGO_MAXIMO_DIRECCION,
    LARGO_MAXIMO_CONTRASENA
} from '../../auth/validaciones.js';

const CAMPOS_EDITABLES = [
    'primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido',
    'correo', 'telefono', 'idCiudad', 'direccion'
];

// Toma del perfil solo lo que el formulario edita (la ciudad como texto, para el <select>).
function aFormulario(perfil) {
    const valores = Object.fromEntries(CAMPOS_EDITABLES.map((campo) => [campo, perfil[campo] ?? '']));
    valores.idCiudad = String(perfil.idCiudad);
    return valores;
}

function aFechaLegible(fecha) {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
}

export function MiPerfil() {
    const [perfil, setPerfil] = useState(null);
    const [ciudades, setCiudades] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([obtenerMiPerfil(), listarCatalogo('ciudades')])
            .then(([datosPerfil, listaCiudades]) => {
                setPerfil(datosPerfil);
                setCiudades(listaCiudades);
            })
            .catch((err) => setError(err.message));
    }, []);

    return (
        <section>
            <header className="cabecera-pagina">
                <h1>Mi perfil</h1>
                <p className="texto-suave">Revisa y actualiza tus datos de contacto y tu contraseña.</p>
            </header>

            {error && <p className="aviso aviso-error">{error}</p>}
            {!perfil && !error && <p className="mensaje-carga">Cargando tus datos...</p>}

            {perfil && (
                <div className="perfil-rejilla">
                    <DatosPerfil perfil={perfil} ciudades={ciudades} alGuardar={setPerfil} />
                    <CambioContrasena />
                </div>
            )}
        </section>
    );
}

// ---- Mis datos -------------------------------------------------------

function DatosPerfil({ perfil, ciudades, alGuardar }) {
    const { tienePermiso, actualizarUsuario } = useSesion();
    const puedeModificar = tienePermiso('MI_PERFIL', 'modificar');

    const formulario = useFormulario(aFormulario(perfil), validarDatosPerfil);
    const { datos, propiedades, errorDe } = formulario;
    const referencia = useRef(null);

    const [aviso, setAviso] = useState(null);
    const [guardando, setGuardando] = useState(false);

    async function guardar(evento) {
        evento.preventDefault();
        formulario.marcarIntento();
        setAviso(null);

        if (formulario.hayErrores) {
            setAviso({ tipo: 'error', texto: 'Revisa los campos marcados en rojo.' });
            enfocarPrimerError(referencia.current);
            return;
        }

        setGuardando(true);

        try {
            const actualizado = await actualizarMiPerfil({ ...datos, idCiudad: Number(datos.idCiudad) });

            alGuardar(actualizado);
            formulario.reiniciar(aFormulario(actualizado));
            actualizarUsuario({ nombre: actualizado.nombre, correo: actualizado.correo });
            setAviso({ tipo: 'exito', texto: 'Tus datos se guardaron.' });
        } catch (err) {
            if (err.detalles) {
                formulario.marcarErroresServidor(err.detalles);
                enfocarPrimerError(referencia.current);
            }

            setAviso({ tipo: 'error', texto: err.detalles ? 'Revisa los campos marcados en rojo.' : err.message });
        } finally {
            setGuardando(false);
        }
    }

    return (
        <form ref={referencia} className="tarjeta formulario" onSubmit={guardar} noValidate>
            <h2>Mis datos</h2>

            <dl className="datos-fijos">
                <div>
                    <dt>Documento</dt>
                    <dd>{perfil.tipoDocumento} {perfil.documento}</dd>
                </div>
                <div>
                    <dt>Fecha de nacimiento</dt>
                    <dd>{aFechaLegible(perfil.fechaNacimiento)}</dd>
                </div>
                <div>
                    <dt>Perfil</dt>
                    <dd>{perfil.perfil}</dd>
                </div>
            </dl>
            <small className="campo-ayuda">
                El documento y la fecha de nacimiento no se pueden cambiar. Si hay un error, comunícate con la fundación.
            </small>

            <fieldset className="grupo-campos" disabled={!puedeModificar || guardando}>
                <div className="fila">
                    <Campo etiqueta="Primer nombre" error={errorDe('primerNombre')}>
                        <input {...propiedades('primerNombre')} maxLength={LARGO_MAXIMO_NOMBRE} autoComplete="given-name" />
                    </Campo>

                    <Campo etiqueta="Segundo nombre" opcional error={errorDe('segundoNombre')}>
                        <input {...propiedades('segundoNombre')} maxLength={LARGO_MAXIMO_NOMBRE} autoComplete="additional-name" />
                    </Campo>
                </div>

                <div className="fila">
                    <Campo etiqueta="Primer apellido" error={errorDe('primerApellido')}>
                        <input {...propiedades('primerApellido')} maxLength={LARGO_MAXIMO_NOMBRE} autoComplete="family-name" />
                    </Campo>

                    <Campo etiqueta="Segundo apellido" opcional error={errorDe('segundoApellido')}>
                        <input {...propiedades('segundoApellido')} maxLength={LARGO_MAXIMO_NOMBRE} />
                    </Campo>
                </div>

                <div className="fila">
                    <Campo etiqueta="Correo" error={errorDe('correo')} ayuda="Con este correo inicias sesión.">
                        <input type="email" {...propiedades('correo')} maxLength={LARGO_MAXIMO_CORREO} autoComplete="email" />
                    </Campo>

                    <Campo etiqueta="Teléfono" error={errorDe('telefono')} ayuda="Celular o fijo de 10 dígitos.">
                        <input type="tel" {...propiedades('telefono')} inputMode="tel" maxLength={16} autoComplete="tel" />
                    </Campo>
                </div>

                <div className="fila">
                    <Campo etiqueta="Ciudad" error={errorDe('idCiudad')}>
                        <select {...propiedades('idCiudad')}>
                            <option value="">Seleccione...</option>
                            {ciudades.map((ciudad) => (
                                <option key={ciudad.id} value={ciudad.id}>{ciudad.nombre}</option>
                            ))}
                        </select>
                    </Campo>

                    <Campo etiqueta="Dirección" error={errorDe('direccion')}>
                        <input {...propiedades('direccion')} maxLength={LARGO_MAXIMO_DIRECCION} autoComplete="street-address" />
                    </Campo>
                </div>
            </fieldset>

            {aviso && <p className={`aviso aviso-${aviso.tipo}`}>{aviso.texto}</p>}

            {puedeModificar && (
                <button type="submit" className="boton" disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
            )}
        </form>
    );
}

// ---- Cambiar contraseña ----------------------------------------------

const CONTRASENA_VACIA = { contrasenaActual: '', contrasenaNueva: '', confirmacion: '' };

function CambioContrasena() {
    const { tienePermiso } = useSesion();
    const puedeModificar = tienePermiso('MI_PERFIL', 'modificar');

    const formulario = useFormulario(CONTRASENA_VACIA, validarCambioContrasena);
    const { datos, propiedades, errorDe } = formulario;
    const referencia = useRef(null);

    const [aviso, setAviso] = useState(null);
    const [guardando, setGuardando] = useState(false);

    if (!puedeModificar) {
        return null;
    }

    async function guardar(evento) {
        evento.preventDefault();
        formulario.marcarIntento();
        setAviso(null);

        if (formulario.hayErrores) {
            enfocarPrimerError(referencia.current);
            return;
        }

        setGuardando(true);

        try {
            await cambiarMiContrasena(datos.contrasenaActual, datos.contrasenaNueva);
            formulario.reiniciar(CONTRASENA_VACIA);
            setAviso({ tipo: 'exito', texto: 'Tu contraseña se cambió.' });
        } catch (err) {
            if (err.detalles) {
                formulario.marcarErroresServidor(err.detalles);
                enfocarPrimerError(referencia.current);
            } else {
                setAviso({ tipo: 'error', texto: err.message });
            }
        } finally {
            setGuardando(false);
        }
    }

    return (
        <form ref={referencia} className="tarjeta formulario" onSubmit={guardar} noValidate>
            <h2>Cambiar contraseña</h2>

            <Campo etiqueta="Contraseña actual" error={errorDe('contrasenaActual')}>
                <InputContrasena
                    {...propiedades('contrasenaActual')}
                    maxLength={LARGO_MAXIMO_CONTRASENA}
                    autoComplete="current-password"
                />
            </Campo>

            <Campo etiqueta="Nueva contraseña" error={errorDe('contrasenaNueva')}>
                <InputContrasena
                    {...propiedades('contrasenaNueva')}
                    maxLength={LARGO_MAXIMO_CONTRASENA}
                    autoComplete="new-password"
                />
            </Campo>

            <Campo etiqueta="Confirmar nueva contraseña" error={errorDe('confirmacion', datos.confirmacion !== '')}>
                <InputContrasena
                    {...propiedades('confirmacion', datos.confirmacion !== '')}
                    maxLength={LARGO_MAXIMO_CONTRASENA}
                    autoComplete="new-password"
                />
            </Campo>

            <RequisitosContrasena contrasena={datos.contrasenaNueva} confirmacion={datos.confirmacion} />

            {aviso && <p className={`aviso aviso-${aviso.tipo}`}>{aviso.texto}</p>}

            <button type="submit" className="boton" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
        </form>
    );
}
