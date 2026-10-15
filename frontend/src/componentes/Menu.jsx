import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSesion } from '../hooks/useSesion.js';
import { obtenerContador } from '../features/notificaciones/notificaciones.api.js';
import { IconoModulo } from './Iconos.jsx';
import '../features/notificaciones/notificaciones.css';

// Cada cuánto se consulta cuántas notificaciones sin leer hay.
const INTERVALO_MS = 60000;

// Nº de notificaciones sin leer. Se refresca solo y cuando la bandeja cambia.
function useNoLeidas(activo) {
    const [noLeidas, setNoLeidas] = useState(0);

    useEffect(() => {
        if (!activo) return undefined;

        let vigente = true;

        function actualizar() {
            obtenerContador()
                .then((datos) => vigente && setNoLeidas(datos.noLeidas))
                .catch(() => undefined);
        }

        actualizar();
        const temporizador = setInterval(actualizar, INTERVALO_MS);
        window.addEventListener('notificaciones-cambiaron', actualizar);

        return () => {
            vigente = false;
            clearInterval(temporizador);
            window.removeEventListener('notificaciones-cambiaron', actualizar);
        };
    }, [activo]);

    return noLeidas;
}

// El menú NO está escrito en el código: se dibuja con lo que devuelve
// GET /api/auth/menu, que sale de PERFILES_OPCIONES y OPCIONES_MENU.
export function Menu() {
    const { menu } = useSesion();
    const noLeidas = useNoLeidas(menu.some((item) => item.opcion === 'NOTIFICACIONES'));

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
                    <span className="menu-icono"><IconoModulo opcion={item.opcion} /></span>
                    {item.etiqueta}
                    {item.opcion === 'NOTIFICACIONES' && noLeidas > 0 && (
                        <span className="menu-contador" aria-label={`${noLeidas} sin leer`}>{noLeidas}</span>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}
