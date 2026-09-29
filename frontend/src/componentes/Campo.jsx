// Envuelve un campo de formulario con su etiqueta y su mensaje:
// muestra el error en rojo si lo hay, o la ayuda si no.
export function Campo({ etiqueta, opcional = false, error, ayuda, children }) {
    return (
        <label className={error ? 'campo campo-con-error' : 'campo'}>
            <span>
                {etiqueta}
                {opcional && <span className="campo-opcional"> (opcional)</span>}
            </span>

            {children}

            {error
                ? <small className="campo-error" role="alert">{error}</small>
                : ayuda && <small className="campo-ayuda">{ayuda}</small>}
        </label>
    );
}
