import { createContext } from 'react';

// El contexto vive en su propio archivo para que SesionContext.jsx
// exporte solo el componente (requisito de la recarga en caliente de Vite).
export const SesionContexto = createContext(null);
