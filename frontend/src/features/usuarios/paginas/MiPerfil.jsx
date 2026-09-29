import { useEffect, useRef, useState } from 'react';
import { useSesion } from '../../../hooks/useSesion.js';
import { useFormulario, enfocarPrimerError } from '../../../hooks/useFormulario.js';
import { Campo } from '../../../componentes/Campo.jsx';
import { InputContrasena } from '../../../componentes/InputContrasena.jsx';
import { RequisitosContrasena } from '../../auth/componentes/RequisitosContrasena.jsx';
import { listarCatalogo } from '../../catalogos/catalogos.api.js';
import { obtenerMiPerfil, actualizarMiPerfil, cambiarMiContrasena } from '../usuarios.api.js';
import { validarCambioContrasena, LARGO_MAXIMO_CONTRASENA } from '../../auth/validaciones.js';
import { FormularioDatosUsuario } from '../componentes/FormularioDatosUsuario.jsx';

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

    async function guardar(datos) {
        const actualizado = await actualizarMiPerfil(datos);
        alGuardar(actualizado);
        actualizarUsuario({ nombre: actualizado.nombre, correo: actualizado.correo });
        return actualizado;
    }

    return (
        <FormularioDatosUsuario
            titulo="Mis datos"
            mostrarPerfil
            usuario={perfil}
            ciudades={ciudades}
            puedeModificar={tienePermiso('MI_PERFIL', 'modificar')}
            guardar={guardar}
        />
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
