// Icono de huella dibujado a mano en SVG (sin imágenes externas).
// Toma el color del texto que lo rodea (currentColor).
export function Huella({ tamano = 24, className = '' }) {
    return (
        <svg
            className={className}
            width={tamano}
            height={tamano}
            viewBox="0 0 64 64"
            fill="currentColor"
            aria-hidden="true"
        >
            <ellipse cx="32" cy="42" rx="12" ry="10" />
            <ellipse cx="15" cy="28" rx="5.5" ry="7" transform="rotate(-20 15 28)" />
            <ellipse cx="49" cy="28" rx="5.5" ry="7" transform="rotate(20 49 28)" />
            <ellipse cx="25" cy="16" rx="5.2" ry="7" transform="rotate(-8 25 16)" />
            <ellipse cx="39" cy="16" rx="5.2" ry="7" transform="rotate(8 39 16)" />
        </svg>
    );
}
