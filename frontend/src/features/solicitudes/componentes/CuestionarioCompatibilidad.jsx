import { useEffect, useState } from 'react';
import { Ventana } from '../../../componentes/Ventana.jsx';
import { Campo } from '../../../componentes/Campo.jsx';
import { FotoMascota } from '../../mascotas/componentes/FotoMascota.jsx';
import { formatearEdad } from '../../mascotas/mascotas.formatos.js';
import { obtenerOpcionesCuestionario, recomendarMascotas } from '../solicitudes.api.js';

const INICIAL = {
    idTipoVivienda: '', tipoViviendaOtro: '',
    tieneEspacioExterior: '',
    idTiempoDisponible: '', tiempoDisponibleOtro: '',
    experienciaPrevia: '', experienciaObservaciones: '',
    dispuestoNecesidadesEspeciales: '',
    tieneNinosHogar: '',
    tieneOtrasMascotasHogar: '', otrasMascotasObservaciones: ''
};

const camposSiNo = [
    ['tieneEspacioExterior', '¿Tu vivienda tiene espacio exterior (patio, terraza, jardín)?'],
    ['experienciaPrevia', '¿Has tenido mascotas antes?'],
    ['dispuestoNecesidadesEspeciales', '¿Estarías dispuesto a cuidar una mascota con necesidades especiales?'],
    ['tieneNinosHogar', '¿Hay niños en tu hogar?'],
    ['tieneOtrasMascotasHogar', '¿Tienes otras mascotas?']
];

