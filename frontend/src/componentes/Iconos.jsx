// Íconos de la aplicación, dibujados en SVG de línea (sin imágenes ni
// librerías externas). Todos comparten el mismo estilo que el ojo de la
// contraseña: trazo de 2, puntas redondeadas y el color del texto que los
// rodea (currentColor). A diferencia de los emojis, se ven iguales en
// Windows, Android y iPhone y toman el color del tema.

function Svg({ tamano = 20, className = '', children }) {
    return (
        <svg
            className={className}
            width={tamano}
            height={tamano}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {children}
        </svg>
    );
}

export function IconoCasa(props) {
    return (
        <Svg {...props}>
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V20h14V9.5" />
            <path d="M10 20v-5h4v5" />
        </Svg>
    );
}

export function IconoMascota(props) {
    return (
        <Svg {...props}>
            <circle cx="6.5" cy="10" r="1.8" />
            <circle cx="10" cy="5.8" r="1.8" />
            <circle cx="14" cy="5.8" r="1.8" />
            <circle cx="17.5" cy="10" r="1.8" />
            <path d="M12 12c-2.8 0-5 2.7-5 5.1C7 18.8 8.3 20 10 20c.8 0 1.4-.4 2-.4s1.2.4 2 .4c1.7 0 3-1.2 3-2.9 0-2.4-2.2-5.1-5-5.1z" />
        </Svg>
    );
}

export function IconoSolicitud(props) {
    return (
        <Svg {...props}>
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
            <path d="M9 13h6" />
            <path d="M9 17h4" />
        </Svg>
    );
}

export function IconoSeguimiento(props) {
    return (
        <Svg {...props}>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4" />
            <path d="M16 3v4" />
            <path d="M3 10h18" />
            <path d="m9 15.5 2 2 4-4" />
        </Svg>
    );
}

export function IconoCampana(props) {
    return (
        <Svg {...props}>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
        </Svg>
    );
}

export function IconoPerfil(props) {
    return (
        <Svg {...props}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
        </Svg>
    );
}

export function IconoUsuarios(props) {
    return (
        <Svg {...props}>
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
            <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
            <path d="M18 14.3a6.5 6.5 0 0 1 3.5 5.7" />
        </Svg>
    );
}

export function IconoCandado(props) {
    return (
        <Svg {...props}>
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            <path d="M12 15v2" />
        </Svg>
    );
}

export function IconoLista(props) {
    return (
        <Svg {...props}>
            <path d="M9 6h11" />
            <path d="M9 12h11" />
            <path d="M9 18h11" />
            <path d="M4.5 6h.01" />
            <path d="M4.5 12h.01" />
            <path d="M4.5 18h.01" />
        </Svg>
    );
}

export function IconoCheck(props) {
    return (
        <Svg {...props}>
            <path d="m5 12.5 4.5 4.5L19 7.5" />
        </Svg>
    );
}

export function IconoLupa(props) {
    return (
        <Svg {...props}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
        </Svg>
    );
}

export function IconoBandeja(props) {
    return (
        <Svg {...props}>
            <path d="M3 13h5l1.5 3h5l1.5-3h5" />
            <path d="M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" />
        </Svg>
    );
}

// Ícono de cada módulo del menú, por su nombre técnico (NOMBRE_OPCION).
// El menú sigue saliendo de la base; esto solo decide el dibujo.
// Un módulo nuevo sin ícono propio usa la huella de mascota.
const ICONOS_MODULO = {
    INICIO: IconoCasa,
    MASCOTAS: IconoMascota,
    SOLICITUDES: IconoSolicitud,
    SEGUIMIENTOS: IconoSeguimiento,
    NOTIFICACIONES: IconoCampana,
    MI_PERFIL: IconoPerfil,
    USUARIOS: IconoUsuarios,
    ACCESOS: IconoCandado,
    CATALOGOS: IconoLista
};

export function IconoModulo({ opcion, ...props }) {
    const Icono = ICONOS_MODULO[opcion] || IconoMascota;
    return <Icono {...props} />;
}
