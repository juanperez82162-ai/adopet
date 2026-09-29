import { useState } from 'react';

// Campo de contraseña con el botón del ojo para mostrarla u ocultarla.
// Recibe las mismas propiedades que un <input> normal.
export function InputContrasena(propiedades) {
    const [visible, setVisible] = useState(false);

    return (
        <span className="input-contrasena">
            <input {...propiedades} type={visible ? 'text' : 'password'} />

            <button
                type="button"
                className="boton-ojo"
                onClick={() => setVisible((actual) => !actual)}
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={visible}
                title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
                {visible ? <OjoTachado /> : <Ojo />}
            </button>
        </span>
    );
}

function Ojo() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function OjoTachado() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2" />
            <path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            <path d="M2 2l20 20" />
        </svg>
    );
}
