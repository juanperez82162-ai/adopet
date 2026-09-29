import { useLocation } from 'react-router-dom';
import { useSesion } from '../hooks/useSesion.js';

// Se muestra para las rutas que todavía no tienen pantalla.
// Distingue un módulo del menú en construcción de una dirección que no existe.
export function PaginaPendiente() {
    const { menu } = useSesion();
    const { pathname } = useLocation();

    const modulo = menu.find((item) => item.ruta === pathname);

    if (modulo) {
        return (
            <section className="tarjeta">
                <h1>{modulo.etiqueta}</h1>
                <p>Este módulo está en construcción.</p>
            </section>
        );
    }

    return (
        <section className="tarjeta">
            <h1>Página no encontrada</h1>
            <p>La dirección no existe o no tiene acceso a ella.</p>
        </section>
    );
}
