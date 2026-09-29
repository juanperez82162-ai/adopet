import { Outlet, useNavigate } from 'react-router-dom';
import { useSesion } from '../hooks/useSesion.js';
import { Menu } from './Menu.jsx';

// Estructura común de todas las pantallas con sesión:
// encabezado arriba, menú a la izquierda y el contenido de la página.
export function Plantilla() {
    const { usuario, cerrarSesion } = useSesion();
    const navegar = useNavigate();

    function salir() {
        cerrarSesion();
        navegar('/login', { replace: true });
    }

    return (
        <div className="plantilla">
            <header className="encabezado">
                <span className="marca">ADOPET</span>
                <div className="encabezado-usuario">
                    <span>
                        {usuario.nombre} · <small>{usuario.perfil}</small>
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
