# Librería Central — Monorepo Integrado y Despliegue (Evaluación Global)

> **Universidad Tecnológica Nacional (UTN) — Facultad Regional Mendoza (FRM)**  
> **Carrera**: Tecnicatura Universitaria en Programación (TUP)  
> **Cátedra**: Programación III  
> **Comisión**: 3  
> **Evaluación**: Global de Programación III — Integración y Despliegue  
> **Grupo**: LocalHost  
> **Integrantes**:
> - **Máximo Franco**
> - **Andrés Novello**
> - **Octavio Fiore**

---

## 1. Descripción de la Aplicación

**Librería Central** es una solución web integral compuesta por una interfaz de usuario SPA desarrollada en tecnologías web nativas (HTML5 semántico, CSS3 modular y JavaScript ES6+ sin frameworks) conectada directamente a una API REST construida con **FastAPI**, persistencia transaccional asincrónica en **PostgreSQL 16** mediante **SQLModel** / **SQLAlchemy** y migraciones automáticas versionadas con **Alembic**.

La aplicación cubre los cinco ejercicios obligatorios de la evaluación Global:
- **Ejercicio 1 · Catálogo y Cliente HTTP**: Conexión nativa con `fetch` bajo el prefijo `/api/`, búsqueda reactiva por título, paginación con `limit` y `offset`, autores vía `GET /libros/{id}`, y diferenciación de los 4 estados visuales (carga, lista vacía, sin coincidencias y error de conexión).
- **Ejercicio 2 · Alta de Libros y Clientes**: Carga dinámica de selectores relacionales (`GET /editoriales/` y `GET /generos/`), verificación individual de autorías (`GET /autores/{id}`) con roles y orden, alta de clientes (`POST /clientes/`), consulta individual (`GET /clientes/{id}`) y control de errores del servidor (`409 Conflict` ante ISBN/email duplicado y `422 Unprocessable Entity`).
- **Ejercicio 3 · Registrar y Consultar Ventas**: Composición de pedidos en borrador, validación estricta (mínimo un renglón, cantidades enteras positivas, no duplicidad de libros), confirmación con importes congelados de la API (`201 Created`), conservación del borrador ante rechazo (409 o 422), consulta de historial (`GET /ventas/`) y auditoría detallada de importes históricos inmutables (`GET /ventas/{id}`).
- **Ejercicio 4 · Dockerfile del Frontend**: Contenedor optimizado sobre `nginx:1.30-alpine` con sustitución de variables en tiempo de arranque (`NGINX_ENVSUBST_FILTER=^API_UPSTREAM$`), separación de archivos estáticos en `public/` y proxy inverso transparente de `/api/` hacia el backend.
- **Ejercicio 5 · Servicios en Easypanel**: Despliegue en VPS del backend en red interna privada con arranque autogestionado de migraciones (`alembic upgrade head && exec uvicorn ...`) y frontend expuesto públicamente bajo HTTPS con certificado SSL automático.

---

## 2. Estructura del Proyecto (Monorepo)

```text
libreria-monorepo/
├── .gitignore
├── README.md                      # Este documento (identificación, arquitectura y ejecución local)
├── DEPLOY.md                      # Bitácora oficial de despliegue en VPS / Easypanel y casos G-01 a G-07
├── compose.yaml                   # Orquestación Docker Compose (Postgres 16 + Backend + Frontend)
├── Consignas Global.pdf           # Enunciado oficial de la cátedra
├── evidencia/                     # Evidencia fotográfica y bitácoras de los casos de prueba G-01 a G-07
│   └── .gitkeep
│
├── frontend/
│   ├── Dockerfile                 # Imagen Nginx 1.30-alpine con envsubst
│   ├── .dockerignore
│   ├── default.conf.template      # Configuración del servidor web y proxy inverso (/api/ -> upstream)
│   └── public/                    # Archivos estáticos servidos en producción
│       ├── index.html             # Shell SPA accesible con las 5 secciones
│       ├── css/                   # Hojas de estilo modulares (base, layout, components, views)
│       ├── js/                    # JavaScript nativo modular
│       │   ├── api.js             # Cliente HTTP centralizado con fetch a /api/
│       │   ├── app.js             # Inicializador central de subsistemas
│       │   ├── router.js          # Enrutador accesible por hash (#catalogo, #libros, #clientes, #ventas, #historial)
│       │   ├── state.js           # Registro de estado y caché en memoria
│       │   ├── utils/             # Funciones puras de formateo y validación
│       │   └── views/             # Controladores de vista SPA
│       │       ├── catalogo.view.js
│       │       ├── libros.view.js
│       │       ├── clientes.view.js
│       │       ├── ventas.view.js
│       │       └── historial.view.js
│       └── assets/
│
└── backend/
    ├── Dockerfile                 # Imagen Python 3.12-slim con alembic upgrade head
    ├── .dockerignore
    ├── alembic.ini                # Configuración del gestor de migraciones
    ├── requirements.txt           # Dependencias de producción
    ├── env.example                # Plantilla de variables de entorno (DATABASE_URL, SQL_ECHO)
    ├── seed_db.py                 # Script de carga inicial de datos ficticios reproducibles
    ├── app/                       # Código fuente de la API FastAPI
    │   ├── main.py                # Fábrica create_app y ciclo de vida lifespan
    │   ├── core/                  # Base de datos asyncpg, excepciones y paginación
    │   └── modules/               # Módulos del dominio (libros, clientes, ventas, etc.)
    └── migrations/                # Versiones de migración de esquema en PostgreSQL
```

