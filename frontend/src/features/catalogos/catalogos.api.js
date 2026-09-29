import { peticion } from '../../api/cliente.js';

// Lectura pública: solo valores activos, para llenar listas desplegables.
export function listarCatalogo(catalogo) {
    return peticion(`/catalogos/${catalogo}`);
}
