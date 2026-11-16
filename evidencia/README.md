# Evidencia de Pruebas Funcionales — Global Programación III

Registro verificado de ejecución de los casos **G-01 a G-07** sobre el despliegue público en producción, sin datos simulados ni respuestas editadas.

## Entorno Verificado

- **URL pública (Nginx SPA + Reverse Proxy `/api/`)**: `https://libreria.maximofranco.me`
- **IP pública del servidor VPS (DNS A)**: `179.199.130.181` (`Resolve-DnsName libreria.maximofranco.me -Type A`)
- **Servidor HTTP**: `nginx/1.30.6`
- **Commit desplegado en el frontend servido (`Last-Modified: Wed, 11 Nov 2026 18:11:08 GMT`)**: `c5e3190` (`2026-11-11T15:11:08-03:00`)
- **Fecha de ejecución de pruebas**: `2026-11-15 20:53–21:09 ART` (`2026-11-16 00:00–00:09 UTC`)
- **Endpoints de salud verificados**:
  - `GET https://libreria.maximofranco.me/api/health/ready` → `HTTP/1.1 200 OK` → `{"estado":"listo"}`
  - `GET https://libreria.maximofranco.me/api/health/live` → `HTTP/1.1 200 OK` → `{"estado":"vivo"}`

---

## Índice de Evidencias (G-01 a G-07)

| Caso | Descripción de la Prueba | Estado HTTP / Resultado | Capturas |
|---|---|---|---|
| **G-01** | Catálogo: paginación (`limit=12`, `offset=0` → `12`), búsqueda case-insensitive (`"ficciones"`), detalle con autores (`GET /api/libros/7`) y búsqueda sin resultados (`"LibroInexistenteXYZ"`). | `200 OK` en listado, detalle y búsqueda vacía (`[]`). | [`g01_catalogo_paginacion.png`](./g01_catalogo_paginacion.png)<br>[`g01_catalogo_detalle_autores.png`](./g01_catalogo_detalle_autores.png)<br>[`g01_catalogo_sin_coincidencias.png`](./g01_catalogo_sin_coincidencias.png) |
| **G-02** | Alta de libro: verificación de autores por ID (`GET /api/autores/1` y `/2`), creación de Libro `#29` (`"Antología del Río"`, ISBN `978-950-88-1511-1`, precio `1500.00`, stock `15`, editorial `2`, `genero_id: null`), consulta de detalle y reintento con ISBN duplicado. | `200 OK` autores; `201 Created` Libro `#29`; `409 Conflict` (`"Ya existe un libro con ese ISBN"`). | [`g02_alta_libro_detalle.png`](./g02_alta_libro_detalle.png)<br>[`g02_alta_libro_409.png`](./g02_alta_libro_409.png) |
| **G-03** | Alta de cliente: registro de Cliente `#12` (`"Roberto Sánchez"`, `roberto.sanchez.global@test.com`), verificación individual (`GET /api/clientes/12`) y reintento con email repetido. | `201 Created` Cliente `#12`; `200 OK` consulta por ID; `409 Conflict` (`"Email ya registrado"`). | [`g03_alta_cliente_ok.png`](./g03_alta_cliente_ok.png)<br>[`g03_alta_cliente_409.png`](./g03_alta_cliente_409.png) |
| **G-04** | Venta válida de 2 renglones: Cliente `#12` con Libro `#29` (cant. `2`, `$1500.00`) + Libro `#1` (cant. `1`, `$45.00`), total `$3045.00` → Comprobante `#26`. Recarga completa de página y verificación en Historial (`GET /api/ventas/26`). | `201 Created` Venta `#26`; borrador limpiado; `200 OK` post-reload con importes idénticos. | [`g04_venta_confirmada.png`](./g04_venta_confirmada.png)<br>[`g04_venta_historial_post_reload.png`](./g04_venta_historial_post_reload.png) |
| **G-05** | Precio histórico inmutable: actualización del Libro `#29` de `$1500.00` a `$2990.00` mediante `PATCH /api/libros/29` (stock posterior a venta: `13 u.`) e inspección posterior del Comprobante `#26`. | `200 OK` en `PATCH /api/libros/29`; Venta `#26` conserva `precio_unitario: "1500.00"`, `subtotal: "3000.00"` y `total: "3045.00"`. | [`g05_precio_modificado_patch.png`](./g05_precio_modificado_patch.png)<br>[`g05_precio_historico.png`](./g05_precio_historico.png) |
| **G-06** | Rechazo de venta y preservación del borrador: borrador de 2 renglones (`$3080.00`) enviado con `cliente_id: 999999` (`409`) y validación adicional vía API de libro duplicado en renglones (`422`). Revisión del Historial sin cambios. | `409 Conflict` (`"Cliente no encontrado"`); `422 Unprocessable Entity` (`"No se permiten libros duplicados en los renglones"`); borrador intacto en UI y Comprobante `#26` sin alteraciones. | [`g06_rechazo_409_borrador.png`](./g06_rechazo_409_borrador.png)<br>[`g06_rechazo_historial_intacto.png`](./g06_rechazo_historial_intacto.png) |
| **G-07** | Despliegue HTTPS y persistencia en PostgreSQL: acceso público a la SPA y `/api/health/ready`, permanencia de datos de sesiones previas (`2026-11-10`, ventas `#1`–`#24`) tras el despliegue del `2026-11-11` (`c5e3190`) y persistencia de los registros nuevos tras recarga. | `200 OK` en SPA (`text/html`) y `/api/health/ready` (`{"estado":"listo"}`); datos históricos y nuevos persistentes en catálogo e historial. | [`g07_health_ready_https.png`](./g07_health_ready_https.png)<br>[`g07_despliegue_catalogo_https.png`](./g07_despliegue_catalogo_https.png) |

