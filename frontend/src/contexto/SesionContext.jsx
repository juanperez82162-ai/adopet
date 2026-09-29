import { useCallback, useEffect, useMemo, useState } from 'react';
import { SesionContexto } from './sesionContexto.js';
import {
    guardarSesion,
    leerToken,
    leerUsuarioGuardado,
    borrarSesion,
    EVENTO_SESION_EXPIRADA
} from '../api/cliente.js';
import { login, obtenerMenu } from '../features/auth/auth.api.js';

export function SesionProvider({ children }) {
    const [usuario, setUsuario] = useState(() => (leerToken() ? leerUsuarioGuardado() : null));
    const [menu, setMenu] = useState([]);
    const [cargando, setCargando] = useState(() => Boolean(leerToken()));

    const cerrarSesion = useCallback(() => {
        borrarSesion();
        setUsuario(null);
        setMenu([]);
    }, []);

    // Al abrir o recargar la página: si hay un token guardado, se pide el menú.
    // Si el token venció, el backend responde 401 y la sesión se cierra.
    useEffect(() => {
        if (!leerToken()) {
            return;
        }

        obtenerMenu()
            .then(setMenu)
            .catch(() => cerrarSesion())
            .finally(() => setCargando(false));
    }, [cerrarSesion]);

    // Cualquier petición que reciba 401 dispara este evento.
    useEffect(() => {
        window.addEventListener(EVENTO_SESION_EXPIRADA, cerrarSesion);
        return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, cerrarSesion);
    }, [cerrarSesion]);

    const iniciarSesion = useCallback(async (correo, contrasena) => {
        const sesion = await login(correo, contrasena);
        guardarSesion(sesion.token, sesion.usuario);

        const opciones = await obtenerMenu();

        setUsuario(sesion.usuario);
        setMenu(opciones);

        return sesion.usuario;
    }, []);

    // Permisos para decidir qué se MUESTRA. La seguridad real está en el backend.
    const puedeVer = useCallback(
        (opcion) => menu.some((item) => item.opcion === opcion),
        [menu]
    );

    const tienePermiso = useCallback(
        (opcion, accion) => {
            const item = menu.find((elemento) => elemento.opcion === opcion);
            return Boolean(item?.permisos?.[accion]);
        },
        [menu]
    );

    const valor = useMemo(
        () => ({ usuario, menu, cargando, iniciarSesion, cerrarSesion, puedeVer, tienePermiso }),
        [usuario, menu, cargando, iniciarSesion, cerrarSesion, puedeVer, tienePermiso]
    );

    return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}
