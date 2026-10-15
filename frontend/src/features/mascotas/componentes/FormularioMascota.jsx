import { useEffect, useRef, useState } from 'react';
import { useFormulario, enfocarPrimerError } from '../../../hooks/useFormulario.js';
import { Campo } from '../../../componentes/Campo.jsx';
import { listarCatalogo, listarRazas } from '../../catalogos/catalogos.api.js';
import { crearMascota, modificarMascota } from '../mascotas.api.js';
import {
    validarMascota,
    aCuerpoMascota,
    LARGO_MAXIMO_NOMBRE,
    LARGO_MAXIMO_NECESIDADES
} from '../mascotas.validaciones.js';
import { FotosMascota } from './FotosMascota.jsx';

// Los valores del formulario son SIEMPRE texto (un input no acepta null).
function aFormulario(mascota, estados) {
    const meses = mascota?.edadMesesIngreso ?? 0;
    const estadoEditable = !mascota || estados.some((e) => e.id === mascota.idEstadoMascota);

    return {
        nombre: mascota?.nombre ?? '',
        idEspecie: mascota ? String(mascota.idEspecie) : '',
        idRaza: mascota ? String(mascota.idRaza) : '',
        idSexo: mascota ? String(mascota.idSexo) : '',
        idTamanio: mascota ? String(mascota.idTamanio) : '',
        idNivelEnergia: mascota ? String(mascota.idNivelEnergia) : '',
        edadAnios: mascota ? String(Math.floor(meses / 12)) : '',
        edadMeses: mascota ? String(meses % 12) : '',
        compatibleNinos: mascota ? (mascota.compatibleNinos ? 'S' : 'N') : '',
        compatibleOtrasMascotas: mascota ? (mascota.compatibleOtrasMascotas ? 'S' : 'N') : '',
        tieneNecesidadesEspeciales: mascota ? (mascota.tieneNecesidadesEspeciales ? 'S' : 'N') : '',
        descripcionNecesidades: mascota?.descripcionNecesidades ?? '',
        // Si el sistema maneja el estado, no se envía: el backend lo conserva.
        idEstadoMascota: !estadoEditable ? '' : String(mascota?.idEstadoMascota ?? estados[0]?.id ?? '')
    };
}

// Carga los catálogos y, cuando están, muestra el formulario.
export function FormularioMascota({ estados, ...resto }) {
    const [catalogos, setCatalogos] = useState(null);
    const [errorCarga, setErrorCarga] = useState('');

    useEffect(() => {
        let vigente = true;

        Promise.all([
            listarCatalogo('especies'),
            listarCatalogo('sexos'),
            listarCatalogo('tamanios'),
            listarCatalogo('niveles-energia')
        ])
            .then(([especies, sexos, tamanios, niveles]) => {
                if (vigente) setCatalogos({ especies, sexos, tamanios, niveles });
            })
            .catch((err) => vigente && setErrorCarga(err.message));

        return () => {
            vigente = false;
        };
    }, []);

    if (errorCarga) {
        return <p className="aviso aviso-error">{errorCarga}</p>;
    }

    if (!catalogos) {
        return <p className="tarjeta mensaje-carga">Cargando...</p>;
    }

    return <CuerpoFormulario catalogos={catalogos} estados={estados} {...resto} />;
}

