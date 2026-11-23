# npf-web-core-manager

Interfaz web SPA para **NP Factory (`npf`)**, enfocada en el monitoreo y gestión de proyectos multi-repositorio, historias de usuario transversales (`Story 1:N Change`), bandeja de preguntas abiertas y visualización de especificaciones **OpenSpec** y dependencias de datos.

---

## Stack Tecnológico

- **Framework**: React 18 + TypeScript + Vite (`vite.config.ts`)
- **Estilos e Iconos**: TailwindCSS + `lucide-react`
- **Estado y Caché HTTP**: `@tanstack/react-query` + `react-router-dom`
- **Visualización**: `@xyflow/react` (React Flow) para el grafo de dependencias de datos entre repositorios
- **Renderizado Markdown**: `react-markdown` + `remark-gfm`

---

## Vistas y Funcionalidades

| Ruta | Vista | Descripción |
| :--- | :--- | :--- |
| `/` | **Dashboard de Proyectos** | KPIs globales (preguntas pendientes, proyectos activos, estado de conexión), tarjetas de proyecto y creación de nuevos proyectos. |
| `/questions` | **Bandeja Global de Preguntas** | Listado y respuesta asíncrona de preguntas abiertas formuladas durante la planificación OpenSpec. |
| `/projects/:projectKey` | **Tablero Kanban** | Columnas de historias (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`), filtros por épica/repositorio/búsqueda, tarjetas compactas por excepción y drawer de detalle (`StoryDetailSheet`: tareas, visor de artefactos OpenSpec en solo lectura, preguntas y bitácora). |
| `/projects/:projectKey/changes` | **Changes y Repositorios** | Tres sub-pestañas: **Catálogo de Changes** (agrupación en historias), **Mapa de Repositorios** (tabla de inventario y `specs_count`) y **Grafo de Datos** (grafo interactivo con React Flow, nodos escalados por specs vigentes, color por `repo_type`, grosor por endpoints y mapeo de alias para claves `UNRESOLVED`). |

---

## Estructura del Proyecto

```text
npf-web-core-manager/
├── src/
│   ├── components/
│   │   ├── layout/          # Header y navegación principal
│   │   └── ui/              # Componentes base (badge, button, card, dialog, input, sheet)
│   ├── hooks/               # Queries y mutaciones de TanStack Query
│   ├── modules/
│   │   ├── board/           # BoardKanbanView, BoardStoryCard, BoardFilterToolbar
│   │   ├── changes/         # UngroupedChangesTable, GroupIntoStoryDialog
│   │   ├── openspec/        # Grafo de artefactos y visor de solo lectura
│   │   ├── projects/        # ProjectDashboardCard, ProjectRepositoryMatrix, ProjectRepositoryGraph
│   │   ├── questions/       # QuestionInboxList, QuestionInteractiveCard, QuestionAnswerForm
│   │   └── stories/         # StoryDetailSheet, StoryTaskReadOnlyList, StoryActivityTimeline
│   ├── services/            # apiClient y servicios REST (projects, stories, changes, questions)
│   ├── types/               # Definiciones TypeScript del dominio
│   ├── App.tsx              # Rutas y contenedores principales
│   └── main.tsx
├── Dockerfile
├── nginx.conf
├── package.json
└── vite.config.ts
```

---

## Variables de Entorno y Configuración de la API

El cliente HTTP (`src/services/apiClient.ts`) resuelve la URL base de `npf-svc-core-manager` en el siguiente orden de prioridad:

1. **Runtime en contenedor (`window.__NPF_CONFIG__.API_URL` / `BACKEND_URL`)**: generada automáticamente al iniciar el contenedor Docker en `/usr/share/nginx/html/env-config.js` por `/docker-entrypoint.d/40-generate-env-config.sh`.
2. **Build / Vite (`VITE_NPF_CORE_MANAGER_API_URL`)**: leída en tiempo de compilación o desarrollo local (`npm run dev`).
3. **Fallback automático**: `http://<window.location.hostname>:8010/api/v1`.

*(En todos los casos, `normalizeApiUrl` añade `/api/v1` automáticamente si pasas solo la URL raíz o `/api`.)*

### Referencia de Variables

| Variable | Ámbito | Valor por Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `VITE_NPF_CORE_MANAGER_API_URL` | Desarrollo local (`Vite`) / Build / Fallback en Docker | *(vacía en Docker)* · `.env.example`: `http://127.0.0.1:8000/api/v1` | URL base del backend usada por Vite en `npm run dev` y como segundo fallback al generar `env-config.js` en Docker. |
| `NPF_CORE_MANAGER_API_URL` | Runtime Docker | *(vacía)* | Override prioritario en tiempo de ejecución para `window.__NPF_CONFIG__.API_URL` en `env-config.js`. |
| `NPF_BACKEND_URL` | Runtime Docker + Nginx | `http://192.168.31.30:8010` (`.env.example`: `http://svc-core-manager:8000`) | Upstream usado por `nginx.conf` en `location /api/` (`proxy_pass`) y fallback final para `env-config.js` si no se definen las anteriores. |
| `NGINX_ENVSUBST_FILTER` | Runtime Docker (Nginx) | `^NPF_` | Filtro para `envsubst` al procesar `/etc/nginx/templates/default.conf.template` al arrancar Nginx. |

### Ejemplo para Desarrollo Local (`.env`)

```powershell
Copy-Item .env.example .env
```

```dotenv
# .env (para npm run dev contra backend local en el puerto 8000 u 8010)
VITE_NPF_CORE_MANAGER_API_URL=http://127.0.0.1:8000/api/v1
```

### Ejemplo en Docker

```sh
docker run -d -p 8080:80 \
  -e NPF_BACKEND_URL=http://svc-core-manager:8000 \
  -e NPF_CORE_MANAGER_API_URL=http://localhost:8010/api/v1 \
  npf-web-core-manager:latest
```

---

## Desarrollo Local y Build

```powershell
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (http://127.0.0.1:5173)
npm run dev

# Compilar TypeScript y generar bundle de producción (dist/)
npm run build

# Previsualizar el build de producción
npm run preview
```
