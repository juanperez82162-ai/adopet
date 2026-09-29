import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { restablecerContrasena } from '../auth.api.js';
import { PantallaAcceso } from '../../../componentes/PantallaAcceso.jsx';
import { Campo } from '../../../componentes/Campo.jsx';
import { RequisitosContrasena } from '../componentes/RequisitosContrasena.jsx';
import { errorContrasena, errorConfirmacion, LARGO_MAXIMO_CONTRASENA } from '../validaciones.js';

export function RestablecerContrasena() {
    const navegar = useNavigate();
    const [parametros] = useSearchParams();
    const token = parametros.get('token') || '';

    const [contrasena, setContrasena] = useState('');
    const [confirmacion, setConfirmacion] = useState('');
    const [error, setError] = useState('');
    const [intentoEnviar, setIntentoEnviar] = useState(false);
    const [enviando, setEnviando] = useState(false);

    const errorClave = intentoEnviar ? errorContrasena(contrasena) : null;
    const errorRepetir = (intentoEnviar || confirmacion) ? errorConfirmacion(contrasena, confirmacion) : null;

    async function enviar(evento) {
        evento.preventDefault();
        setError('');
        setIntentoEnviar(true);

        if (errorContrasena(contrasena) || errorConfirmacion(contrasena, confirmacion)) {
            return;
        }

        setEnviando(true);

        try {
            await restablecerContrasena(token, contrasena);
            navegar('/login', { replace: true, state: { contrasenaCambiada: true } });
        } catch (err) {
            setError(err.message);
        } finally {
            setEnviando(false);
        }
    }

    if (!token) {
        return (
            <PantallaAcceso>
                <div className="tarjeta formulario">
                    <h1>Enlace incompleto</h1>
                    <p className="texto-suave">Abre el enlace completo que te llegó al correo, o solicita uno nuevo.</p>
                    <Link to="/recuperar" className="boton boton-enlace">Solicitar un enlace nuevo</Link>
                </div>
            </PantallaAcceso>
        );
    }

    return (
        <PantallaAcceso>
            <form className="tarjeta formulario" onSubmit={enviar} noValidate>
                <h1>Crea tu nueva contraseña</h1>

                <Campo etiqueta="Nueva contraseña" error={errorClave}>
                    <input
                        type="password"
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        maxLength={LARGO_MAXIMO_CONTRASENA}
                        autoComplete="new-password"
                        aria-invalid={errorClave ? 'true' : 'false'}
                    />
                </Campo>

                <Campo etiqueta="Confirmar contraseña" error={errorRepetir}>
                    <input
                        type="password"
                        value={confirmacion}
                        onChange={(e) => setConfirmacion(e.target.value)}
                        maxLength={LARGO_MAXIMO_CONTRASENA}
                        autoComplete="new-password"
                        aria-invalid={errorRepetir ? 'true' : 'false'}
                    />
                </Campo>

                <RequisitosContrasena contrasena={contrasena} confirmacion={confirmacion} />

                {error && (
                    <p className="aviso aviso-error">
                        {error} {error.includes('venció') && <Link to="/recuperar">Solicitar uno nuevo</Link>}
                    </p>
                )}

                <button type="submit" className="boton" disabled={enviando}>
                    {enviando ? 'Guardando...' : 'Guardar contraseña'}
                </button>
            </form>
        </PantallaAcceso>
    );
}
