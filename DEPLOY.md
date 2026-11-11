# Guía y Documentación de Despliegue en VPS (Easypanel) — Evaluación Global

> **Universidad Tecnológica Nacional (UTN) — Facultad Regional Mendoza (FRM)**  
> **Carrera**: Tecnicatura Universitaria en Programación (TUP)  
> **Cátedra**: Programación III  
> **Grupo**: LocalHost  
> **Integrantes**: Máximo Franco, Andrés Novello, Octavio Fiore  

---

## 1. Datos Generales del Despliegue

- **URL Pública del Servicio (Principal)**: `https://api.libreria.maximofranco.me`
- **URL Pública del Servicio (Alternativa Easypanel)**: `https://localhost-parcial-libreria.oyerue.easypanel.host`
- **IP Pública del Servidor VPS**: `179.199.130.181`
- **Swagger / OpenAPI Docs**: `https://api.libreria.maximofranco.me/docs` (o `https://localhost-parcial-libreria.oyerue.easypanel.host/docs`)
- **Endpoint de Verificación de Salud**: `https://api.libreria.maximofranco.me/health/ready`
- **Revisión del Repositorio**: Rama `main` / `master` (Monorepo `libreria-monorepo`)
- **Plataforma de Despliegue**: Servidor VPS Ubuntu Server 24.04 LTS (x86_64) administrado mediante **Easypanel**
- **Motor de Contenedores**: Docker Engine 26+ / Buildx
- **Base de Datos**: PostgreSQL 16 (Servicio Gestionado interno de Easypanel)

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
| Variable | Valor de Ejemplo / Producción | Descripción |
|---|---|---|
| `API_UPSTREAM` | `proyecto_backend:8000` | Host interno y puerto asignado al servicio backend en la red privada de Easypanel (sin prefijo `http://` ni barra final). |

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
   - Si Easypanel generó un dominio automático para este servicio, **eliminarlo** para mantener la API completamente privada en la red interna.
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
3. Ejecutar el script de carga inicial documentado:
   ```bash
   python seed_db.py
   ```
   *Este comando poblará editoriales (Planeta, Sudamericana, etc.), géneros, autores, libros de catálogo y clientes.*

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
   - Configurar `API_UPSTREAM=<nombreproyecto_backend>:8000` (ejemplo: `libreria-global_backend:8000`).
5. En la pestaña **Domains**:
   - Agregar el dominio asignado por la cátedra o tu subdominio (ej: `api.libreria.maximofranco.me`).
   - Puerto de destino: `80`.
   - Protocolo interno: `HTTP`.
   - Dejar activada la generación automática de certificados SSL con Let's Encrypt (HTTPS).
6. En la pestaña **Deploy**:
   - Pulsar **Deploy**.
   - En **Application Logs**, confirmar que Nginx arrancó y sustituyó correctamente la variable de entorno `API_UPSTREAM` en `/etc/nginx/conf.d/default.conf`.

---

## 5. Verificación de Salud en Producción

1. Abrir en el navegador:
   `https://<dominio-publico>/api/health/ready`
   **Respuesta esperada (HTTP 200)**:
   ```json
   {
     "status": "ok",
     "database": "connected"
   }
   ```
2. Abrir la URL raíz:
   `https://<dominio-publico>/`
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

Se documenta la ejecución de las 7 pruebas funcionales exigidas sobre el despliegue:

### G-01 · Catálogo
- **Acción**: Ingresar a la sección Catálogo, buscar por título parcial "Ficciones", probar mayúsculas/minúsculas ("ficciones"), cambiar paginación con Anterior/Siguiente y buscar un término inexistente ("LibroInexistenteXYZ"). Luego hacer clic en "Ver Autores" en una tarjeta.
- **Resultado Observado**: Búsqueda reactiva instantánea, paginación con `offset` reiniciado al cambiar filtro, despliegue del estado "Sin coincidencias", y apertura del modal con autores y roles consultados desde `GET /libros/{id}`.
- **Evidencia**: `evidencia/g01_catalogo.png`.

