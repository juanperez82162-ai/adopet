import { Link } from 'react-router-dom';
import { useSesion } from '../../../hooks/useSesion.js';
import { iconoDe } from '../../../componentes/iconosModulos.js';
import { Huella } from '../../../componentes/Huella.jsx';

export function Inicio() {
    const { usuario, menu } = useSesion();
    const modulos = menu.filter((item) => item.opcion !== 'INICIO');
    const primerNombre = usuario.nombre?.split(' ')[0] || usuario.nombre;

    return (
        <section>
            <div className="bienvenida">
                <div>
                    <h1>¡Hola, {primerNombre}!</h1>
                    <p>Cada huella que llega a la fundación busca un hogar. ¿Qué haremos hoy?</p>
                </div>
                <Huella tamano={72} className="bienvenida-huella" />
            </div>

            <div className="rejilla">
                {modulos.map((item) => (
                    <Link key={item.opcion} to={item.ruta} className="tarjeta tarjeta-modulo">
                        <span className="tarjeta-modulo-icono" aria-hidden="true">{iconoDe(item.opcion)}</span>
                        {item.etiqueta}
                    </Link>
                ))}
            </div>
        </section>
    );
}
