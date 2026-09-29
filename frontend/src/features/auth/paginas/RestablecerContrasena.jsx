import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { restablecerContrasena } from '../auth.api.js';
import { PantallaAcceso } from '../../../componentes/PantallaAcceso.jsx';

export function RestablecerContrasena() {
    const navegar = useNavigate();
    const [parametros] = useSearchParams();
    const token = parametros.get('token') || '';

    const [contrasena, setContrasena] = useState('');
    const [confirmacion, setConfirmacion] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    async function enviar(evento) {
        evento.preventDefault();
        setError('');

        if (contrasena !== confirmacion) {
            setError('Las contraseñas no coinciden.');
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
            <form className="tarjeta formulario" onSubmit={enviar}>
                <h1>Crea tu nueva contraseña</h1>
                <p className="texto-suave">Mínimo 8 caracteres, con al menos una letra y un número.</p>

                <label className="campo">
                    Nueva contraseña
                    <input
                        type="password"
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        maxLength={72}
                        autoComplete="new-password"
                        required
                    />
                </label>

                <label className="campo">
                    Confirmar contraseña
                    <input
                        type="password"
                        value={confirmacion}
                        onChange={(e) => setConfirmacion(e.target.value)}
                        maxLength={72}
                        autoComplete="new-password"
                        required
                    />
                </label>

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