// Formulario para crear (mascota = null) o modificar (mascota = ficha).
// alGuardar(mascota, esNuevo) avisa a la página; alCambiar(mascota) avisa
// cuando solo cambiaron las fotos.
function CuerpoFormulario({ catalogos, estados, mascota, alGuardar, alCambiar, alCancelar }) {
    const formulario = useFormulario(aFormulario(mascota, estados), validarMascota);
    const { propiedades, errorDe, datos } = formulario;
    const referencia = useRef(null);

    const [aviso, setAviso] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [razasCargadas, setRazasCargadas] = useState({ idEspecie: '', lista: [] });

    const esNuevo = !mascota;
    const estadoEditable = esNuevo || estados.some((e) => e.id === mascota.idEstadoMascota);

    // Las razas dependen de la especie elegida.
    useEffect(() => {
        if (!datos.idEspecie) {
            return undefined;
        }

        let vigente = true;

        listarRazas(datos.idEspecie)
            .then((lista) => vigente && setRazasCargadas({ idEspecie: datos.idEspecie, lista }))
            .catch((err) => vigente && setAviso(err.message));

        return () => {
            vigente = false;
        };
    }, [datos.idEspecie]);

    const razas = razasCargadas.idEspecie === datos.idEspecie ? razasCargadas.lista : [];

    // Al cambiar de especie, la raza anterior ya no vale.
    function alCambiarEspecie(evento) {
        propiedades('idEspecie').onChange(evento);
        propiedades('idRaza').onChange({ target: { name: 'idRaza', value: '' } });
    }

    async function enviar(evento) {
        evento.preventDefault();
        formulario.marcarIntento();
        setAviso('');

        if (formulario.hayErrores) {
            enfocarPrimerError(referencia.current);
            return;
        }

        setGuardando(true);

        try {
            const cuerpo = aCuerpoMascota(datos);
            const guardada = esNuevo
                ? await crearMascota(cuerpo)
                : await modificarMascota(mascota.id, cuerpo);

            alGuardar(guardada, esNuevo);
        } catch (err) {
            if (err.detalles) {
                // La edad viaja en meses; en pantalla son dos campos.
                const detalles = { ...err.detalles };
                if (detalles.edadMesesIngreso) detalles.edadAnios = detalles.edadMesesIngreso;
                formulario.marcarErroresServidor(detalles);
                enfocarPrimerError(referencia.current);
            } else {
                setAviso(err.message);
            }
        } finally {
            setGuardando(false);
        }
    }

    const opciones = (lista) => lista.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>);

    return (
        <>
            <form
                ref={referencia}
                className="tarjeta formulario formulario-ancho mascotas-formulario"
                onSubmit={enviar}
                noValidate
            >
                <h2>{esNuevo ? 'Nueva mascota' : `Editar a ${mascota.nombre}`}</h2>

                <Campo etiqueta="Nombre" error={errorDe('nombre')}>
                    <input {...propiedades('nombre')} maxLength={LARGO_MAXIMO_NOMBRE} />
                </Campo>

                <div className="mascotas-fila">
                    <Campo etiqueta="Especie" error={errorDe('idEspecie')}>
                        <select {...propiedades('idEspecie')} onChange={alCambiarEspecie}>
                            <option value="">Seleccione...</option>
                            {opciones(catalogos.especies)}
                        </select>
                    </Campo>

                    <Campo etiqueta="Raza" error={errorDe('idRaza')}>
                        <select {...propiedades('idRaza')} disabled={!datos.idEspecie}>
                            <option value="">{datos.idEspecie ? 'Seleccione...' : 'Primero elige la especie'}</option>
                            {opciones(razas)}
                        </select>
                    </Campo>
                </div>

                <div className="mascotas-fila">
                    <Campo etiqueta="Sexo" error={errorDe('idSexo')}>
                        <select {...propiedades('idSexo')}>
                            <option value="">Seleccione...</option>
                            {opciones(catalogos.sexos)}
                        </select>
                    </Campo>

                    <Campo etiqueta="Tamaño" error={errorDe('idTamanio')}>
                        <select {...propiedades('idTamanio')}>
                            <option value="">Seleccione...</option>
                            {opciones(catalogos.tamanios)}
                        </select>
                    </Campo>

                    <Campo etiqueta="Nivel de energía" error={errorDe('idNivelEnergia')}>
                        <select {...propiedades('idNivelEnergia')}>
                            <option value="">Seleccione...</option>
                            {opciones(catalogos.niveles)}
                        </select>
                    </Campo>
                </div>

                <div className="mascotas-fila">
                    <Campo
                        etiqueta="Edad al ingresar: años"
                        error={errorDe('edadAnios')}
                        ayuda="La edad de hoy se calcula sola a partir de la fecha de ingreso."
                    >
                        <input {...propiedades('edadAnios')} inputMode="numeric" maxLength={2} placeholder="0" />
                    </Campo>

                    <Campo etiqueta="Edad al ingresar: meses (0 a 11)" error={errorDe('edadMeses')}>
                        <input {...propiedades('edadMeses')} inputMode="numeric" maxLength={2} placeholder="0" />
                    </Campo>
                </div>

                <div className="mascotas-fila">
                    <Campo etiqueta="Compatible con niños" error={errorDe('compatibleNinos')}>
                        <select {...propiedades('compatibleNinos')}>
                            <option value="">Seleccione...</option>
                            <option value="S">Sí</option>
                            <option value="N">No</option>
                        </select>
                    </Campo>

                    <Campo etiqueta="Compatible con otras mascotas" error={errorDe('compatibleOtrasMascotas')}>
                        <select {...propiedades('compatibleOtrasMascotas')}>
                            <option value="">Seleccione...</option>
                            <option value="S">Sí</option>
                            <option value="N">No</option>
                        </select>
                    </Campo>

                    <Campo etiqueta="Necesidades especiales" error={errorDe('tieneNecesidadesEspeciales')}>
                        <select {...propiedades('tieneNecesidadesEspeciales')}>
                            <option value="">Seleccione...</option>
                            <option value="S">Sí</option>
                            <option value="N">No</option>
                        </select>
                    </Campo>
                </div>

                {datos.tieneNecesidadesEspeciales === 'S' && (
                    <Campo etiqueta="Describe las necesidades" opcional error={errorDe('descripcionNecesidades')}>
                        <textarea
                            {...propiedades('descripcionNecesidades')}
                            maxLength={LARGO_MAXIMO_NECESIDADES}
                            rows={3}
                        />
                    </Campo>
                )}

                {estadoEditable ? (
                    <Campo etiqueta="Estado" error={errorDe('idEstadoMascota')}>
                        <select {...propiedades('idEstadoMascota')}>
                            {opciones(estados)}
                        </select>
                    </Campo>
                ) : (
                    <Campo etiqueta="Estado" ayuda="Lo maneja el proceso de adopción y no se cambia a mano.">
                        <input value={mascota.estado} disabled readOnly />
                    </Campo>
                )}

                {aviso && <p className="aviso aviso-error">{aviso}</p>}

                <div className="mascotas-botones">
                    <button type="submit" className="boton" disabled={guardando}>
                        {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button type="button" className="boton boton-secundario" onClick={alCancelar} disabled={guardando}>
                        {esNuevo ? 'Cancelar' : 'Cerrar'}
                    </button>
                </div>
            </form>

            {esNuevo ? (
                <p className="texto-suave mascotas-nota-fotos">
                    Podrás agregar las fotos justo después de guardar la mascota.
                </p>
            ) : (
                <div className="tarjeta mascotas-formulario">
                    <FotosMascota mascota={mascota} alCambiar={alCambiar} />
                </div>
            )}
        </>
    );
}