---

## 3. Instrucciones de Ejecución Local

### Opción 1: Ejecución Integral con Docker Compose (Recomendada)

Requiere tener instalado **Docker Desktop** (o Docker Engine con plugin Compose).

1. Clonar el repositorio y posicionarse en la raíz del monorepo:
   ```bash
   cd libreria-monorepo
   ```

2. Construir las imágenes y levantar los tres contenedores (`postgres`, `backend`, `frontend`):
   ```bash
   docker compose up --build -d
   ```

3. Cargar los datos ficticios iniciales en la base de datos (idempotente):
   ```bash
   docker exec -it libreria-backend python seed_db.py
   ```

4. Abrir la aplicación en el navegador:
   - **Frontend (SPA)**: `http://localhost:8080`
   - **Salud de la API vía Nginx**: `http://localhost:8080/api/health/ready` (debe responder `{"status":"ok", ...}`)
   - **Documentación Swagger de la API**: `http://localhost:8000/docs`

5. Para detener los contenedores:
   ```bash
   docker compose down
   ```

---

### Opción 2: Ejecución Manual / Híbrida

#### A. Backend (FastAPI + PostgreSQL)
1. Entrar al directorio `backend/`:
   ```bash
   cd backend
   ```
2. Crear y activar un entorno virtual:
   ```bash
   python -m venv .venv
   # En Windows:
   .venv\Scripts\activate
   # En Linux / macOS:
   source .venv/bin/activate
   ```
3. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Configurar el archivo `.env` a partir de `env.example`:
   ```bash
   cp env.example .env
   ```
   Ajustar `DATABASE_URL` con tu instancia de PostgreSQL local:
   ```env
   DATABASE_URL=postgresql+asyncpg://usuario:contraseña@localhost:5432/libreria_db
   SQL_ECHO=false
   ```
5. Aplicar migraciones e inicializar datos de prueba:
   ```bash
   alembic upgrade head
   python seed_db.py
   ```
6. Iniciar el servidor de desarrollo:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

#### B. Frontend con Contenedor Docker (según consigna pág. 5)
Desde el directorio `frontend/`:
```bash
docker build -t libreria-frontend .
# En Windows PowerShell (Docker Desktop):
docker run --rm --name libreria-frontend -p 127.0.0.1:8080:80 -e API_UPSTREAM=host.docker.internal:8000 libreria-frontend
```

---

## 4. Matriz de Casos de Prueba (G-01 a G-07)

Los 7 casos de verificación funcional exigidos por la cátedra son:

| Código | Caso | Procedimiento | Resultado Esperado |
|---|---|---|---|
| **G-01** | **Catálogo** | Buscar por título, navegar paginación con `limit` y `offset`, realizar búsqueda sin coincidencias y abrir detalle con autores. | Filtro case-insensitive funcional, estados visuales correctos (cargando, sin resultados, lista vacía), detalle con autores renderizado (`GET /libros/{id}`). |
| **G-02** | **Alta de libro** | Crear un libro con stock, editorial, género opcional y autorías verificadas. Consultar detalle. Repetir el ISBN. | Creación exitosa con 201; en el reintento el backend rechaza con 409 Conflict y la UI muestra el error sin perder el borrador. |
| **G-03** | **Alta de cliente** | Crear un cliente y recuperarlo por ID (`GET /clientes/{id}`). Repetir el email. | Creación con 201; en el segundo intento el backend devuelve 409 Conflict y la UI presenta el mensaje de error. |
| **G-04** | **Venta** | Armar y registrar venta válida de 2 renglones. Recargar la página e inspeccionar el historial. | Envío con 201; borrador se limpia tras éxito; el detalle histórico coincide exactamente con los importes devueltos por la API. |
| **G-05** | **Precio histórico** | Modificar el precio de un libro vendido con `PATCH /api/libros/{id}` y revisar la venta anterior en el historial. | La venta histórica conserva inalterados sus precios unitarios y subtotales originales. |
| **G-06** | **Rechazo** | Intentar venta con ID inexistente (409) o renglones con libros duplicados (422). | El servidor rechaza la operación, el historial no se altera y la UI **conserva el borrador** para corregir. |
| **G-07** | **Despliegue** | Inspeccionar el despliegue en Easypanel bajo dominio HTTPS público. | La SPA abre por HTTPS, `/api/health/ready` devuelve 200, y los datos persisten tras redespliegue de los contenedores. |

Para el detalle paso a paso de la configuración en Easypanel, variables de entorno y evidencias, consultar **[DEPLOY.md](DEPLOY.md)**.
