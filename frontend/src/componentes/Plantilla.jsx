import { Outlet, useNavigate } from 'react-router-dom';
import { useSesion } from '../hooks/useSesion.js';
import { Menu } from './Menu.jsx';
import { Logo } from './Logo.jsx';
import { PantallaVetado } from './PantallaVetado.jsx';

// Estructura común de todas las pantallas con sesión:
// encabezado arriba, menú a la izquierda y el contenido de la página.
export function Plantilla() {
    const { usuario, cerrarSesion } = useSesion();
    const navegar = useNavigate();

    function salir() {
        cerrarSesion();
        navegar('/login', { replace: true });
    }

    // Un usuario vetado entra, pero solo ve el aviso del veto.
    if (usuario.vetado) {
        return <PantallaVetado nombre={usuario.nombre} alSalir={salir} />;
    }

    const inicial = usuario.nombre?.trim().charAt(0).toUpperCase() || '?';

    return (
        <div className="plantilla">
            <header className="encabezado">
                <Logo />
                <div className="encabezado-usuario">
                    <span className="avatar" aria-hidden="true">{inicial}</span>
                    <span className="encabezado-datos">
                        <strong>{usuario.nombre}</strong>
                        <small>{usuario.perfil}</small>
                    </span>
                    <button type="button" className="boton boton-secundario" onClick={salir}>
                        Cerrar sesión
                    </button>
                </div>
            </header>

            <aside className="lateral">
                <Menu />
            </aside>

            <main className="contenido">
                <Outlet />
            </main>
        </div>
    );
}
