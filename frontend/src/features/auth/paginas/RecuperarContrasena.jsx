import { useState } from 'react';
import { Link } from 'react-router-dom';
import { solicitarRecuperacion } from '../auth.api.js';
import { PantallaAcceso } from '../../../componentes/PantallaAcceso.jsx';

export function RecuperarContrasena() {
    const [correo, setCorreo] = useState('');
    const [enviado, setEnviado] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    async function enviar(evento) {
        evento.preventDefault();
        setError('');
        setEnviando(true);

        try {
            const respuesta = await solicitarRecuperacion(correo.trim());
            setEnviado(respuesta.mensaje);
        } catch (err) {
            setError(err.message);
        } finally {
            setEnviando(false);
        }
    }

    return (
        <PantallaAcceso>
            <form className="tarjeta formulario" onSubmit={enviar}>
                <h1>¿Olvidaste tu contraseña?</h1>
                <p className="texto-suave">
                    Escribe el correo con el que te registraste y te enviaremos un enlace para crear una nueva.
                </p>

                {enviado ? (
                    <p className="aviso aviso-exito">{enviado} Revisa también la carpeta de spam.</p>
                ) : (
                    <>
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

                        {error && <p className="aviso aviso-error">{error}</p>}

                        <button type="submit" className="boton" disabled={enviando}>
                            {enviando ? 'Enviando...' : 'Enviar enlace'}
                        </button>
                    </>
                )}

                <p className="texto-suave">
                    <Link to="/login">Volver a iniciar sesión</Link>
                </p>
            </form>
        </PantallaAcceso>
    );
}
