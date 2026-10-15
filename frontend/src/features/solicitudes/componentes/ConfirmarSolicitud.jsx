import { useState } from 'react';
import { Ventana } from '../../../componentes/Ventana.jsx';
import { crearSolicitud } from '../solicitudes.api.js';

// Confirma y envía la solicitud de adopción de UNA mascota. Sirve para los
// dos caminos: directo desde el catálogo (cuestionario = undefined) o
// después del cuestionario de compatibilidad (cuestionario con respuestas).
// Enviar la solicitud NO reserva la mascota: el albergue la revisa y la
// formaliza después.
export function ConfirmarSolicitud({ mascota, cuestionario, alTerminar, alCancelar }) {
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');
    const [enviada, setEnviada] = useState(false);

    async function enviar() {
        setEnviando(true);
        setError('');

        try {
            await crearSolicitud(mascota.id, cuestionario);
            setEnviada(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setEnviando(false);
        }
    }

    return (
        <Ventana titulo={`Quiero adoptar a ${mascota.nombre}`} alCerrar={enviada ? alTerminar : alCancelar}>
            {enviada ? (
                <>
                    <p className="aviso aviso-exito">
                        ¡Listo! Enviamos tu solicitud para adoptar a {mascota.nombre}. El albergue Bello Animal se
                        pondrá en contacto contigo.
                    </p>
                    <div className="ventana-botones">
                        <button type="button" className="boton" onClick={alTerminar}>Entendido</button>
                    </div>
                </>
            ) : (
                <>
                    <p>
                        Vas a enviar tu solicitud para adoptar a <strong>{mascota.nombre}</strong>.
                        {cuestionario && ' Se enviarán también las respuestas de tu cuestionario.'}
                    </p>
                    <p className="texto-suave">
                        Esto no reserva a la mascota: el albergue revisará tu solicitud y se comunicará contigo.
                    </p>

                    {error && <p className="aviso aviso-error" role="alert">{error}</p>}

                    <div className="ventana-botones">
                        <button type="button" className="boton boton-secundario" onClick={alCancelar} disabled={enviando}>
                            Cancelar
                        </button>
                        <button type="button" className="boton" onClick={enviar} disabled={enviando}>
                            {enviando ? 'Enviando...' : 'Enviar solicitud'}
                        </button>
                    </div>
                </>
            )}
        </Ventana>
    );
}
