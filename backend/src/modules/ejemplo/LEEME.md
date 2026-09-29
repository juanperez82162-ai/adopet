# Módulo de ejemplo: cómo crear un módulo nuevo

Esta carpeta y `frontend/src/features/ejemplo/` son una **plantilla**. No están
conectadas a la aplicación: no aparecen en `app.js` ni en `Rutas.jsx`, así que
nunca se ejecutan. La tabla `EJEMPLOS` no existe.

Cada archivo explica qué hace su capa. Lo que hay que cambiar está marcado con
`CAMBIA ESTO`.

## Qué trae

| Capa | Archivo | Responsabilidad |
|---|---|---|
| Rutas | `ejemplo.routes.js` | URL → función, y el permiso que exige cada una |
| Controller | `ejemplo.controller.js` | Saca los datos de la petición y responde |
| Service | `ejemplo.service.js` | Validaciones y reglas de negocio |
| Repository | `ejemplo.repository.js` | El SQL, y solo el SQL |
| API (front) | `ejemplo.api.js` | Llamadas al backend |
| Validaciones (front) | `ejemplo.validaciones.js` | Copia de las reglas, para avisar en vivo |
| Página (front) | `paginas/Ejemplos.jsx` | Lista con filtros, permisos y estados vacíos |
| Formulario (front) | `componentes/FormularioEjemplo.jsx` | Crear y editar con `useFormulario` |
| Estilos (front) | `ejemplo.css` | Solo lo propio del módulo |

## Pasos para crear un módulo (ejemplo: `mascotas`)

1. **Crea tu rama:** `git switch -c modulo-mascotas`.
2. **Copia las dos carpetas** con el nuevo nombre:
   - `backend/src/modules/ejemplo` → `backend/src/modules/mascotas`
   - `frontend/src/features/ejemplo` → `frontend/src/features/mascotas`
3. **Renombra los archivos:** `ejemplo.*.js` → `mascotas.*.js`, `Ejemplos.jsx` →
   `Mascotas.jsx`, `FormularioEjemplo.jsx` → `FormularioMascota.jsx`, y
   `ejemplo.css` → `mascotas.css`. Borra este `LEEME.md` de la copia.
4. **Busca `CAMBIA ESTO`** en las dos carpetas y ajusta cada punto: la opción
   del menú (`MASCOTAS`), la ruta base (`/mascotas`), la tabla y sus columnas,
   los límites, los campos del formulario y el prefijo del CSS.
5. **Actualiza los imports** que apuntan a los archivos renombrados. `npm run lint`
   en `frontend` y `node --check` en `backend` avisan si quedó alguno mal.
6. **Registra el backend** en `backend/src/app.js` (una sola línea de `import` y
   una de `app.use`):
   ```js
   import { mascotasRoutes } from './modules/mascotas/mascotas.routes.js';
   app.use('/api/mascotas', mascotasRoutes);
   ```
7. **Registra el frontend** en `frontend/src/rutas/Rutas.jsx`. La ruta debe ser
   la misma de `OPCIONES_MENU.RUTA`:
   ```jsx
   <Route
       path="/mascotas"
       element={<RequiereModulo opcion="MASCOTAS"><Mascotas /></RequiereModulo>}
   />
   ```
8. **¿Necesitas cambiar la base?** Avisa **antes** de crear la migración: la
   siguiente libre es la `V9`, y una migración aplicada no se edita nunca.

## Reglas que no se rompen

- El SQL vive **solo** en `.repository.js`, y siempre con bind variables (`:valor`).
- Las reglas de negocio viven **solo** en `.service.js`.
- Un service puede llamar a otro service, **nunca** al repository de otro módulo.
- Las conexiones se piden con `conConexion` o `enTransaccion`, nunca a mano.
- Nada se borra: se desactiva con `ACTIVO = 'N'` (acción `ELIMINAR`).
- Ocultar un botón es experiencia de usuario. La seguridad es `autorizar()`.
