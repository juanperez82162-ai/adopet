import { useEffect, useState } from 'react';
import { obtenerMascota } from '../mascotas.api.js';
import { aSiNo, formatearEdad, formatearFecha } from '../mascotas.formatos.js';
import { FotoMascota } from './FotoMascota.jsx';
import { FotoConMarca } from './FotoConMarca.jsx';

// Ficha completa de una mascota: todas sus fotos y todos sus datos.
// El adoptante ve lo mismo que el staff, menos los datos internos del
// albergue (el backend ya no se los manda).
export function FichaMascota({ mascota, alCerrar, alAdoptar }) {
    const [carga, setCarga] = useState({ id: null, datos: null, error: '' });
    const [fotoElegida, setFotoElegida] = useState(null);

    useEffect(() => {
        let vigente = true;

        obtenerMascota(mascota.id)
            .then((datos) => vigente && setCarga({ id: mascota.id, datos, error: '' }))
            .catch((err) => vigente && setCarga({ id: mascota.id, datos: null, error: err.message }));

        return () => {
            vigente = false;
        };
    }, [mascota.id]);

    const lista = carga.id === mascota.id;
    const m = (lista && carga.datos) || mascota;
    const fotos = (lista && carga.datos?.fotos) || [];
    const idFotoGrande = fotoElegida ?? m.idFotoPrincipal;
    const interno = m.observacionesEstado !== undefined; // solo el staff lo recibe

    return (
        <article className="tarjeta mascotas-ficha" aria-label={`Ficha de ${m.nombre}`}>
            <div className="mascotas-ficha-fotos">
                <FotoConMarca mascota={m} idFoto={idFotoGrande} clase="mascotas-foto-grande" />

                {fotos.length > 1 && (
                    <ul className="mascotas-fotos-lista">
                        {fotos.map((foto) => (
                            <li key={foto.id}>
                                <button
                                    type="button"
                                    className={foto.id === idFotoGrande ? 'mascotas-miniatura mascotas-miniatura-activa' : 'mascotas-miniatura'}
                                    onClick={() => setFotoElegida(foto.id)}
                                    aria-label="Ver esta foto"
                                >
                                    <FotoMascota idFoto={foto.id} alt="" clase="mascotas-foto-miniatura" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="mascotas-ficha-datos">
                <header>
                    <h2>{m.nombre}</h2>
                    <p className="texto-suave">{m.especie} · {m.raza}</p>
                    {!m.esAdoptable && <span className="insignia">{m.estado}</span>}
                </header>

                {carga.error && lista && <p className="aviso aviso-error">{carga.error}</p>}

                <dl className="datos-fijos">
                    <div><dt>Edad</dt><dd>{formatearEdad(m.edadActualMeses)}</dd></div>
                    <div><dt>Sexo</dt><dd>{m.sexo}</dd></div>
                    <div><dt>Tamaño</dt><dd>{m.tamanio}</dd></div>
                    <div><dt>Nivel de energía</dt><dd>{m.nivelEnergia}</dd></div>
                    <div><dt>Compatible con niños</dt><dd>{aSiNo(m.compatibleNinos)}</dd></div>
                    <div><dt>Compatible con otras mascotas</dt><dd>{aSiNo(m.compatibleOtrasMascotas)}</dd></div>
                    <div>
                        <dt>Necesidades especiales</dt>
                        <dd>{m.tieneNecesidadesEspeciales ? (m.descripcionNecesidades || 'Sí') : 'No'}</dd>
                    </div>
                    <div><dt>Estado</dt><dd>{m.estado}</dd></div>

                    {interno && (
                        <>
                            <div><dt>Fecha de ingreso</dt><dd>{formatearFecha(m.fechaIngreso)}</dd></div>
                            <div><dt>Edad al ingresar</dt><dd>{formatearEdad(m.edadMesesIngreso)}</dd></div>
                            <div><dt>En el albergue</dt><dd>{m.activo ? 'Sí' : 'No'}</dd></div>
                            {!m.activo && <div><dt>Fecha de salida</dt><dd>{formatearFecha(m.fechaSalida)}</dd></div>}
                            {m.observacionesEstado && <div><dt>Observaciones</dt><dd>{m.observacionesEstado}</dd></div>}
                        </>
                    )}
                </dl>

                {alAdoptar && m.esAdoptable && (
                    <button type="button" className="boton" onClick={() => alAdoptar(m)}>Quiero adoptarla</button>
                )}{' '}
                <button type="button" className="boton boton-secundario" onClick={alCerrar}>Cerrar</button>
            </div>
        </article>
    );
}
