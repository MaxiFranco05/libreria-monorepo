# Guía y Documentación de Despliegue en VPS (Easypanel) — Evaluación Global

> **Universidad Tecnológica Nacional (UTN) — Facultad Regional Mendoza (FRM)**  
> **Carrera**: Tecnicatura Universitaria en Programación (TUP)  
> **Cátedra**: Programación III  
> **Grupo**: LocalHost  
> **Integrantes**: Máximo Franco, Andrés Novello, Octavio Fiore  

---

## 1. Datos Generales del Despliegue

- **URL Pública del Servicio (Principal)**: `https://libreria.maximofranco.me` (Nginx `1.30.6` sirve la SPA en `/` y hace proxy de `/api/` hacia el backend interno)
- **IP Pública del Servidor VPS (DNS A)**: `179.199.130.181`
- **Spec OpenAPI JSON en Producción**: `https://libreria.maximofranco.me/api/openapi.json` *(nota: `/api/docs` carga el HTML de Swagger UI, pero al buscar `/openapi.json` en `/` recibe `404` porque la plantilla de Nginx `proxy_pass http://${API_UPSTREAM}/;` remueve el prefijo `/api/` según la consigna pág. 5; localmente Swagger abre completo en `http://localhost:8000/docs`)*
- **Endpoints de Verificación de Salud**: `https://libreria.maximofranco.me/api/health/ready` (`{"estado":"listo"}`) y `https://libreria.maximofranco.me/api/health/live` (`{"estado":"vivo"}`)
- **Revisión del Repositorio**: Rama `main` (evidencia funcional ejecutada sobre el despliegue en `c5e3190`, `Last-Modified: Wed, 11 Nov 2026 18:11:08 GMT`; entrega actualizada en la punta de `main`)
- **Plataforma de Despliegue**: Servidor VPS administrado mediante **Easypanel** (red interna Docker entre PostgreSQL 16, `backend` interno y `frontend` público)
- **Base de Datos**: PostgreSQL 16 (Servicio interno gestionado en Easypanel)

---

## 2. Arquitectura de Red y Servicios en Easypanel

El despliegue está compuesto por tres servicios desacoplados bajo la misma red interna privada del proyecto en Easypanel:

```text
       [ Navegador del Usuario / Evaluador ]
                         │
                         │ HTTPS (Puerto 443 / SSL Let's Encrypt)
                         ▼
        ┌───────────────────────────────────┐
        │       Servicio App: frontend      │
        │   (Nginx 1.30-alpine, Puerto 80)  │
        └─────────────────┬─────────────────┘
                          │
         /api/* (Proxy    │  Archivos estáticos
         inverso interno) │  (HTML5, CSS3, JS nativo)
                          ▼
        ┌───────────────────────────────────┐
        │       Servicio App: backend       │
        │    (FastAPI + Python 3.12-slim)   │
        │     Puerto interno: 8000          │
        └─────────────────┬─────────────────┘
                          │
                          │ Driver: postgresql+asyncpg (Puerto 5432)
                          ▼
        ┌───────────────────────────────────┐
        │     Servicio Database: postgres   │
        │           (PostgreSQL 16)         │
        └───────────────────────────────────┘
```

1. **Servicio `postgres`**: Base de datos relacional. Su puerto 5432 es privado y permanece inaccesible desde Internet, disponible únicamente para el backend en la red interna del proyecto.
2. **Servicio `backend`**: API FastAPI. No expone dominio público. Escucha internamente en `0.0.0.0:8000`. Al iniciar ejecuta `alembic upgrade head` para sincronizar las migraciones antes de levantar Uvicorn.
3. **Servicio `frontend`**: Servidor Nginx que aloja la SPA nativa en `/usr/share/nginx/html`. Recibe las peticiones públicas con terminación SSL en Easypanel, sirve el frontend estático y reenvía cualquier solicitud con prefijo `/api/` hacia el backend mediante la variable `${API_UPSTREAM}`.

---

## 3. Variables de Entorno de Producción

Las variables sensibles se definen exclusivamente en el panel privado de Easypanel (pestaña **Environment**) y nunca se commitean al repositorio:

### A. Servicio `backend`
| Variable | Valor de Ejemplo / Producción | Descripción |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:PassSeguro2026@proyecto_postgres:5432/libreria_prod` | Cadena de conexión asincrónica con driver `asyncpg` hacia el host interno de Postgres. |
| `SQL_ECHO` | `false` | Deshabilita el logging exhaustivo de queries SQL en consola para producción. |

### B. Servicio `frontend`
Ver plantilla versionada en `frontend/env.example`.

| Variable | Valor de Ejemplo / Producción | Descripción |
|---|---|---|
| `API_UPSTREAM` | `localhost_libreria-backend:8000` (genérico: `<proyecto>_backend:8000`) | Host interno y puerto asignado al servicio backend en la red privada de Easypanel (sin prefijo `http://` ni barra final). |

