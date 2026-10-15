import { useEffect, useState } from 'react';
import { descargarImagen } from '../../../api/cliente.js';
import { IconoMascota } from '../../../componentes/Iconos.jsx';

// Las fotos no tienen URL pública: se piden a un endpoint con sesión. Una
// etiqueta <img> no puede mandar el token, así que se descargan con
// descargarImagen() y se muestran desde una URL local (blob).
// El caché guarda la URL por id para no pedir la misma foto dos veces.
const cache = new Map();

function cargar(idFoto) {
    if (!cache.has(idFoto)) {
        cache.set(
            idFoto,
            descargarImagen(`/mascotas/fotos/${idFoto}`)
                .then((blob) => URL.createObjectURL(blob))
                .catch((err) => {
                    cache.delete(idFoto);
                    throw err;
                })
        );
    }

    return cache.get(idFoto);
}

// idFoto vacío (la mascota aún no tiene fotos) o con error → ícono.
export function FotoMascota({ idFoto, alt, clase = '' }) {
    const [estado, setEstado] = useState({ id: null, url: null, fallo: false });

    useEffect(() => {
        if (!idFoto) {
            return undefined;
        }

        let vigente = true;

        cargar(idFoto)
            .then((url) => vigente && setEstado({ id: idFoto, url, fallo: false }))
            .catch(() => vigente && setEstado({ id: idFoto, url: null, fallo: true }));

        return () => {
            vigente = false;
        };
    }, [idFoto]);

    const lista = estado.id === idFoto;

    if (!idFoto || (lista && estado.fallo)) {
        return (
            <div className={`mascotas-foto mascotas-foto-vacia ${clase}`} role="img" aria-label="Sin foto">
                <IconoMascota tamano={40} />
            </div>
        );
    }

    if (!lista) {
        return <div className={`mascotas-foto mascotas-foto-cargando ${clase}`} aria-hidden="true" />;
    }

    return <img className={`mascotas-foto ${clase}`} src={estado.url} alt={alt} />;
}
