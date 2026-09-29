import { IconoBandeja } from './Iconos.jsx';

// Lo que se muestra cuando una lista no tiene nada: un ícono grande, un
// título, una frase que explica por qué está vacía y, si aplica, una
// acción (children), por ejemplo un botón para limpiar los filtros o
// crear el primer registro.
//
// Uso:
//     <EstadoVacio icono={IconoLupa} titulo="Sin resultados" texto="...">
//         <button className="boton boton-secundario">Limpiar filtros</button>
//     </EstadoVacio>
export function EstadoVacio({ icono: Icono = IconoBandeja, titulo, texto, children }) {
    return (
        <div className="estado-vacio">
            <span className="estado-vacio-icono">
                <Icono tamano={30} />
            </span>
            <p className="estado-vacio-titulo">{titulo}</p>
            {texto && <p className="texto-suave">{texto}</p>}
            {children && <div className="estado-vacio-acciones">{children}</div>}
        </div>
    );
}
