import '../inicio.css';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSesion } from '../../../hooks/useSesion.js';
import { IconoModulo } from '../../../componentes/Iconos.jsx';
import { Huella } from '../../../componentes/Huella.jsx';
import { obtenerResumen } from '../inicio.api.js';

// Próximos pasos sugeridos. Cada paso aparece solo si la persona tiene ese
// permiso sobre el módulo (los mismos permisos de Accesos), así que no
// depende del nombre del perfil. Se muestran los primeros 3 que apliquen.
// accion: null = basta con ver el módulo; 'crear' / 'modificar' = necesita
// esa acción; sinAccion = se muestra solo si NO la tiene (la vista del adoptante).
const PASOS = [
    { opcion: 'USUARIOS', accion: null, texto: 'Revisa las cuentas nuevas y asigna el perfil que corresponde.' },
    { opcion: 'MASCOTAS', accion: 'crear', texto: 'Registra las mascotas que llegan al albergue, con sus fotos.' },
    { opcion: 'MASCOTAS', sinAccion: 'crear', texto: 'Conoce las mascotas que buscan un hogar.' },
    { opcion: 'SOLICITUDES', accion: 'modificar', texto: 'Atiende las solicitudes nuevas y formaliza las que avanzan.' },
    { opcion: 'SOLICITUDES', sinAccion: 'modificar', texto: 'Responde el cuestionario de compatibilidad para encontrar tu match.' },
    { opcion: 'SEGUIMIENTOS', accion: 'modificar', texto: 'Revisa los checkpoints de las adopciones en período de prueba.' },
    { opcion: 'MI_PERFIL', accion: null, texto: 'Mantén al día tus datos de contacto en Mi perfil.' }
];

const MAXIMO_PASOS = 3;

export function Inicio() {
    const { usuario, menu, puedeVer, tienePermiso } = useSesion();
    const modulos = menu.filter((item) => item.opcion !== 'INICIO');
    const primerNombre = usuario.primerNombre || usuario.nombre?.split(' ')[0] || usuario.nombre;

    // null = cargando. Si falla, Inicio se muestra igual, sin las cifras.
    const [bloques, setBloques] = useState(null);

    useEffect(() => {
        obtenerResumen()
            .then((resumen) => setBloques(resumen.bloques))
            .catch(() => setBloques([]));
    }, []);

    const pasos = PASOS.filter((paso) => {
        if (!puedeVer(paso.opcion)) {
            return false;
        }

        if (paso.accion) {
            return tienePermiso(paso.opcion, paso.accion);
        }

        if (paso.sinAccion) {
            return !tienePermiso(paso.opcion, paso.sinAccion);
        }

        return true;
    }).slice(0, MAXIMO_PASOS);

    const rutaDe = (opcion) => menu.find((item) => item.opcion === opcion)?.ruta;

    return (
        <section>
            <div className="bienvenida">
                <div>
                    <h1>¡Hola, {primerNombre}!</h1>
                    <p>Cada huella que llega a la fundación busca un hogar. ¿Qué haremos hoy?</p>
                </div>
                <Huella tamano={72} className="bienvenida-huella" />
            </div>

            {bloques?.map((bloque) => (
                <div key={bloque.opcion} className="resumen">
                    <div className="resumen-cabecera">
                        <h2>
                            <IconoModulo opcion={bloque.opcion} tamano={20} />
                            {bloque.titulo}
                        </h2>
                        <Link to={bloque.ruta}>Ver todo</Link>
                    </div>

                    <div className="resumen-cifras">
                        {bloque.cifras.map((cifra) => (
                            <div key={cifra.clave} className="tarjeta resumen-cifra">
                                <span className="resumen-valor">{cifra.valor}</span>
                                <span className="resumen-etiqueta">{cifra.etiqueta}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {pasos.length > 0 && (
                <div className="tarjeta pasos">
                    <h2>Próximos pasos</h2>
                    <ol>
                        {pasos.map((paso) => (
                            <li key={paso.texto}>
                                <Link to={rutaDe(paso.opcion)} className="paso">
                                    <span className="paso-icono">
                                        <IconoModulo opcion={paso.opcion} tamano={18} />
                                    </span>
                                    {paso.texto}
                                </Link>
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            {modulos.length > 0 && <h2 className="inicio-subtitulo">Tus módulos</h2>}

            <div className="rejilla">
                {modulos.map((item) => (
                    <Link key={item.opcion} to={item.ruta} className="tarjeta tarjeta-modulo">
                        <span className="tarjeta-modulo-icono"><IconoModulo opcion={item.opcion} tamano={26} /></span>
                        {item.etiqueta}
                    </Link>
                ))}
            </div>
        </section>
    );
}
