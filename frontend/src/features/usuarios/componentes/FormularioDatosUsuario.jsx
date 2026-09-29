import { useRef, useState } from 'react';
import { useFormulario, enfocarPrimerError } from '../../../hooks/useFormulario.js';
import { Campo } from '../../../componentes/Campo.jsx';
import {
    validarDatosPerfil,
    LARGO_MAXIMO_NOMBRE,
    LARGO_MAXIMO_CORREO,
    LARGO_MAXIMO_DIRECCION
} from '../../auth/validaciones.js';

const CAMPOS_EDITABLES = [
    'primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido',
    'correo', 'telefono', 'idCiudad', 'direccion'
];

// Toma del usuario solo lo que el formulario edita (la ciudad como texto, para el <select>).
function aFormulario(usuario) {
    const valores = Object.fromEntries(CAMPOS_EDITABLES.map((campo) => [campo, usuario[campo] ?? '']));
    valores.idCiudad = String(usuario.idCiudad);
    return valores;
}

function aFechaLegible(fecha) {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
}

// Formulario de los datos editables de un usuario. Lo usan Mi perfil
// (cada quien lo suyo) y Usuarios (el Admin edita a otros).
// guardar(datos) hace la petición y devuelve el usuario actualizado.
export function FormularioDatosUsuario({ usuario, ciudades, puedeModificar, guardar, titulo = 'Datos' }) {
    const formulario = useFormulario(aFormulario(usuario), validarDatosPerfil);
    const { datos, propiedades, errorDe } = formulario;
    const referencia = useRef(null);

    const [aviso, setAviso] = useState(null);
    const [guardando, setGuardando] = useState(false);

    async function enviar(evento) {
        evento.preventDefault();
        formulario.marcarIntento();
        setAviso(null);

        if (formulario.hayErrores) {
            setAviso({ tipo: 'error', texto: 'Revisa los campos marcados en rojo.' });
            enfocarPrimerError(referencia.current);
            return;
        }

        setGuardando(true);

        try {
            const actualizado = await guardar({ ...datos, idCiudad: Number(datos.idCiudad) });
            formulario.reiniciar(aFormulario(actualizado));
            setAviso({ tipo: 'exito', texto: 'Los datos se guardaron.' });
        } catch (err) {
            if (err.detalles) {
                formulario.marcarErroresServidor(err.detalles);
                enfocarPrimerError(referencia.current);
            }

            setAviso({ tipo: 'error', texto: err.detalles ? 'Revisa los campos marcados en rojo.' : err.message });
        } finally {
            setGuardando(false);
        }
    }

    return (
        <form ref={referencia} className="tarjeta formulario" onSubmit={enviar} noValidate>
            <h2>{titulo}</h2>

            <dl className="datos-fijos">
                <div>
                    <dt>Documento</dt>
                    <dd>{usuario.tipoDocumento} {usuario.documento}</dd>
                </div>
                <div>
                    <dt>Fecha de nacimiento</dt>
                    <dd>{aFechaLegible(usuario.fechaNacimiento)}</dd>
                </div>
                <div>
                    <dt>Registrado el</dt>
                    <dd>{aFechaLegible(usuario.fechaRegistro)}</dd>
                </div>
            </dl>
            <small className="campo-ayuda">
                El documento y la fecha de nacimiento no se pueden cambiar.
            </small>

            <fieldset className="grupo-campos" disabled={!puedeModificar || guardando}>
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

                <div className="fila">
                    <Campo etiqueta="Correo" error={errorDe('correo')} ayuda="Con este correo inicias sesión.">
                        <input type="email" {...propiedades('correo')} maxLength={LARGO_MAXIMO_CORREO} autoComplete="email" />
                    </Campo>

                    <Campo etiqueta="Teléfono" error={errorDe('telefono')} ayuda="Celular o fijo de 10 dígitos.">
                        <input type="tel" {...propiedades('telefono')} inputMode="tel" maxLength={16} autoComplete="tel" />
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
            </fieldset>

            {aviso && <p className={`aviso aviso-${aviso.tipo}`}>{aviso.texto}</p>}

            {puedeModificar && (
                <button type="submit" className="boton" disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
            )}
        </form>
    );
}