### G-02 · Alta de Libro
- **Acción**: Ingresar a la sección Libros, completar título "Rayuela", ISBN "9789500424559", precio 3500.00, stock 15, editorial "Editorial Sudamericana", género "Ficción". En autorías, verificar autor ID 1 mediante `GET /autores/1` ("Jorge Luis Borges"), agregar autoría con rol "autor" y orden 1. Enviar el formulario. Reintentar enviar el mismo ISBN.
- **Resultado Observado**: Primer envío responde **201 Created**, el libro se incorpora al catálogo y a la tabla de libros. En el segundo envío con el mismo ISBN, el backend responde **409 Conflict** y la interfaz muestra el error del servidor sin perder los datos del formulario.
- **Evidencia**: `evidencia/g02_alta_libro.png`.

### G-03 · Alta de Cliente
- **Acción**: Ingresar a Clientes, crear cliente con nombre "Ana García" y email "ana.garcia@gmail.com". Luego consultar en el buscador individual por ID con `GET /clientes/{id}`. Reintentar registrar un cliente con el mismo email.
- **Resultado Observado**: Primer alta exitosa (**201 Created**). La consulta individual por ID recupera el nombre y correo exactos. El segundo intento con el email duplicado es rechazado con **409 Conflict** mostrando el mensaje correspondiente.
- **Evidencia**: `evidencia/g03_alta_cliente.png`.

### G-04 · Venta
- **Acción**: Ingresar a Ventas, seleccionar el cliente ID 1, agregar 2 libros distintos (Libro 1 con cantidad 2, Libro 2 con cantidad 1). Pulsar "Confirmar Venta".
- **Resultado Observado**: Botón se deshabilita durante el envío. El backend responde **201 Created**. La interfaz muestra el resumen con los precios unitarios del catálogo copiados, subtotales y total general devuelto por la API. El borrador se limpia automáticamente y el historial se actualiza.
- **Evidencia**: `evidencia/g04_venta.png`.

### G-05 · Precio Histórico Inmutable
- **Acción**: Mediante una petición `PATCH /api/libros/{id}` o modificación en catálogo, actualizar el precio de uno de los libros vendidos en el caso G-04 (por ejemplo, de $2500 a $4999). Luego ingresar a Historial y abrir el comprobante de la venta anterior con "Ver Detalle Histórico" (`GET /ventas/{id}`).
- **Resultado Observado**: La venta registrada con anterioridad conserva intactos sus precios unitarios históricos originales ($2500) y subtotales, demostrando inmutabilidad del registro contable.
- **Evidencia**: `evidencia/g05_precio_historico.png`.

### G-06 · Rechazo de Venta y Conservación del Borrador
- **Acción**: Armar un pedido en borrador con 2 renglones válidos. Forzar un ID de cliente inexistente (o cuerpo inválido) y enviar. Luego probar agregar un libro repetido.
- **Resultado Observado**: El backend rechaza la operación devolviendo **409 Conflict** (cliente inexistente) o **422 Unprocessable Entity**. El historial permanece inalterado y **el borrador con los renglones se conserva intacto en pantalla** para permitir al usuario corregir el error.
- **Evidencia**: `evidencia/g06_rechazo.png`.

### G-07 · Despliegue y Persistencia tras Redespliegue
- **Acción**: Verificar acceso público mediante HTTPS con candado SSL válido. Consultar `/api/health/ready` (devuelve 200). En Easypanel, realizar un reinicio o redespliegue de los contenedores y recargar la página.
- **Resultado Observado**: La aplicación continúa funcionando sin interrupciones, la API responde 200 en salud y todos los libros, clientes y ventas previamente registrados continúan disponibles en PostgreSQL.
- **Evidencia**: `evidencia/g07_despliegue_salud.png`.
