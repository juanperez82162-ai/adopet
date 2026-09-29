import { Link } from 'react-router-dom';
import { useSesion } from '../../../hooks/useSesion.js';

export function Inicio() {
    const { usuario, menu } = useSesion();
    const modulos = menu.filter((item) => item.opcion !== 'INICIO');

    return (
        <section>
            <h1>Hola, {usuario.nombre}</h1>
            <p className="texto-suave">Estos son los módulos a los que tiene acceso:</p>

            <div className="rejilla">
                {modulos.map((item) => (
                    <Link key={item.opcion} to={item.ruta} className="tarjeta tarjeta-enlace">
                        {item.etiqueta}
                    </Link>
                ))}
            </div>
        </section>
    );
}
