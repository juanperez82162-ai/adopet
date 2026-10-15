import '../notificaciones.css';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSesion } from '../../../hooks/useSesion.js';
import { formatearFecha } from '../../mascotas/mascotas.formatos.js';
import { EstadoVacio } from '../../../componentes/EstadoVacio.jsx';
import { IconoCampana } from '../../../componentes/Iconos.jsx';
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from '../notificaciones.api.js';

// Debe coincidir con OPCIONES_MENU.NOMBRE_OPCION.
const OPCION = 'NOTIFICACIONES';

const PRIORIDADES = {
    1: { texto: 'Urgente', clase: 'insignia estado-proceso estado-cancelado' },
    2: { texto: 'Importante', clase: 'insignia estado-proceso estado-pendiente' },
    3: { texto: 'Informativa', clase: 'insignia estado-proceso estado-prueba' }
};

// Bandeja del staff como equipo: si alguien marca un aviso como leído, queda
// leído para todos. Al hacer clic se abre la solicitud de la que habla.
export function Notificaciones() {
    const { usuario, tienePermiso } = useSesion();
    const esStaff = usuario?.rol === 'STAFF';
    const navegar = useNavigate();
    const puedeMarcar = tienePermiso(OPCION, 'modificar');

    const [notificaciones, setNotificaciones] = useState(null);
    const [error, setError] = useState('');

    const cargar = useCallback(() => {
        return listarNotificaciones()
            .then((datos) => {
                setNotificaciones(datos);
                setError('');
            })
            .catch((err) => {
                setNotificaciones([]);
                setError(err.message);
            });
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    async function leer(notificacion) {
        setError('');

        try {
            if (!notificacion.leida && puedeMarcar) {
                await marcarLeida(notificacion.id);
            }
        } catch (err) {
            setError(err.message);
            return;
        }

        window.dispatchEvent(new Event('notificaciones-cambiaron'));
        await cargar();
    }

    // Adónde lleva el clic: los seguimientos por responder, a su pantalla;
    // el resto, a la solicitud de la que habla el aviso.
    async function abrir(notificacion) {
        await leer(notificacion);
        navegar(notificacion.tipo === 'CHECKPOINT_DISPONIBLE'
            ? '/seguimientos'
            : `/solicitudes?abrir=${notificacion.idSolicitud}`);
    }

    async function leerTodas() {
        setError('');

        try {
            await marcarTodasLeidas();
            window.dispatchEvent(new Event('notificaciones-cambiaron'));
            await cargar();
        } catch (err) {
            setError(err.message);
        }
    }

    const hayNoLeidas = (notificaciones ?? []).some((n) => !n.leida);

    return (
        <section>
            <header className="cabecera-pagina">
                <h1>Notificaciones</h1>
                <p className="texto-suave">
                    {esStaff ? 'Avisos que requieren la atención del equipo.' : 'Novedades de tu proceso de adopción.'}
                </p>
            </header>

            {error && <p className="aviso aviso-error">{error}</p>}

            {notificaciones === null ? (
                <p className="tarjeta mensaje-carga">Cargando...</p>
            ) : notificaciones.length === 0 ? (
                <div className="tarjeta">
                    <EstadoVacio icono={IconoCampana} titulo="Todo al día" texto="No hay notificaciones por ahora." />
                </div>
            ) : (
                <>
                    {puedeMarcar && hayNoLeidas && (
                        <div className="notificaciones-barra">
                            <button type="button" className="boton boton-secundario" onClick={leerTodas}>
                                Marcar todas como leídas
                            </button>
                        </div>
                    )}

                    <ul className="notificaciones-lista">
                        {notificaciones.map((n) => {
                            const prioridad = PRIORIDADES[n.prioridad] ?? PRIORIDADES[3];

                            return (
                                <li key={n.id} className={n.leida ? 'notificaciones-item' : 'notificaciones-item sin-leer'}>
                                    <div className="notificaciones-texto">
                                        {!n.leida && <span className={prioridad.clase}>{prioridad.texto}</span>}
                                        <p>{n.mensaje}</p>
                                        <small className="texto-suave">{formatearFecha(n.fechaCreacion)}</small>
                                    </div>
                                    <div className="notificaciones-acciones">
                                        <button type="button" className="boton boton-pequeno" onClick={() => abrir(n)}>
                                            {n.tipo === 'CHECKPOINT_DISPONIBLE' ? 'Responder' : 'Ver solicitud'}
                                        </button>
                                        {!n.leida && puedeMarcar && (
                                            <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => leer(n)}>
                                                Marcar leída
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </section>
    );
}
