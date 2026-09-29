import { useContext } from 'react';
import { SesionContexto } from '../contexto/sesionContexto.js';

export function useSesion() {
    const sesion = useContext(SesionContexto);

    if (!sesion) {
        throw new Error('useSesion debe usarse dentro de <SesionProvider>');
    }

    return sesion;
}
