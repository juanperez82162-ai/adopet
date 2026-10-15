import { useRef, useState } from 'react';
import { subirFoto, marcarFotoPrincipal, eliminarFoto } from '../mascotas.api.js';
import { FotoMascota } from './FotoMascota.jsx';
import { LIMITE_FOTOS, TAMANIO_MAXIMO_FOTO, TIPOS_FOTO } from '../mascotas.validaciones.js';

// Galería de fotos de una mascota que ya existe: subir y elegir la
// principal. Las reglas (JPG/PNG/WEBP, 5 MB, 5 fotos) se avisan aquí antes
// de enviar, pero las que protegen de verdad están en el backend.
// alCambiar(mascota) avisa a la página con la ficha actualizada.
export function FotosMascota({ mascota, alCambiar }) {
    const entrada = useRef(null);
    const [error, setError] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [confirmando, setConfirmando] = useState(null); // id de la foto por eliminar

    const fotos = mascota.fotos ?? [];
    const puedeSubir = fotos.length < LIMITE_FOTOS;

    async function alElegirArchivo(evento) {
        const archivo = evento.target.files[0];
        evento.target.value = '';
        setError('');

        if (!archivo) {
            return;
        }

        if (!TIPOS_FOTO.includes(archivo.type)) {
            setError('Solo se aceptan imágenes JPG, PNG o WEBP.');
            return;
        }

        if (archivo.size > TAMANIO_MAXIMO_FOTO) {
            setError(`La foto supera el máximo de ${TAMANIO_MAXIMO_FOTO / 1024 / 1024} MB.`);
            return;
        }

        await ejecutar(() => subirFoto(mascota.id, archivo));
    }

    async function ejecutar(accion) {
        setOcupado(true);
        setConfirmando(null);

        try {
            alCambiar(await accion());
        } catch (err) {
            setError(err.detalles?.foto || err.message);
        } finally {
            setOcupado(false);
        }
    }

    return (
        <section className="mascotas-fotos" aria-labelledby="titulo-fotos">
            <h3 id="titulo-fotos">Fotos ({fotos.length} de {LIMITE_FOTOS})</h3>

            {fotos.length === 0 && (
                <p className="texto-suave">Todavía no tiene fotos. La primera que subas será la principal.</p>
            )}

            <ul className="mascotas-fotos-lista">
                {fotos.map((foto) => (
                    <li key={foto.id} className="mascotas-fotos-item">
                        <FotoMascota idFoto={foto.id} alt={`Foto de ${mascota.nombre}`} clase="mascotas-foto-miniatura" />

                        {foto.esPrincipal ? (
                            <span className="insignia insignia-activa">Principal</span>
                        ) : (
                            <button
                                type="button"
                                className="boton boton-secundario boton-pequeno"
                                disabled={ocupado}
                                onClick={() => ejecutar(() => marcarFotoPrincipal(foto.id))}
                            >
                                Hacer principal
                            </button>
                        )}

                        {confirmando === foto.id ? (
                            <span className="mascotas-botones">
                                <button
                                    type="button"
                                    className="boton boton-peligro boton-pequeno"
                                    disabled={ocupado}
                                    onClick={() => ejecutar(() => eliminarFoto(foto.id))}
                                >
                                    Sí, eliminar
                                </button>
                                <button
                                    type="button"
                                    className="boton boton-secundario boton-pequeno"
                                    onClick={() => setConfirmando(null)}
                                >
                                    No
                                </button>
                            </span>
                        ) : (
                            <button
                                type="button"
                                className="boton boton-secundario boton-pequeno"
                                disabled={ocupado}
                                onClick={() => setConfirmando(foto.id)}
                            >
                                Eliminar
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            {puedeSubir ? (
                <div>
                    <input
                        ref={entrada}
                        type="file"
                        accept={TIPOS_FOTO.join(',')}
                        onChange={alElegirArchivo}
                        hidden
                    />
                    <button
                        type="button"
                        className="boton boton-secundario"
                        disabled={ocupado}
                        onClick={() => entrada.current.click()}
                    >
                        {ocupado ? 'Subiendo...' : 'Agregar foto'}
                    </button>
                    <small className="campo-ayuda"> JPG, PNG o WEBP · máximo {TAMANIO_MAXIMO_FOTO / 1024 / 1024} MB</small>
                </div>
            ) : (
                <p className="texto-suave">Ya tiene el máximo de {LIMITE_FOTOS} fotos.</p>
            )}

            {error && <p className="aviso aviso-error" role="alert">{error}</p>}
        </section>
    );
}