---

## Salidas Verbatim de Endpoints Verificados (`curl.exe`, `2026-11-16T00:09Z`)

### Salud del despliegue y autores

```http
GET /api/health/ready → HTTP/1.1 200 OK
{"estado":"listo"}

GET /api/health/live → HTTP/1.1 200 OK
{"estado":"vivo"}

GET /api/autores/1 → HTTP/1.1 200 OK
{"id":1,"nombre":"Jorge Luis Borges","nacionalidad":"Argentina"}

GET /api/autores/2 → HTTP/1.1 200 OK
{"id":2,"nombre":"Julio Cortázar","nacionalidad":"Argentina"}
```

### Registros creados/actualizados y consulta de comprobante histórico (G-02, G-03, G-04, G-05)

```http
GET /api/libros/29 → HTTP/1.1 200 OK
{"id":29,"isbn":"978-950-88-1511-1","titulo":"Antología del Río","precio":"2990.00","stock":13,"editorial_id":2,"genero_id":null,"editorial":{"id":2,"nombre":"Editorial Sudamericana","pais":"Uruguay"},"genero":null,"autorias":[{"autor":{"id":1,"nombre":"Jorge Luis Borges","nacionalidad":"Argentina"},"rol":"autor","orden":1},{"autor":{"id":2,"nombre":"Julio Cortázar","nacionalidad":"Argentina"},"rol":"coautor","orden":2}]}

GET /api/clientes/12 → HTTP/1.1 200 OK
{"id":12,"nombre":"Roberto Sánchez","email":"roberto.sanchez.global@test.com","perfil":null}

GET /api/ventas/26 → HTTP/1.1 200 OK
{"id":26,"fecha":"2026-11-16T00:00:49.875351Z","total":"3045.00","cliente":{"id":12,"nombre":"Roberto Sánchez","email":"roberto.sanchez.global@test.com"},"renglones":[{"libro_id":1,"titulo":"El Aleph","cantidad":1,"precio_unitario":"45.00","subtotal":"45.00"},{"libro_id":29,"titulo":"Antología del Río","cantidad":2,"precio_unitario":"1500.00","subtotal":"3000.00"}]}
```

### Respuestas de rechazo reales (G-02, G-03, G-06)

```http
POST /api/libros/ (ISBN repetido "978-950-88-1511-1") → HTTP/1.1 409 Conflict
{"detail":"Ya existe un libro con ese ISBN"}

POST /api/clientes/ (email repetido "roberto.sanchez.global@test.com") → HTTP/1.1 409 Conflict
{"detail":"Email ya registrado"}

POST /api/ventas/ (cliente_id: 999999) → HTTP/1.1 409 Conflict
{"detail":"Cliente no encontrado"}

POST /api/ventas/ (libro_id: 29 duplicado en renglones) → HTTP/1.1 422 Unprocessable Entity
{"detail":[{"type":"value_error","loc":["body"],"msg":"Value error, No se permiten libros duplicados en los renglones","input":{"cliente_id":12,"renglones":[{"libro_id":29,"cantidad":1},{"libro_id":29,"cantidad":2}]},"ctx":{"error":{}}}]}
```
