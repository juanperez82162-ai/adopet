import icono from '../assets/icono-bello-animal.webp';

// Marca del encabezado: el círculo con los perritos de la fundación y el nombre del sistema.
export function Logo() {
    return (
        <span className="logo">
            <img src={icono} alt="" className="logo-icono" width="40" height="40" />
            ADOPET
        </span>
    );
}