---

## 4. Procedimiento de Despliegue Paso a Paso en Easypanel

### Paso 1: Crear el Proyecto
1. En el panel de control de Easypanel, hacer clic en **New Project**.
2. Asignar el nombre del proyecto (por ejemplo `libreria-global` o el nombre de tu grupo).

### Paso 2: Crear el Servicio de Base de Datos PostgreSQL
1. Dentro del proyecto, pulsar **New Service** → **Database** → **Postgres**.
2. Asignar el nombre `postgres` (o el asignado por el equipo).
3. Seleccionar la versión `16`.
4. Una vez creado el servicio, ir a la pestaña **Credentials** para obtener el usuario, contraseña, base de datos y el host interno (generalmente de la forma `nombreproyecto_postgres`).
5. Mantener desmarcada la opción de exponer el puerto 5432 a Internet.

### Paso 3: Crear y Configurar el Servicio `backend`
1. Dentro del mismo proyecto, hacer clic en **New Service** → **App** y asignarle el nombre `backend`.
2. En la pestaña **Source**:
   - **Type**: Git Repository.
   - **Repository URL**: URL del monorepo (ej. `https://github.com/MaxiFranco05/libreria-monorepo.git`).
   - **Branch**: `main` (o `master`).
   - **Build Path**: `/backend` *(requisito estricto de la consigna pág. 7)*.
3. En la sección **Build**:
   - **Build Method**: `Dockerfile`.
   - **Dockerfile Path**: `Dockerfile`.
4. En la pestaña **Environment**:
   - Cargar `DATABASE_URL=postgresql+asyncpg://<usuario>:<password>@<nombreproyecto_postgres>:5432/<nombre_db>`.
   - Cargar `SQL_ECHO=false`.
5. En la pestaña **Domains**:
   - Si Easypanel generó algún dominio automático o dominio de API para este servicio (por ejemplo `*.easypanel.host` o `api.*`), **eliminarlo** desde el ícono de tacho en **Dominios** para mantener la API completamente privada en la red interna (consigna pág. 7).
6. En la pestaña **Deploy**:
   - Pulsar **Deploy**.
   - Revisar en la consola de **Build Logs** que se instalen las dependencias (`requirements.txt`) y que el contenedor inicie exitosamente.
   - En **Application Logs**, confirmar que se aplicaron las migraciones (`alembic upgrade head`) y que Uvicorn arrancó en `0.0.0.0:8000`.

### Paso 4: Carga Inicial de Datos Ficticios (Seed)
1. Con el contenedor del backend en estado `running`, ir a la pestaña **Shell** del servicio `backend`.
2. Verificar la salud de la API internamente:
   ```bash
   python -c "from urllib.request import urlopen; print(urlopen('http://127.0.0.1:8000/health/ready').status)"
   ```
   *Debe imprimir `200`.*
3. Ejecutar el script de carga inicial documentado únicamente en la carga inicial o si se desea reiniciar el entorno de pruebas:
   ```bash
   python seed_db.py
   ```
   *Este comando poblará editoriales, géneros, autores, libros de catálogo y clientes.*
   > **Advertencia sobre datos existentes**: `seed_db.py` ejecuta `TRUNCATE TABLE renglon_venta, venta, perfil_cliente, cliente, libro_autor, libro, genero, autor, editorial RESTART IDENTITY CASCADE`, por lo que **elimina todos los registros existentes** antes de reinsertar el seed. No debe ejecutarse sobre una base con ventas o altas que deban preservarse.

### Paso 5: Crear y Publicar el Servicio `frontend`
1. En el mismo proyecto, pulsar **New Service** → **App** y asignarle el nombre `frontend`.
2. En la pestaña **Source**:
   - **Repository URL**: URL del mismo monorepo.
   - **Branch**: `main`.
   - **Build Path**: `/frontend` *(requisito estricto de la consigna pág. 8)*.
3. En la sección **Build**:
   - **Build Method**: `Dockerfile`.
   - **Dockerfile Path**: `Dockerfile`.
4. En la pestaña **Environment**:
   - Configurar `API_UPSTREAM=<nombreproyecto_backend>:8000` tomando como guía `frontend/env.example` (por ejemplo, para proyecto `localhost` y servicio `libreria-backend`: `localhost_libreria-backend:8000`).