// Cuestionario de compatibilidad (opcional). Muestra hasta 3 mascotas
// recomendadas; elegir una abre la misma confirmación que "Quiero
// adoptarla" del catálogo, llevando las respuestas.
export function CuestionarioCompatibilidad({ alElegir, alCerrar }) {
    const [opciones, setOpciones] = useState(null);
    const [errorCarga, setErrorCarga] = useState('');
    const [datos, setDatos] = useState(INICIAL);
    const [idEspecie, setIdEspecie] = useState('');
    const [errores, setErrores] = useState({});
    const [aviso, setAviso] = useState('');
    const [calculando, setCalculando] = useState(false);
    const [resultado, setResultado] = useState(null);

    useEffect(() => {
        let vigente = true;

        obtenerOpcionesCuestionario()
            .then((o) => vigente && setOpciones(o))
            .catch((err) => vigente && setErrorCarga(err.message));

        return () => {
            vigente = false;
        };
    }, []);

    function cambiar(campo, valor) {
        setDatos((anterior) => ({ ...anterior, [campo]: valor }));
        setErrores((anterior) => ({ ...anterior, [campo]: undefined }));
    }

    const vivienda = opciones?.tiposVivienda.find((o) => String(o.id) === datos.idTipoVivienda);
    const tiempo = opciones?.tiemposDisponibles.find((o) => String(o.id) === datos.idTiempoDisponible);

    // Revisa lo que se puede revisar sin el servidor; el servidor tiene la última palabra.
    function validar() {
        const e = {};
        if (!datos.idTipoVivienda) e.idTipoVivienda = 'Elige el tipo de vivienda.';
        if (!datos.idTiempoDisponible) e.idTiempoDisponible = 'Elige el tiempo que puedes dedicarle.';
        if (vivienda?.esOtro && !datos.tipoViviendaOtro.trim()) e.tipoViviendaOtro = 'Cuéntanos cuál es.';
        if (tiempo?.esOtro && !datos.tiempoDisponibleOtro.trim()) e.tiempoDisponibleOtro = 'Cuéntanos cuánto tiempo.';
        for (const [campo] of camposSiNo) {
            if (datos[campo] === '') e[campo] = 'Elige una respuesta.';
        }
        return e;
    }

    function armarCuestionario() {
        const siNo = (v) => v === 'S';

        return {
            idTipoVivienda: Number(datos.idTipoVivienda),
            tipoViviendaOtro: vivienda?.esOtro ? datos.tipoViviendaOtro.trim() : undefined,
            tieneEspacioExterior: siNo(datos.tieneEspacioExterior),
            idTiempoDisponible: Number(datos.idTiempoDisponible),
            tiempoDisponibleOtro: tiempo?.esOtro ? datos.tiempoDisponibleOtro.trim() : undefined,
            experienciaPrevia: siNo(datos.experienciaPrevia),
            experienciaObservaciones: datos.experienciaPrevia === 'S' ? datos.experienciaObservaciones.trim() || undefined : undefined,
            dispuestoNecesidadesEspeciales: siNo(datos.dispuestoNecesidadesEspeciales),
            tieneNinosHogar: siNo(datos.tieneNinosHogar),
            tieneOtrasMascotasHogar: siNo(datos.tieneOtrasMascotasHogar),
            otrasMascotasObservaciones: datos.tieneOtrasMascotasHogar === 'S' ? datos.otrasMascotasObservaciones.trim() || undefined : undefined
        };
    }

    async function enviar(evento) {
        evento.preventDefault();
        setAviso('');

        const encontrados = validar();
        setErrores(encontrados);

        if (Object.keys(encontrados).length > 0) {
            setAviso('Responde todas las preguntas para ver tus recomendaciones.');
            return;
        }

        setCalculando(true);

        try {
            const cuestionario = armarCuestionario();
            const respuesta = await recomendarMascotas(cuestionario, idEspecie);
            setResultado({ ...respuesta, cuestionario });
        } catch (err) {
            if (err.detalles) setErrores(err.detalles);
            setAviso(err.message);
        } finally {
            setCalculando(false);
        }
    }

    const selectSiNo = (campo) => (
        <select value={datos[campo]} onChange={(e) => cambiar(campo, e.target.value)}>
            <option value="">Elige...</option>
            <option value="S">Sí</option>
            <option value="N">No</option>
        </select>
    );

    return (
        <Ventana titulo="Cuestionario de compatibilidad" alCerrar={alCerrar}>
            {errorCarga && <p className="aviso aviso-error">{errorCarga}</p>}
            {!opciones && !errorCarga && <p className="mensaje-carga">Cargando...</p>}

            {opciones && resultado && (
                <div>
                    {resultado.recomendadas.length === 0 ? (
                        <>
                            <p className="aviso">
                                Por ahora ninguna mascota encaja lo suficiente con tus respuestas. Puedes
                                cambiarlas o explorar el catálogo completo: ¡quizá alguien te robe el corazón!
                            </p>
                        </>
                    ) : (
                        <>
                            <p>Estas son las mascotas que mejor encajan con tu hogar:</p>
                            <ul className="solicitudes-recomendadas">
                                {resultado.recomendadas.map((m) => (
                                    <li key={m.id} className="solicitudes-recomendada">
                                        <FotoMascota idFoto={m.idFotoPrincipal} alt={`Foto de ${m.nombre}`} clase="solicitudes-foto" />
                                        <div className="solicitudes-recomendada-datos">
                                            <h3>{m.nombre}</h3>
                                            <p className="texto-suave">{m.especie} · {m.raza}</p>
                                            <p>{formatearEdad(m.edadActualMeses)} · {m.sexo} · {m.tamanio}</p>
                                            <span className="insignia">{m.puntaje}% de compatibilidad</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="boton boton-pequeno"
                                            onClick={() => alElegir(m, resultado.cuestionario)}
                                        >
                                            Quiero adoptarla
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    <div className="ventana-botones">
                        <button type="button" className="boton boton-secundario" onClick={() => setResultado(null)}>
                            Cambiar mis respuestas
                        </button>
                        <button type="button" className="boton boton-secundario" onClick={alCerrar}>
                            Ver el catálogo
                        </button>
                    </div>
                </div>
            )}

            {opciones && !resultado && (
                <form onSubmit={enviar} noValidate className="solicitudes-formulario">
                    <p className="texto-suave">
                        ¿No sabes cuál peludito elegir? Responde estas preguntas y te mostraremos las mascotas
                        que mejor encajan contigo. Es opcional: siempre puedes elegir directamente del catálogo.
                    </p>

                    <Campo etiqueta="¿En qué tipo de vivienda vives?" error={errores.idTipoVivienda}>
                        <select value={datos.idTipoVivienda} onChange={(e) => cambiar('idTipoVivienda', e.target.value)}>
                            <option value="">Elige...</option>
                            {opciones.tiposVivienda.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                        </select>
                    </Campo>

                    {vivienda?.esOtro && (
                        <Campo etiqueta="¿Cuál?" error={errores.tipoViviendaOtro}>
                            <input
                                type="text" value={datos.tipoViviendaOtro} maxLength={opciones.largos.otro}
                                onChange={(e) => cambiar('tipoViviendaOtro', e.target.value)}
                            />
                        </Campo>
                    )}

                    <Campo etiqueta="¿Cuánto tiempo puedes dedicarle cada día?" error={errores.idTiempoDisponible}>
                        <select value={datos.idTiempoDisponible} onChange={(e) => cambiar('idTiempoDisponible', e.target.value)}>
                            <option value="">Elige...</option>
                            {opciones.tiemposDisponibles.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                        </select>
                    </Campo>

                    {tiempo?.esOtro && (
                        <Campo etiqueta="¿Cuánto tiempo?" error={errores.tiempoDisponibleOtro}>
                            <input
                                type="text" value={datos.tiempoDisponibleOtro} maxLength={opciones.largos.otro}
                                onChange={(e) => cambiar('tiempoDisponibleOtro', e.target.value)}
                            />
                        </Campo>
                    )}

                    {camposSiNo.map(([campo, pregunta]) => (
                        <div key={campo}>
                            <Campo etiqueta={pregunta} error={errores[campo]}>
                                {selectSiNo(campo)}
                            </Campo>

                            {campo === 'experienciaPrevia' && datos.experienciaPrevia === 'S' && (
                                <Campo etiqueta="Cuéntanos de tu experiencia" opcional error={errores.experienciaObservaciones}>
                                    <input
                                        type="text" value={datos.experienciaObservaciones} maxLength={opciones.largos.observacion}
                                        onChange={(e) => cambiar('experienciaObservaciones', e.target.value)}
                                    />
                                </Campo>
                            )}

                            {campo === 'tieneOtrasMascotasHogar' && datos.tieneOtrasMascotasHogar === 'S' && (
                                <Campo etiqueta="¿Cuáles y cómo conviven?" opcional error={errores.otrasMascotasObservaciones}>
                                    <input
                                        type="text" value={datos.otrasMascotasObservaciones} maxLength={opciones.largos.observacion}
                                        onChange={(e) => cambiar('otrasMascotasObservaciones', e.target.value)}
                                    />
                                </Campo>
                            )}
                        </div>
                    ))}

                    <Campo etiqueta="¿Prefieres una especie en particular?" opcional>
                        <select value={idEspecie} onChange={(e) => setIdEspecie(e.target.value)}>
                            <option value="">Cualquiera</option>
                            {opciones.especies.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                        </select>
                    </Campo>

                    {aviso && <p className="aviso aviso-error" role="alert">{aviso}</p>}

                    <div className="ventana-botones">
                        <button type="button" className="boton boton-secundario" onClick={alCerrar}>Cancelar</button>
                        <button type="submit" className="boton" disabled={calculando}>
                            {calculando ? 'Buscando...' : 'Ver mis recomendaciones'}
                        </button>
                    </div>
                </form>
            )}
        </Ventana>
    );
}
