import { Navigate, useLocation } from 'react-router-dom';
import { useSesion } from '../hooks/useSesion.js';

// Deja pasar solo a quien tiene sesión. Si no, lo manda al login
// recordando a dónde quería ir, para devolverlo ahí después de entrar.
export function RutaProtegida({ children }) {
    const { usuario, cargando } = useSesion();
    const ubicacion = useLocation();

    if (cargando) {
        return <p className="mensaje-carga">Cargando sesión...</p>;
    }

    if (!usuario) {
        return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
    }

    return children;
}

// Lo contrario: login y registro solo para quien NO tiene sesión.
export function SoloInvitado({ children }) {
    const { usuario, cargando } = useSesion();

    if (cargando) {
        return <p className="mensaje-carga">Cargando sesión...</p>;
    }

    if (usuario) {
        return <Navigate to="/inicio" replace />;
    }

    return children;
}
