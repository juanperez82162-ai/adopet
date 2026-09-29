import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSesion } from '../../../hooks/useSesion.js';

export function Login() {
    const { iniciarSesion } = useSesion();
    const navegar = useNavigate();
    const { state } = useLocation();

    const [correo, setCorreo] = useState(state?.correo || '');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    async function enviar(evento) {
        evento.preventDefault();
        setError('');
        setEnviando(true);

        try {
            await iniciarSesion(correo.trim(), contrasena);
            navegar(state?.desde || '/inicio', { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className="pagina-acceso">
            <form className="tarjeta formulario" onSubmit={enviar}>
                <h1 className="marca-grande">ADOPET</h1>
                <p className="texto-suave">Fundación Bello Animal</p>

                {state?.registrado && (
                    <p className="aviso aviso-exito">Cuenta creada. Ya puede iniciar sesión.</p>
                )}

                <label className="campo">
                    Correo
                    <input
                        type="email"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        autoComplete="email"
                        required
                    />
                </label>

                <label className="campo">
                    Contraseña
                    <input
                        type="password"
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </label>

                {error && <p className="aviso aviso-error">{error}</p>}

                <button type="submit" className="boton" disabled={enviando}>
                    {enviando ? 'Ingresando...' : 'Iniciar sesión'}
                </button>

                <p className="texto-suave">
                    ¿No tiene cuenta? <Link to="/registro">Regístrese</Link>
                </p>
            </form>
        </div>
    );
}
