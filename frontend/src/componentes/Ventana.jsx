import { useEffect, useRef } from 'react';

// Ventana emergente (modal) reutilizable. Se cierra con Escape o con el
// botón "Cerrar"; el fondo no se cierra al hacer clic para no perder lo
// que la persona estaba escribiendo.
export function Ventana({ titulo, alCerrar, children }) {
    const referencia = useRef(null);

    useEffect(() => {
        function alPresionar(evento) {
            if (evento.key === 'Escape') {
                alCerrar();
            }
        }

        document.addEventListener('keydown', alPresionar);
        const anterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        referencia.current?.focus();

        return () => {
            document.removeEventListener('keydown', alPresionar);
            document.body.style.overflow = anterior;
        };
    }, [alCerrar]);

    return (
        <div className="ventana-fondo">
            <div
                ref={referencia}
                className="ventana tarjeta"
                role="dialog"
                aria-modal="true"
                aria-label={titulo}
                tabIndex={-1}
            >
                <header className="ventana-cabecera">
                    <h2>{titulo}</h2>
                    <button type="button" className="boton boton-secundario boton-pequeno" onClick={alCerrar}>
                        Cerrar
                    </button>
                </header>

                {children}
            </div>
        </div>
    );
}
