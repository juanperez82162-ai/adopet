import logoFundacion from '../assets/logo-bello-animal.webp';

// Lo único que ve un usuario con perfil Vetado al iniciar sesión.
// El motivo del veto no se guarda en el sistema (decisión del modelo),
// por eso el mensaje es general y remite a la fundación.
export function PantallaVetado({ nombre, alSalir }) {
    const primerNombre = nombre?.split(' ')[0] || '';

    return (
        <main className="pantalla-vetado">
            <section className="tarjeta vetado-tarjeta" role="alert">
                <img src={logoFundacion} alt="Fundación Bello Animal" className="vetado-logo" width="96" height="96" />

                <span className="vetado-icono" aria-hidden="true">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M4.9 4.9l14.2 14.2" />
                    </svg>
                </span>

                <h1>{primerNombre ? `${primerNombre}, tu cuenta está vetada` : 'Tu cuenta está vetada'}</h1>

                <p className="vetado-principal">
                    La Fundación Bello Animal restringió tu acceso a ADOPET por incumplir sus
                    condiciones de adopción o por una conducta que puso en riesgo el bienestar de los animales.
                </p>

                <p className="texto-suave">
                    Mientras el veto siga vigente no puedes ver mascotas, enviar solicitudes de adopción
                    ni participar en seguimientos.
                </p>

                <p className="texto-suave">
                    Si crees que se trata de un error, comunícate directamente con la fundación.
                </p>

                <button type="button" className="boton boton-secundario" onClick={alSalir}>
                    Cerrar sesión
                </button>
            </section>
        </main>
    );
}
