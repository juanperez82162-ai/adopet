import { peticion } from '../../api/cliente.js';

// Lectura pública: solo valores activos, para llenar listas desplegables.
export function listarCatalogo(catalogo) {
    return peticion(`/catalogos/${catalogo}`);
}

export function listarRazas(idEspecie) {
    return peticion(`/catalogos/razas?especie=${idEspecie}`);
}

// ---- Administración (requiere permisos sobre CATALOGOS) -------------

export function listarDefiniciones() {
    return peticion('/catalogos');
}

// Cada catálogo se administra con las mismas cuatro operaciones.
// 'datos' es { nombre } o { nombre, descripcion } según el catálogo.
// Razas usa sus propias URLs porque depende de la especie.
export function operacionesDe(definicion, idEspecie) {
    if (definicion.dependeDeEspecie) {
        return {
            listar: () => peticion(`/catalogos/razas/admin?especie=${idEspecie}`),
            crear: (datos) => peticion('/catalogos/razas', { metodo: 'POST', cuerpo: { idEspecie, nombre: datos.nombre } }),
            modificar: (id, datos) => peticion(`/catalogos/razas/${id}`, { metodo: 'PUT', cuerpo: { nombre: datos.nombre } }),
            cambiarEstado: (id, activo) => peticion(`/catalogos/razas/${id}/estado`, { metodo: 'PATCH', cuerpo: { activo } })
        };
    }

    const base = `/catalogos/${definicion.clave}`;

    return {
        listar: () => peticion(`${base}/admin`),
        crear: (datos) => peticion(base, { metodo: 'POST', cuerpo: datos }),
        modificar: (id, datos) => peticion(`${base}/${id}`, { metodo: 'PUT', cuerpo: datos }),
        cambiarEstado: (id, activo) => peticion(`${base}/${id}/estado`, { metodo: 'PATCH', cuerpo: { activo } })
    };
}
