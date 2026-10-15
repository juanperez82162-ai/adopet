import { useRef, useState } from 'react';
import { useFormulario, enfocarPrimerError } from '../../../hooks/useFormulario.js';
import { Campo } from '../../../componentes/Campo.jsx';
import { cambiarActivoMascota } from '../mascotas.api.js';
import { validarAlbergue, LARGO_MAXIMO_OBSERVACIONES } from '../mascotas.validaciones.js';

// Saca a la mascota del albergue (modo 'desactivar') o la devuelve a él
// (modo 'reactivar', por ejemplo una adoptada que regresa). Siempre pide
// el motivo; al reactivar, el staff elige con qué estado vuelve.
// Es la misma mascota: no se abre ningún proceso de adopción.
export function FormularioAlbergue({ mascota, modo, estados, alGuardar, alCancelar }) {
    const desactivar = modo === 'desactivar';

    const formulario = useFormulario(
        { observaciones: '', fechaSalida: '', idEstadoMascota: String(estados[0]?.id ?? '') },
        validarAlbergue
    );
    const { propiedades, errorDe, datos } = formulario;
    const referencia = useRef(null);

    const [aviso, setAviso] = useState('');
    const [guardando, setGuardando] = useState(false);

    async function enviar(evento) {
        evento.preventDefault();
        formulario.marcarIntento();
        setAviso('');

        if (formulario.hayErrores) {
            enfocarPrimerError(referencia.current);
            return;
        }

        setGuardando(true);

        try {
            const cuerpo = desactivar
                ? { activo: false, observaciones: datos.observaciones.trim(), fechaSalida: datos.fechaSalida || undefined }
                : { activo: true, observaciones: datos.observaciones.trim(), idEstadoMascota: Number(datos.idEstadoMascota) };

            alGuardar(await cambiarActivoMascota(mascota.id, cuerpo));
        } catch (err) {
            if (err.detalles) {
                formulario.marcarErroresServidor(err.detalles);
                enfocarPrimerError(referencia.current);
            } else {
                setAviso(err.message);
            }
        } finally {
            setGuardando(false);
        }
    }

    return (
        <form
            ref={referencia}
            className="tarjeta formulario formulario-ancho mascotas-formulario"
            onSubmit={enviar}
            noValidate
        >
            <h2>{desactivar ? `Desactivar a ${mascota.nombre}` : `${mascota.nombre} vuelve al albergue`}</h2>

            <p className="texto-suave">
                {desactivar
                    ? 'La mascota sale del albergue y deja de verse en el catálogo. No se borra: queda su historial.'
                    : 'Es la misma mascota, con su historial y sus fotos. No se reabre ninguna adopción anterior.'}
            </p>

            <Campo etiqueta={desactivar ? 'Motivo de la salida' : 'Motivo del regreso'} error={errorDe('observaciones')}>
                <textarea {...propiedades('observaciones')} maxLength={LARGO_MAXIMO_OBSERVACIONES} rows={3} />
            </Campo>

            {desactivar ? (
                <Campo etiqueta="Fecha de salida" opcional error={errorDe('fechaSalida')} ayuda="Si la dejas vacía, se usa hoy.">
                    <input type="date" {...propiedades('fechaSalida')} />
                </Campo>
            ) : (
                <Campo etiqueta="Vuelve como" error={errorDe('idEstadoMascota')}>
                    <select {...propiedades('idEstadoMascota')}>
                        {estados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                </Campo>
            )}

            {aviso && <p className="aviso aviso-error">{aviso}</p>}

            <div className="mascotas-botones">
                <button type="submit" className={desactivar ? 'boton boton-peligro' : 'boton'} disabled={guardando}>
                    {guardando ? 'Guardando...' : desactivar ? 'Desactivar' : 'Reactivar'}
                </button>
                <button type="button" className="boton boton-secundario" onClick={alCancelar} disabled={guardando}>
                    Cancelar
                </button>
            </div>
        </form>
    );
}
