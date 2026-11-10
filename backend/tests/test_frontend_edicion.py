import json
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
FRONTEND_PUBLIC = ROOT_DIR / "frontend" / "public"


def _run_node_script(script: str) -> dict:
    proc = subprocess.run(
        ["node", "-e", script],
        cwd=str(ROOT_DIR),
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    return json.loads(proc.stdout.strip())


def test_api_patch_cliente_exito_y_validaciones():
    api_path = (FRONTEND_PUBLIC / "js" / "api.js").as_posix()
    script = f"""
    const Calls = [];
    globalThis.fetch = async (url, config) => {{
      Calls.push({{ url, config }});
      if (url.endsWith('/clientes/99')) {{
        return {{
          status: 409,
          ok: false,
          statusText: 'Conflict',
          headers: {{ get: () => 'application/json' }},
          json: async () => ({{ detail: 'Email ya registrado' }})
        }};
      }}
      return {{
        status: 200,
        ok: true,
        headers: {{ get: () => 'application/json' }},
        json: async () => ({{ id: 1, nombre: 'María González', email: 'maria@correo.com' }})
      }};
    }};
    const api = require('{api_path}');
    (async () => {{
      const res = await api.patchCliente(1, {{ nombre: 'María González', email: 'maria@correo.com' }});
      let missingIdErr = null;
      try {{
        await api.patchCliente(null, {{ nombre: 'X' }});
      }} catch (e) {{
        missingIdErr = e.message;
      }}
      let conflictErr = null;
      try {{
        await api.patchCliente(99, {{ email: 'dup@correo.com' }});
      }} catch (e) {{
        conflictErr = {{ message: e.message, status: e.status }};
      }}
      console.log(JSON.stringify({{ res, calls: Calls, missingIdErr, conflictErr }}));
    }})();
    """
    out = _run_node_script(script)
    assert out["res"]["nombre"] == "María González"
    assert out["calls"][0]["url"] == "/api/clientes/1"
    assert out["calls"][0]["config"]["method"] == "PATCH"
    assert json.loads(out["calls"][0]["config"]["body"]) == {
        "nombre": "María González",
        "email": "maria@correo.com",
    }
    assert out["missingIdErr"] == "ID de cliente no especificado"
    assert out["conflictErr"]["status"] == 409
    assert out["conflictErr"]["message"] == "Email ya registrado"


def test_index_html_y_css_contienen_campos_isbn_y_modal_cliente():
    html = (FRONTEND_PUBLIC / "index.html").read_text(encoding="utf-8")
    components_css = (FRONTEND_PUBLIC / "css" / "components.css").read_text(encoding="utf-8")
    views_css = (FRONTEND_PUBLIC / "css" / "views.css").read_text(encoding="utf-8")

    # Tarea 4: ISBN en modal de edición de libros + fila responsive
    assert 'id="editar-libro-isbn"' in html
    assert 'id="error-editar-isbn"' in html
    assert 'class="modal-form-row-two-cols"' in html

    # Tarea 5: Columna Acciones en tabla clientes + modal editar cliente
    assert 'id="modal-editar-cliente"' in html
    assert 'id="form-editar-cliente"' in html
    assert 'id="editar-cliente-id"' in html
    assert 'id="editar-cliente-nombre"' in html
    assert 'id="editar-cliente-email"' in html
    assert 'id="editar-cliente-feedback"' in html
    assert 'id="btn-cancelar-editar-cliente"' in html
    assert 'id="btn-guardar-editar-cliente"' in html

    # CSS responsive y estilos de botones
    assert ".btn-editar-cliente" in components_css
    assert ".modal-form-row-two-cols" in views_css


def test_libros_view_edita_isbn_y_valida_vacio():
    libros_view_path = (FRONTEND_PUBLIC / "js" / "views" / "libros.view.js").as_posix()
    script = f"""
    const elements = {{}};
    function getEl(id) {{
      if (!elements[id]) {{
        elements[id] = {{
          id,
          value: '',
          innerHTML: '',
          textContent: '',
          disabled: false,
          style: {{}},
          classList: {{ add(){{}}, remove(){{}} }},
          setAttribute(k, v) {{ this[k] = v; }},
          removeAttribute(k) {{ delete this[k]; }},
          addEventListener(ev, fn) {{ this['_on_' + ev] = fn; }},
          scrollIntoView() {{}},
          showModal() {{ this.open = true; }},
          close() {{ this.open = false; }},
          appendChild(child) {{ this.lastChild = child; }}
        }};
      }}
      return elements[id];
    }}
    globalThis.document = {{
      getElementById: (id) => getEl(id),
      createElement: (tag) => ({{
        tag,
        className: '',
        innerHTML: '',
        textContent: '',
        style: {{}},
        setAttribute(){{}},
        appendChild(child) {{ this.lastChild = child; }},
        querySelector() {{ return {{ addEventListener(){{}} }}; }}
      }})
    }};
    const patchedCalls = [];
    globalThis.window = globalThis;
    globalThis.LibreriaApp = {{
      api: {{
        getEditoriales: async () => [],
        getGeneros: async () => [],
        getLibros: async () => [],
        patchLibro: async (id, payload) => {{
          patchedCalls.push({{ id, payload }});
          return {{ id, ...payload }};
        }}
      }},
      views: {{}}
    }};
    const view = require('{libros_view_path}');
    view.init();
    (async () => {{
      if (typeof view.openEditBookModal === 'function') {{
        view.openEditBookModal({{
          id: 7,
          titulo: 'Rayuela',
          isbn: '978-950-12-3456-8',
          stock: 12,
          precio: 45.5
        }});
      }}
      const initialIsbnValue = getEl('editar-libro-isbn').value;
      const pillsHtml = getEl('modal-editar-pills').innerHTML;

      // Caso 1: ISBN vacío debe fallar validación cliente
      getEl('editar-libro-isbn').value = '   ';
      await getEl('form-editar-libro')._on_submit({{ preventDefault(){{}} }});
      const emptyIsbnFeedback = getEl('editar-libro-feedback').innerHTML;

      // Caso 2: ISBN válido debe enviar {{ titulo, isbn, stock, precio }}
      getEl('editar-libro-isbn').value = '978-950-04-2455-4';
      getEl('editar-libro-titulo').value = 'El Aleph';
      getEl('editar-libro-stock').value = '20';
      getEl('editar-libro-precio').value = '95.50';
      await getEl('form-editar-libro')._on_submit({{ preventDefault(){{}} }});

      console.log(JSON.stringify({{
        initialIsbnValue,
        pillsHtml,
        emptyIsbnFeedback,
        patchedCalls
      }}));
    }})();
    """
    out = _run_node_script(script)
    assert out["initialIsbnValue"] == "978-950-12-3456-8"
    assert "ID #7" in out["pillsHtml"]
    assert "ISBN 978-950-12-3456-8" in out["pillsHtml"]
    assert "El ISBN no puede estar vacío" in out["emptyIsbnFeedback"]
    assert len(out["patchedCalls"]) == 1
    assert out["patchedCalls"][0] == {
        "id": 7,
        "payload": {
            "titulo": "El Aleph",
            "isbn": "978-950-04-2455-4",
            "stock": 20,
            "precio": 95.5,
        },
    }


def test_clientes_view_edita_cliente_valida_y_maneja_409():
    clientes_view_path = (FRONTEND_PUBLIC / "js" / "views" / "clientes.view.js").as_posix()
    script = f"""
    const elements = {{}};
    function getEl(id) {{
      if (!elements[id]) {{
        elements[id] = {{
          id,
          value: '',
          innerHTML: '',
          textContent: '',
          disabled: false,
          open: false,
          style: {{ display: 'none' }},
          classList: {{ add(){{}}, remove(){{}} }},
          setAttribute(k, v) {{ this[k] = v; }},
          removeAttribute(k) {{ delete this[k]; }},
          addEventListener(ev, fn) {{ this['_on_' + ev] = fn; }},
          scrollIntoView() {{}},
          showModal() {{ this.open = true; }},
          close() {{ this.open = false; }},
          appendChild(child) {{ this.lastChild = child; }}
        }};
      }}
      return elements[id];
    }}
    globalThis.document = {{
      getElementById: (id) => getEl(id),
      createElement: (tag) => ({{
        tag,
        className: '',
        innerHTML: '',
        textContent: '',
        style: {{}},
        setAttribute(){{}},
        appendChild(child) {{ this.lastChild = child; }},
        querySelector() {{ return {{ addEventListener(){{}} }}; }}
      }})
    }};
    const patchedClients = [];
    let ventasReloaded = false;
    globalThis.window = globalThis;
    globalThis.LibreriaApp = {{
      api: {{
        getClientes: async () => [{{ id: 3, nombre: 'Juan Pérez', email: 'juan@correo.com' }}],
        getCliente: async (id) => ({{ id, nombre: 'Juan Editado', email: 'nuevo@correo.com' }}),
        patchCliente: async (id, payload) => {{
          if (payload.email === 'duplicado@correo.com') {{
            const err = new Error('Email ya registrado');
            err.status = 409;
            throw err;
          }}
          patchedClients.push({{ id, payload }});
          return {{ id, ...payload }};
        }}
      }},
      views: {{
        ventas: {{
          loadClientOptions: () => {{ ventasReloaded = true; }}
        }}
      }}
    }};
    const view = require('{clientes_view_path}');
    view.init();
    (async () => {{
      view.openEditClientModal({{ id: 3, nombre: 'Juan Pérez', email: 'juan@correo.com' }});
      const modalOpenAfterOpen = getEl('modal-editar-cliente').open;
      const initialName = getEl('editar-cliente-nombre').value;
      const initialEmail = getEl('editar-cliente-email').value;

      // Caso 1: Nombre vacío
      getEl('editar-cliente-nombre').value = '   ';
      await getEl('form-editar-cliente')._on_submit({{ preventDefault(){{}} }});
      const emptyNameFeedback = getEl('editar-cliente-feedback').innerHTML;

      // Caso 2: Email inválido
      getEl('editar-cliente-nombre').value = 'Juan Editado';
      getEl('editar-cliente-email').value = 'correo-invalido';
      await getEl('form-editar-cliente')._on_submit({{ preventDefault(){{}} }});
      const invalidEmailFeedback = getEl('editar-cliente-feedback').innerHTML;

      // Caso 3: Error 409 Email duplicado mantiene modal abierto
      getEl('editar-cliente-email').value = 'duplicado@correo.com';
      await getEl('form-editar-cliente')._on_submit({{ preventDefault(){{}} }});
      const conflictFeedback = getEl('editar-cliente-feedback').innerHTML;
      const modalOpenAfterConflict = getEl('modal-editar-cliente').open;

      // Caso 4: Actualización exitosa cierra modal y sincroniza vistas
      getEl('editar-cliente-email').value = 'nuevo@correo.com';
      await getEl('form-editar-cliente')._on_submit({{ preventDefault(){{}} }});
      const modalOpenAfterSuccess = getEl('modal-editar-cliente').open;

      console.log(JSON.stringify({{
        modalOpenAfterOpen,
        initialName,
        initialEmail,
        emptyNameFeedback,
        invalidEmailFeedback,
        conflictFeedback,
        modalOpenAfterConflict,
        modalOpenAfterSuccess,
        patchedClients,
        ventasReloaded
      }}));
    }})();
    """
    out = _run_node_script(script)
    assert out["modalOpenAfterOpen"] is True
    assert out["initialName"] == "Juan Pérez"
    assert out["initialEmail"] == "juan@correo.com"
    assert "alert-error" in out["emptyNameFeedback"]
    assert "alert-error" in out["invalidEmailFeedback"]
    assert "Email ya registrado" in out["conflictFeedback"]
    assert out["modalOpenAfterConflict"] is True
    assert out["modalOpenAfterSuccess"] is False
    assert out["patchedClients"] == [
        {
            "id": 3,
            "payload": {
                "nombre": "Juan Editado",
                "email": "nuevo@correo.com",
            },
        }
    ]
    assert out["ventasReloaded"] is True


def test_device_simulator_fits_viewport_at_100_percent_zoom():
    layout_css = (FRONTEND_PUBLIC / "css" / "layout.css").read_text(encoding="utf-8")
    app_js = (FRONTEND_PUBLIC / "js" / "app.js").read_text(encoding="utf-8")

    assert "height: min(844px, calc(100vh - 4.25rem))" in layout_css
    assert "height: min(844px, calc(100dvh - 4.25rem))" in layout_css
    assert "flex-shrink: 0;" in layout_css
    assert "e.key === 'Escape'" in app_js

