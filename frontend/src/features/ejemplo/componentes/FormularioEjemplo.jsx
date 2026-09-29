import { useRef, useState } from 'react';
import { useFormulario, enfocarPrimerError } from '../../../hooks/useFormulario.js';
import { Campo } from '../../../componentes/Campo.jsx';
import { crearEjemplo, modificarEjemplo } from '../ejemplo.api.js';
import { validarEjemplo, LARGO_MAXIMO_NOMBRE, LARGO_MAXIMO_DESCRIPCION } from '../ejemplo.validaciones.js';

// Toma del registro solo lo que el formulario edita. Los valores del
// formulario son SIEMPRE texto: null → '' (un input no acepta null).
function aFormulario(ejemplo) {
    return {
        nombre: ejemplo?.nombre ?? '',
        descripcion: ejemplo?.descripcion ?? ''
    };
}

// Formulario para crear (ejemplo = null) o modificar (ejemplo = registro).
// alGuardar(registro) avisa a la página con lo que respondió el backend.
//
// El patrón es el mismo de Registro y Mi perfil:
// 1. useFormulario maneja valores, campos tocados y errores.
// 2. Al enviar se marca el intento; si hay errores locales, no se envía.
// 3. Si el backend responde con detalles, se pintan campo por campo.
export function FormularioEjemplo({ ejemplo, alGuardar, alCancelar }) {
    const formulario = useFormulario(aFormulario(ejemplo), validarEjemplo);
    const { propiedades, errorDe } = formulario;
    const referencia = useRef(null);

    const [aviso, setAviso] = useState('');
    const [guardando, setGuardando] = useState(false);

    const esNuevo = !ejemplo;

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
            const datos = formulario.datos;
            const guardado = esNuevo
                ? await crearEjemplo(datos)
                : await modificarEjemplo(ejemplo.id, datos);

            alGuardar(guardado);
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
            className="tarjeta formulario formulario-ancho ejemplo-formulario"
            onSubmit={enviar}
            noValidate
        >
            <h2>{esNuevo ? 'Nuevo registro' : 'Editar registro'}</h2>

            {/* CAMBIA ESTO: los campos del módulo. Para listas desplegables
                que salen de un catálogo, ver Registro.jsx (listarCatalogo). */}
            <Campo etiqueta="Nombre" error={errorDe('nombre')}>
                <input {...propiedades('nombre')} maxLength={LARGO_MAXIMO_NOMBRE} />
            </Campo>

            <Campo etiqueta="Descripción" opcional error={errorDe('descripcion')}>
                <textarea {...propiedades('descripcion')} maxLength={LARGO_MAXIMO_DESCRIPCION} rows={3} />
            </Campo>

            {aviso && <p className="aviso aviso-error">{aviso}</p>}

            <div className="ejemplo-botones">
                <button type="submit" className="boton" disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" className="boton boton-secundario" onClick={alCancelar} disabled={guardando}>
                    Cancelar
                </button>
            </div>
        </form>
    );
}
