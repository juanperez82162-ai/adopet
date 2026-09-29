import logoFundacion from '../assets/logo-bello-animal.webp';
import { Huella } from './Huella.jsx';

// Marco de las pantallas sin sesión (login y registro):
// un panel de bienvenida a la izquierda y el formulario a la derecha.
export function PantallaAcceso({ children }) {
    return (
        <div className="pantalla-acceso">
            <section className="acceso-panel">
                <div className="acceso-marca">
                    <img
                        src={logoFundacion}
                        alt="Fundación Bello Animal: huellas de amor y esperanza"
                        className="acceso-logo"
                        width="210"
                        height="210"
                    />
                    <span className="acceso-nombre">ADOPET</span>
                </div>
                <h2>Cada huella busca un hogar</h2>
                <p>
                    En la Fundación Bello Animal te acompañamos para encontrar a tu
                    compañero ideal y seguimos contigo después de la adopción.
                </p>
                <div className="acceso-huellas" aria-hidden="true">
                    <Huella tamano={40} />
                    <Huella tamano={28} />
                    <Huella tamano={36} />
                </div>
            </section>

            <section className="acceso-formulario">{children}</section>
        </div>
    );
}
