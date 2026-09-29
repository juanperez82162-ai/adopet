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

    // Cuando el usuario edita sus datos (Mi perfil) o cambia su perfil, se
    // refresca lo que se ve en pantalla sin tener que volver a iniciar sesión.
    const actualizarUsuario = useCallback((cambios) => {
        setUsuario((anterior) => {
            if (!anterior) {
                return anterior;
            }

            const nuevo = { ...anterior, ...cambios };
            guardarSesion(leerToken(), nuevo);
            return nuevo;
        });
    }, []);

    // El backend devuelve el menú junto con el perfil ACTUAL del usuario:
    // si lo vetaron o le cambiaron el perfil, aquí se entera.
    const aplicarMenu = useCallback((sesion) => {
        setMenu(sesion.opciones);
        actualizarUsuario({ perfil: sesion.perfil, vetado: sesion.vetado });
    }, [actualizarUsuario]);

    const refrescarMenu = useCallback(async () => {
        aplicarMenu(await obtenerMenu());
    }, [aplicarMenu]);

    // Al abrir o recargar la página: si hay un token guardado, se pide el menú.
    // Si el token venció o la cuenta se desactivó, el backend responde 401
    // y la sesión se cierra.
    useEffect(() => {
        if (!leerToken()) {
            return;
        }

        obtenerMenu()
            .then(aplicarMenu)
            .catch(() => cerrarSesion())
            .finally(() => setCargando(false));
    }, [aplicarMenu, cerrarSesion]);

    // Cualquier petición que reciba 401 dispara este evento.
    useEffect(() => {
        window.addEventListener(EVENTO_SESION_EXPIRADA, cerrarSesion);
        return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, cerrarSesion);
    }, [cerrarSesion]);

    const iniciarSesion = useCallback(async (correo, contrasena) => {
        const sesion = await login(correo, contrasena);
        guardarSesion(sesion.token, sesion.usuario);

        const menuSesion = await obtenerMenu();

        setUsuario(sesion.usuario);
        aplicarMenu(menuSesion);

        return sesion.usuario;
    }, [aplicarMenu]);

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
        () => ({
            usuario, menu, cargando, iniciarSesion, cerrarSesion,
            actualizarUsuario, refrescarMenu, puedeVer, tienePermiso
        }),
        [usuario, menu, cargando, iniciarSesion, cerrarSesion, actualizarUsuario, refrescarMenu, puedeVer, tienePermiso]
    );

    return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}
