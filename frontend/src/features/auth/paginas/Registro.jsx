import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registrar } from '../auth.api.js';
import { listarCatalogo } from '../../catalogos/catalogos.api.js';
import { PantallaAcceso } from '../../../componentes/PantallaAcceso.jsx';
import { Campo } from '../../../componentes/Campo.jsx';
import { InputContrasena } from '../../../componentes/InputContrasena.jsx';
import { RequisitosContrasena } from '../componentes/RequisitosContrasena.jsx';
import {
    validarRegistro,
    ayudaDocumento,
    fechaHaceAnios,
    EDAD_MINIMA,
    EDAD_MAXIMA,
    LARGO_MAXIMO_NOMBRE,
    LARGO_MAXIMO_CORREO,
    LARGO_MAXIMO_DIRECCION,
    LARGO_MAXIMO_CONTRASENA
} from '../validaciones.js';

const FORMULARIO_VACIO = {
    idTipoDocumento: '',
    documento: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    correo: '',
    contrasena: '',
    confirmacion: '',
    telefono: '',
    fechaNacimiento: '',
    idCiudad: '',
    direccion: ''
};

// Límites del calendario: nadie menor de 18 ni mayor de 100 años.
const FECHA_MAXIMA = fechaHaceAnios(EDAD_MINIMA);
const FECHA_MINIMA = fechaHaceAnios(EDAD_MAXIMA);

