import { NavLink } from 'react-router-dom';
import { useSesion } from '../hooks/useSesion.js';
import { iconoDe } from './iconosModulos.js';

// El menú NO está escrito en el código: se dibuja con lo que devuelve
// GET /api/auth/menu, que sale de PERFILES_OPCIONES y OPCIONES_MENU.
export function Menu() {
    const { menu } = useSesion();

    if (menu.length === 0) {
        return <p className="menu-vacio">No tiene módulos habilitados.</p>;
    }

    return (
        <nav className="menu">
            {menu.map((item) => (
                <NavLink
                    key={item.opcion}
                    to={item.ruta}
                    className={({ isActive }) => (isActive ? 'menu-enlace activo' : 'menu-enlace')}
                >
                    <span className="menu-icono" aria-hidden="true">{iconoDe(item.opcion)}</span>
                    {item.etiqueta}
                </NavLink>
            ))}
        </nav>
    );
}