5. En la pestaña **Domains**:
   - Agregar el dominio público del frontend (`libreria.maximofranco.me`) y mantener el servicio `backend` **solo interno** (sin dominio público automático).
   - Puerto de destino: `80`.
   - Protocolo interno: `HTTP`.
   - Dejar activada la generación automática de certificados SSL con Let's Encrypt (HTTPS).
6. En la pestaña **Deploy**:
   - Pulsar **Deploy**.
   - En **Application Logs**, confirmar que Nginx arrancó y sustituyó correctamente la variable de entorno `API_UPSTREAM` en `/etc/nginx/conf.d/default.conf`.

---

## 5. Verificación de Salud en Producción

1. Abrir en el navegador o consultar con `curl`:
   `https://libreria.maximofranco.me/api/health/ready`
   **Respuesta verificada (HTTP 200)**:
   ```json
   {"estado":"listo"}
   ```
   Complementariamente, `https://libreria.maximofranco.me/api/health/live` responde `HTTP 200` con `{"estado":"vivo"}`.
2. Abrir la URL raíz:
   `https://libreria.maximofranco.me/`
   Verificar que la SPA carga el catálogo con los libros poblados por el seed.

---

## 6. Procedimiento de Actualización sin Pérdida de Datos

Dado que la base de datos PostgreSQL corre en un servicio independiente con volúmenes persistentes gestionados por Easypanel, las actualizaciones del código fuente no alteran la base de datos:

1. **Despliegue de nueva versión**:
   - Al realizar un `git push` a la rama `main`, pulsar **Deploy** en el servicio que cambió (`backend` o `frontend`).
2. **Migraciones automáticas**:
   - Al iniciar el nuevo contenedor del backend, el comando `CMD alembic upgrade head && exec uvicorn ...` detecta y aplica automáticamente cualquier nueva migración de esquema.
   - Si no hay migraciones pendientes, continúa inmediatamente al inicio de Uvicorn.
3. **Persistencia total**:
   - Todos los registros de libros, clientes, compras y precios históricos se mantienen íntegros en PostgreSQL.

---

## 7. Registro de Casos de Prueba (G-01 a G-07)

Se documenta la ejecución real de las 7 pruebas funcionales exigidas sobre el despliegue público `https://libreria.maximofranco.me` (IP `179.199.130.181`, servidor `nginx/1.30.6`, frontend servido desde commit `c5e3190`). Las salidas HTTP completas constan en [`evidencia/README.md`](evidencia/README.md).

### G-01 · Catálogo
- **Acción**: Ingresar a la sección Catálogo (`#catalogo`), navegar paginación (`GET /api/libros/?limit=12&offset=0` → `offset=12`), buscar por título en minúsculas `"ficciones"` (`offset` reiniciado a `0`), abrir "Ver Autores" en el libro ID `7` (`GET /api/libros/7`) y buscar un término inexistente (`"LibroInexistenteXYZ"`).
- **Resultado Observado**: Paginación devuelve `200 OK` (12 libros en página 2, IDs `13`–`24`); el filtro `"ficciones"` encuentra `"Ficciones"` y el modal muestra autor `#1 Jorge Luis Borges (Argentina)` (`rol: autor`, `orden: 1`); `"LibroInexistenteXYZ"` devuelve `[]` (`200 OK`) y muestra el estado `"Sin coincidencias"`.
- **Evidencia**: `evidencia/g01_catalogo_paginacion.png`, `evidencia/g01_catalogo_detalle_autores.png`, `evidencia/g01_catalogo_sin_coincidencias.png`.

### G-02 · Alta de Libro
- **Acción**: En `#libros`, verificar por ID a los autores `#1` (`GET /api/autores/1` → `"Jorge Luis Borges"`) y `#2` (`GET /api/autores/2` → `"Julio Cortázar"`). Registrar el libro `"Antología del Río"`, ISBN `"978-950-88-1511-1"`, precio `1500.00`, stock `15`, editorial `2` (`Editorial Sudamericana`), género `null` (`«Sin clasificar»`), autorías `#1` (`autor`, orden 1) y `#2` (`coautor`, orden 2). Consultar el detalle del Libro `#29` (`GET /api/libros/29`) y reintentar crear el libro con el mismo ISBN.
- **Resultado Observado**: Alta exitosa (`POST /api/libros/` → `201 Created`) asignando el ID `29`; el detalle muestra editorial, estado sin clasificar y ambas autorías; el reintento con ISBN duplicado responde `409 Conflict` (`{"detail":"Ya existe un libro con ese ISBN"}`) y la interfaz conserva el borrador mostrando el error.
- **Evidencia**: `evidencia/g02_alta_libro_detalle.png`, `evidencia/g02_alta_libro_409.png`.

