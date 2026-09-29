import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registrar } from '../auth.api.js';
import { listarCatalogo } from '../../catalogos/catalogos.api.js';
import { PantallaAcceso } from '../../../componentes/PantallaAcceso.jsx';

const FORMULARIO_VACIO = {
    documento: '',
    idTipoDocumento: '',
    nombre: '',
    correo: '',
    contrasena: '',
    confirmacion: '',
    telefono: '',
    direccion: '',
    idCiudad: '',
    fechaNacimiento: ''
};

export function Registro() {
    const navegar = useNavigate();

    const [datos, setDatos] = useState(FORMULARIO_VACIO);
    const [tiposDocumento, setTiposDocumento] = useState([]);
    const [ciudades, setCiudades] = useState([]);
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    // Las listas salen de la base (catálogos activos), no del código.
    useEffect(() => {
        Promise.all([listarCatalogo('tipos-documento'), listarCatalogo('ciudades')])
            .then(([tipos, listaCiudades]) => {
                setTiposDocumento(tipos);
                setCiudades(listaCiudades);
            })
            .catch((err) => setError(err.message));
    }, []);

    function cambiar(evento) {
        const { name, value } = evento.target;
        setDatos((anterior) => ({ ...anterior, [name]: value }));
    }

    async function enviar(evento) {
        evento.preventDefault();
        setError('');

        // Esta verificación es solo de comodidad: el backend valida todo de nuevo.
        if (datos.contrasena !== datos.confirmacion) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setEnviando(true);

        try {
            // La confirmación no se envía: solo existe en el formulario.
            await registrar({
                documento: datos.documento,
                idTipoDocumento: Number(datos.idTipoDocumento),
                nombre: datos.nombre,
                correo: datos.correo,
                contrasena: datos.contrasena,
                telefono: datos.telefono,
                direccion: datos.direccion,
                idCiudad: Number(datos.idCiudad),
                fechaNacimiento: datos.fechaNacimiento
            });

            navegar('/login', { replace: true, state: { registrado: true, correo: datos.correo } });
        } catch (err) {
            setError(err.message);
        } finally {
            setEnviando(false);
        }
    }

    return (
        <PantallaAcceso>
            <form className="tarjeta formulario formulario-ancho" onSubmit={enviar}>
                <h1>Crea tu cuenta</h1>
                <p className="texto-suave">El primer paso para darle un hogar a un peludito.</p>

                <div className="fila">
                    <label className="campo">
                        Tipo de documento
                        <select name="idTipoDocumento" value={datos.idTipoDocumento} onChange={cambiar} required>
                            <option value="">Seleccione...</option>
                            {tiposDocumento.map((tipo) => (
                                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                            ))}
                        </select>
                    </label>

                    <label className="campo">
                        Número de documento
                        <input name="documento" value={datos.documento} onChange={cambiar} maxLength={20} required />
                    </label>
                </div>

                <label className="campo">
                    Nombre completo
                    <input name="nombre" value={datos.nombre} onChange={cambiar} maxLength={100} required />
                </label>

                <label className="campo">
                    Correo
                    <input type="email" name="correo" value={datos.correo} onChange={cambiar} maxLength={150} autoComplete="email" required />
                </label>

                <div className="fila">
                    <label className="campo">
                        Contraseña
                        <input type="password" name="contrasena" value={datos.contrasena} onChange={cambiar} maxLength={72} autoComplete="new-password" required />
                    </label>

                    <label className="campo">
                        Confirmar contraseña
                        <input type="password" name="confirmacion" value={datos.confirmacion} onChange={cambiar} maxLength={72} autoComplete="new-password" required />
                    </label>
                </div>
                <small className="texto-suave">Mínimo 8 caracteres, con al menos una letra y un número.</small>

                <div className="fila">
                    <label className="campo">
                        Teléfono
                        <input name="telefono" value={datos.telefono} onChange={cambiar} maxLength={20} required />
                    </label>

                    <label className="campo">
                        Fecha de nacimiento
                        <input type="date" name="fechaNacimiento" value={datos.fechaNacimiento} onChange={cambiar} required />
                    </label>
                </div>

                <div className="fila">
                    <label className="campo">
                        Ciudad
                        <select name="idCiudad" value={datos.idCiudad} onChange={cambiar} required>
                            <option value="">Seleccione...</option>
                            {ciudades.map((ciudad) => (
                                <option key={ciudad.id} value={ciudad.id}>{ciudad.nombre}</option>
                            ))}
                        </select>
                    </label>

                    <label className="campo">
                        Dirección
                        <input name="direccion" value={datos.direccion} onChange={cambiar} maxLength={200} required />
                    </label>
                </div>

                {error && <p className="aviso aviso-error">{error}</p>}

                <button type="submit" className="boton" disabled={enviando}>
                    {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>

                <p className="texto-suave">
                    ¿Ya tiene cuenta? <Link to="/login">Inicie sesión</Link>
                </p>
            </form>
        </PantallaAcceso>
    );
}
