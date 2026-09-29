# ADOPET

**Sistema de gestión, compatibilidad y seguimiento para la adopción de mascotas de la Fundación Bello Animal.**

![CI](https://github.com/juanperez82162-ai/adopet/actions/workflows/ci.yml/badge.svg)

Proyecto Pedagógico Integrador (PPI) · Politécnico Colombiano Jaime Isaza Cadavid · 2026-2
Docente: José Ignacio Botero · Integrantes: Juan Sebastián Pérez Morales y Valeria Piedrahita Arbeláez

📖 **Documentación completa en la [Wiki](https://github.com/juanperez82162-ai/adopet/wiki).**

## Qué hace

- **Compatibilidad:** el adoptante responde un cuestionario y el sistema calcula qué mascotas encajan con él.
- **Proceso controlado:** el staff formaliza cada adopción con plazos.
- **Seguimiento:** 3 meses de prueba con revisiones a los 3 días, 3 semanas y 3 meses, calificadas con un semáforo.

## Tecnologías

| Capa | Herramienta |
| --- | --- |
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Base de datos | Oracle XE 21c en Docker |
| Acceso a datos | node-oracledb (sin ORM) |
| Sesión | JWT + bcryptjs |
| Seguridad | helmet, CORS restringido y límite de intentos (express-rate-limit) |
| Migraciones | Flyway |
| Pruebas | node:test, corriendo en GitHub Actions |

## Estructura

```text
db/migration/     migraciones de la base de datos (V1, V2, ...)
backend/          API REST: un módulo por carpeta (routes, controller, service, repository)
backend/tests/    pruebas automáticas de las reglas de negocio
frontend/         aplicación web: una carpeta por módulo en src/features
```

¿Vas a crear un módulo nuevo? Parte de la plantilla `backend/src/modules/ejemplo` y `frontend/src/features/ejemplo`: los pasos están en [`LEEME.md`](backend/src/modules/ejemplo/LEEME.md).

## Cómo ejecutarlo

Requisitos: Docker Desktop, Node.js 24 y Flyway CLI.

```bash
# 1. Base de datos
docker start adopet-oracle
flyway -configFiles=db/flyway.conf migrate

# 2. Backend (copiar .env.example a .env y completarlo)
cd backend
npm install
npm run crear-admin   # solo la primera vez
npm run dev           # http://localhost:3000

# 3. Frontend, en otra terminal
cd frontend
npm install
npm run dev           # http://localhost:5173
```

## Pruebas

```bash
cd backend
npm test              # 34 pruebas, no necesitan Oracle
```

Las pruebas reemplazan el repositorio de cada módulo por funciones simuladas, así que corren sin base de datos. GitHub Actions las ejecuta en cada Pull Request hacia `main`, junto con el lint y el build del frontend: la insignia **CI** de arriba muestra el último resultado.

## Avance

| Módulo | Estado |
| --- | --- |
| Autenticación | ✅ Terminado |
| Catálogos | ✅ Terminado |
| Usuarios y Mi perfil | ✅ Terminado |
| Accesos | ✅ Terminado |
| Inicio con resumen según permisos | ✅ Terminado |
| Mascotas | 🔄 En curso |
| Solicitudes y match | ⏳ Pendiente |
| Proceso formal | ⏳ Pendiente |
| Seguimientos | ⏳ Pendiente |
| Notificaciones | ⏳ Pendiente |

El tablero con el detalle está en la pestaña **Projects**.
