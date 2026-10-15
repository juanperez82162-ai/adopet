import { useEffect, useState } from 'react';
import { Ventana } from '../../../componentes/Ventana.jsx';
import { obtenerFormulario, responderSeguimiento } from '../seguimientos.api.js';
import { etiquetaEtapa } from '../seguimientos.formatos.js';

// El adoptante responde el checkpoint. No ve puntajes ni semáforo:
// la evaluación es interna del albergue.
export function FormularioCheckpoint({ seguimiento, alResponder, alCerrar }) {
    const [formulario, setFormulario] = useState(null);
    const [elegidas, setElegidas] = useState({}); // idPregunta → idOpcion
    const [solicitaContacto, setSolicitaContacto] = useState(false);
    const [comentario, setComentario] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let vigente = true;

        obtenerFormulario()
            .then((datos) => vigente && setFormulario(datos))
            .catch((err) => vigente && setError(err.message));

        return () => {
            vigente = false;
        };
    }, []);

    async function enviar(evento) {
        evento.preventDefault();
        setError('');

        if (formulario.preguntas.some((p) => !elegidas[p.id])) {
            setError('Responde todas las preguntas.');
            return;
        }

        setEnviando(true);

        try {
            const respuestas = formulario.preguntas.map((p) => ({ idPregunta: p.id, idOpcion: elegidas[p.id] }));
            const actualizado = await responderSeguimiento(seguimiento.id, respuestas, solicitaContacto, comentario.trim() || undefined);
            alResponder(actualizado);
        } catch (err) {
            setError(err.message);
            setEnviando(false);
        }
    }

    return (
        <Ventana titulo={`Seguimiento de ${seguimiento.mascota} · ${etiquetaEtapa(seguimiento.etapa)}`} alCerrar={alCerrar}>
            {!formulario ? (
                <p className="mensaje-carga">{error || 'Cargando...'}</p>
            ) : (
                <form className="solicitudes-formulario" onSubmit={enviar}>
                    <p className="texto-suave">Cuéntanos cómo va todo con {seguimiento.mascota}.</p>

                    {formulario.preguntas.map((p) => (
                        <fieldset key={p.id} className="seguimientos-pregunta">
                            <legend>{p.texto}</legend>
                            {p.opciones.map((o) => (
                                <label key={o.id} className="seguimientos-opcion">
                                    <input
                                        type="radio"
                                        name={`pregunta-${p.id}`}
                                        checked={elegidas[p.id] === o.id}
                                        onChange={() => setElegidas((anterior) => ({ ...anterior, [p.id]: o.id }))}
                                    />
                                    {o.texto}
                                </label>
                            ))}
                        </fieldset>
                    ))}

                    <label className="campo">
                        Comentario (opcional)
                        <textarea
                            className="seguimientos-comentario"
                            value={comentario}
                            onChange={(e) => setComentario(e.target.value)}
                            maxLength={formulario.largoComentario}
                        />
                    </label>

                    <label className="seguimientos-opcion">
                        <input type="checkbox" checked={solicitaContacto} onChange={(e) => setSolicitaContacto(e.target.checked)} />
                        Quiero que el albergue me contacte
                    </label>

                    {error && <p className="aviso aviso-error">{error}</p>}

                    <div className="ventana-botones">
                        <button type="button" className="boton boton-secundario" onClick={alCerrar} disabled={enviando}>Cancelar</button>
                        <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar respuestas'}</button>
                    </div>
                </form>
            )}
        </Ventana>
    );
}
