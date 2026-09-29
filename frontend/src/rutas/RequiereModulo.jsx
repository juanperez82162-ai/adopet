import { useSesion } from '../hooks/useSesion.js';

// Muestra la página solo si el módulo está en el menú del perfil.
// Es experiencia de usuario: la protección real la hace el backend con autorizar().
export function RequiereModulo({ opcion, children }) {
    const { puedeVer } = useSesion();

    if (!puedeVer(opcion)) {
        return (
            <section className="tarjeta">
                <h1>Sin acceso</h1>
                <p className="texto-suave">Su perfil no tiene acceso a este módulo.</p>
            </section>
        );
    }

    return children;
}