export function Registro() {
    const navegar = useNavigate();

    const [datos, setDatos] = useState(FORMULARIO_VACIO);
    const [tiposDocumento, setTiposDocumento] = useState([]);
    const [ciudades, setCiudades] = useState([]);

    // tocados: campos de los que el usuario ya salió (ahí se muestran errores).
    // intentoEnviar: al pulsar "Crear cuenta" se muestran todos.
    const [tocados, setTocados] = useState({});
    const [intentoEnviar, setIntentoEnviar] = useState(false);
    const [erroresServidor, setErroresServidor] = useState({});
    const [aviso, setAviso] = useState('');
    const [enviando, setEnviando] = useState(false);

    // Las listas salen de la base (catálogos activos), no del código.
    useEffect(() => {
        Promise.all([listarCatalogo('tipos-documento'), listarCatalogo('ciudades')])
            .then(([tipos, listaCiudades]) => {
                setTiposDocumento(tipos);
                setCiudades(listaCiudades);
            })
            .catch((err) => setAviso(err.message));
    }, []);

    const reglaDocumento = tiposDocumento.find((tipo) => String(tipo.id) === datos.idTipoDocumento) || null;
    const errores = validarRegistro(datos, reglaDocumento);

    // El error que se ve: primero el del servidor; si no, el local,
    // pero solo cuando el campo ya se tocó o se intentó enviar.
    function errorDe(campo) {
        if (erroresServidor[campo]) {
            return erroresServidor[campo];
        }

        // La confirmación avisa en vivo desde la primera letra.
        const enVivo = campo === 'confirmacion' && datos.confirmacion !== '';

        return (tocados[campo] || intentoEnviar || enVivo) ? errores[campo] : undefined;
    }

    function propiedades(campo) {
        return {
            name: campo,
            value: datos[campo],
            onChange: cambiar,
            onBlur: salir,
            'aria-invalid': errorDe(campo) ? 'true' : 'false'
        };
    }

    function cambiar(evento) {
        const { name, value } = evento.target;
        setDatos((anterior) => ({ ...anterior, [name]: value }));
        setErroresServidor((anterior) => ({ ...anterior, [name]: undefined }));
        setAviso('');
    }

    function salir(evento) {
        const { name } = evento.target;
        setTocados((anterior) => ({ ...anterior, [name]: true }));
    }

    async function enviar(evento) {
        evento.preventDefault();
        setIntentoEnviar(true);
        setAviso('');

        if (Object.keys(errores).length > 0) {
            setAviso('Revisa los campos marcados en rojo.');
            enfocarPrimerError();
            return;
        }

        setEnviando(true);

        try {
            // La confirmación no se envía: solo existe en el formulario.
            await registrar({
                idTipoDocumento: Number(datos.idTipoDocumento),
                documento: datos.documento,
                primerNombre: datos.primerNombre,
                segundoNombre: datos.segundoNombre,
                primerApellido: datos.primerApellido,
                segundoApellido: datos.segundoApellido,
                correo: datos.correo,
                contrasena: datos.contrasena,
                telefono: datos.telefono,
                fechaNacimiento: datos.fechaNacimiento,
                idCiudad: Number(datos.idCiudad),
                direccion: datos.direccion
            });

            navegar('/login', { replace: true, state: { registrado: true, correo: datos.correo.trim() } });
        } catch (err) {
            // Si el backend marcó campos puntuales, se pintan en cada uno.
            if (err.detalles) {
                setErroresServidor(err.detalles);
                setAviso('Revisa los campos marcados en rojo.');
                enfocarPrimerError();
            } else {
                setAviso(err.message);
            }
        } finally {
            setEnviando(false);
        }
    }

    function enfocarPrimerError() {
        // Se espera a que React pinte los errores antes de buscar el campo.
        requestAnimationFrame(() => {
            document.querySelector('.formulario [aria-invalid="true"]')?.focus();
        });
    }

    return (
        <PantallaAcceso>
            <form className="tarjeta formulario formulario-ancho" onSubmit={enviar} noValidate>
                <h1>Crea tu cuenta</h1>
                <p className="texto-suave">El primer paso para darle un hogar a un peludito.</p>

                <div className="fila">
                    <Campo etiqueta="Tipo de documento" error={errorDe('idTipoDocumento')}>
                        <select {...propiedades('idTipoDocumento')}>
                            <option value="">Seleccione...</option>
                            {tiposDocumento.map((tipo) => (
                                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                            ))}
                        </select>
                    </Campo>

                    <Campo
                        etiqueta="Número de documento"
                        error={errorDe('documento')}
                        ayuda={ayudaDocumento(reglaDocumento)}
                    >
                        <input
                            {...propiedades('documento')}
                            inputMode={reglaDocumento?.soloNumeros ? 'numeric' : 'text'}
                            maxLength={25}
                        />
                    </Campo>
                </div>

                <div className="fila">
                    <Campo etiqueta="Primer nombre" error={errorDe('primerNombre')}>
                        <input {...propiedades('primerNombre')} maxLength={LARGO_MAXIMO_NOMBRE} autoComplete="given-name" />
                    </Campo>

                    <Campo etiqueta="Segundo nombre" opcional error={errorDe('segundoNombre')}>
                        <input {...propiedades('segundoNombre')} maxLength={LARGO_MAXIMO_NOMBRE} autoComplete="additional-name" />
                    </Campo>
                </div>

                <div className="fila">
                    <Campo etiqueta="Primer apellido" error={errorDe('primerApellido')}>
                        <input {...propiedades('primerApellido')} maxLength={LARGO_MAXIMO_NOMBRE} autoComplete="family-name" />
                    </Campo>

                    <Campo etiqueta="Segundo apellido" opcional error={errorDe('segundoApellido')}>
                        <input {...propiedades('segundoApellido')} maxLength={LARGO_MAXIMO_NOMBRE} />
                    </Campo>
                </div>

                <Campo etiqueta="Correo" error={errorDe('correo')}>
                    <input type="email" {...propiedades('correo')} maxLength={LARGO_MAXIMO_CORREO} autoComplete="email" />
                </Campo>

                <div className="fila">
                    <Campo etiqueta="Contraseña" error={errorDe('contrasena')}>
                        <InputContrasena
                            {...propiedades('contrasena')}
                            maxLength={LARGO_MAXIMO_CONTRASENA}
                            autoComplete="new-password"
                        />
                    </Campo>

                    <Campo etiqueta="Confirmar contraseña" error={errorDe('confirmacion')}>
                        <InputContrasena
                            {...propiedades('confirmacion')}
                            maxLength={LARGO_MAXIMO_CONTRASENA}
                            autoComplete="new-password"
                        />
                    </Campo>
                </div>

                <RequisitosContrasena contrasena={datos.contrasena} confirmacion={datos.confirmacion} />

                <div className="fila">
                    <Campo
                        etiqueta="Teléfono"
                        error={errorDe('telefono')}
                        ayuda="Celular o fijo de 10 dígitos."
                    >
                        <input type="tel" {...propiedades('telefono')} inputMode="tel" maxLength={16} autoComplete="tel" />
                    </Campo>

                    <Campo
                        etiqueta="Fecha de nacimiento"
                        error={errorDe('fechaNacimiento')}
                        ayuda="Debes ser mayor de 18 años."
                    >
                        <input
                            type="date"
                            {...propiedades('fechaNacimiento')}
                            min={FECHA_MINIMA}
                            max={FECHA_MAXIMA}
                            autoComplete="bday"
                        />
                    </Campo>
                </div>

                <div className="fila">
                    <Campo etiqueta="Ciudad" error={errorDe('idCiudad')}>
                        <select {...propiedades('idCiudad')}>
                            <option value="">Seleccione...</option>
                            {ciudades.map((ciudad) => (
                                <option key={ciudad.id} value={ciudad.id}>{ciudad.nombre}</option>
                            ))}
                        </select>
                    </Campo>

                    <Campo etiqueta="Dirección" error={errorDe('direccion')}>
                        <input {...propiedades('direccion')} maxLength={LARGO_MAXIMO_DIRECCION} autoComplete="street-address" />
                    </Campo>
                </div>

                {aviso && <p className="aviso aviso-error">{aviso}</p>}

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
