import { FotoMascota } from './FotoMascota.jsx';

// ID fijo de ESTADOS_MASCOTA (sembrado en V2).
const EN_TRATAMIENTO = 2;

// La foto de la mascota. Si está en tratamiento, se ve en gris con una marca
// de agua que explica por qué todavía no se puede adoptar.
export function FotoConMarca({ mascota, idFoto, clase = '' }) {
    const enTratamiento = mascota.idEstadoMascota === EN_TRATAMIENTO && mascota.activo !== false;

    return (
        <div className={enTratamiento ? 'mascotas-marco mascotas-marco-tratamiento' : 'mascotas-marco'}>
            <FotoMascota idFoto={idFoto} alt={`Foto de ${mascota.nombre}`} clase={clase} />

            {enTratamiento && (
                <div className="mascotas-marca" role="note">
                    <span className="mascotas-marca-icono" aria-hidden="true">🐾</span>
                    <p className="mascotas-marca-titulo">Se está recuperando</p>
                    <p>Muy pronto podrá buscar un hogar</p>
                </div>
            )}
        </div>
    );
}