### G-03 · Alta de Cliente
- **Acción**: En `#clientes`, registrar el cliente `"Roberto Sánchez"` con email `"roberto.sanchez.global@test.com"` y consultarlo por ID en el buscador individual (`GET /api/clientes/12`). Luego reintentar registrar otro cliente con el mismo correo.
- **Resultado Observado**: Primer envío responde `201 Created` (Cliente ID `12`); la consulta `GET /api/clientes/12` responde `200 OK` recuperando nombre y email exactos; el reintento con email duplicado devuelve `409 Conflict` (`{"detail":"Email ya registrado"}`).
- **Evidencia**: `evidencia/g03_alta_cliente_ok.png`, `evidencia/g03_alta_cliente_409.png`.

### G-04 · Venta
- **Acción**: En `#ventas`, seleccionar Cliente `#12` (`Roberto Sánchez`) y agregar 2 renglones: Libro `#29` (`Antología del Río`, cantidad `2`, unitario `$1500.00`) y Libro `#1` (`El Aleph`, cantidad `1`, unitario `$45.00`). Confirmar venta (`POST /api/ventas/`), recargar la página completa e inspeccionar el comprobante en `#historial` (`GET /api/ventas/26`).
- **Resultado Observado**: La API responde `201 Created` creando el Comprobante `#26` por `$3045.00` (`$3000.00` + `$45.00`) y limpiando el borrador automáticamente; tras recargar completamente la SPA, el comprobante `#26` conserva idénticos renglones, cantidades, precios unitarios y total.
- **Evidencia**: `evidencia/g04_venta_confirmada.png`, `evidencia/g04_venta_historial_post_reload.png`.

### G-05 · Precio Histórico Inmutable
- **Acción**: Desde `#libros`, abrir el modal Editar sobre Libro `#29` (`Antología del Río`) y actualizar el precio de `1500.00` a `2990.00` (`PATCH /api/libros/29` → `200 OK`, observándose además el stock descontado tras la venta: `13 u.`). Luego ir a `#historial` y abrir nuevamente el comprobante `#26` (`GET /api/ventas/26`).
- **Resultado Observado**: En el listado actual figura `$2990.00`, mientras que el comprobante histórico `#26` mantiene inalterados `precio_unitario: "1500.00"`, `subtotal: "3000.00"` y `total: "3045.00"`.
- **Evidencia**: `evidencia/g05_precio_modificado_patch.png`, `evidencia/g05_precio_historico.png`.

### G-06 · Rechazo de Venta y Conservación del Borrador
- **Acción**: Armar un borrador válido en `#ventas` con 2 renglones (`$3080.00`: Libro `#29` cant. `1` + Libro `#1` cant. `2`), enviar con `cliente_id: 999999` (`POST /api/ventas/`) y verificar el historial. Además, probar vía API el envío de un `libro_id` repetido en los renglones (`[{"libro_id":29,"cantidad":1},{"libro_id":29,"cantidad":2}]`).
- **Resultado Observado**: El cliente inexistente responde `409 Conflict` (`{"detail":"Cliente no encontrado"}`); el libro duplicado responde `422 Unprocessable Entity` (`"Value error, No se permiten libros duplicados en los renglones"`). El historial permanece intacto (`#26` sigue siendo el último comprobante) y el borrador en pantalla conserva ambos renglones para corregir.
- **Evidencia**: `evidencia/g06_rechazo_409_borrador.png`, `evidencia/g06_rechazo_historial_intacto.png`.

### G-07 · Despliegue y Persistencia en Producción
- **Acción**: Verificar acceso público HTTPS en `https://libreria.maximofranco.me`, consultar `/api/health/ready`, comprobar la permanencia de datos históricos de sesiones anteriores (`2026-11-10`, comprobantes `#1`–`#24`, libros `#1`–`#28`) tras el despliegue del `2026-11-11` (`c5e3190`) y verificar que los registros nuevos (`Libro #29`, `Cliente #12`, `Venta #26`) persisten tras recargas en PostgreSQL.
- **Resultado Observado**: La SPA carga sobre HTTPS vía `nginx/1.30.6`, `/api/health/ready` devuelve `200 OK` (`{"estado":"listo"}`) y tanto los datos previos como los generados durante las pruebas permanecen almacenados de forma persistente.
- **Evidencia**: `evidencia/g07_health_ready_https.png`, `evidencia/g07_despliegue_catalogo_https.png`.
