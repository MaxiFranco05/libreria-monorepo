/**
 * ============================================================================
 * Clientes View - Formulario de Alta y Consulta Individual (Ejercicio 2)
 * ============================================================================
 * Maneja la interacción del formulario de clientes, validación de nombre y email,
 * alta mediante POST /clientes/ (201), manejo de error 409 (email duplicado) o 422,
 * y consulta individual por ID mediante GET /clientes/{id}.
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.LibreriaApp = root.LibreriaApp || {};
  root.LibreriaApp.views = root.LibreriaApp.views || {};

  /**
   * Muestra mensaje en el contenedor de feedback del formulario
   */
  function setFeedback(message, type) {
    const container = document.getElementById('cliente-feedback');
    if (!container) return;
    container.innerHTML = '';
    if (!message) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = type === 'success' ? 'alert alert-success' : 'alert alert-error';
    alertDiv.textContent = message;
    container.appendChild(alertDiv);
  }

  function setFieldError(errorElementId, inputId, message) {
    const errorEl = document.getElementById(errorElementId);
    const inputEl = inputId ? document.getElementById(inputId) : null;

    if (errorEl) {
      errorEl.textContent = message || '';
      if (message) errorEl.classList.add('active');
      else errorEl.classList.remove('active');
    }

    if (inputEl) {
      if (message) {
        inputEl.classList.add('is-invalid');
        inputEl.setAttribute('aria-invalid', 'true');
      } else {
        inputEl.classList.remove('is-invalid');
        inputEl.removeAttribute('aria-invalid');
      }
    }
  }

  function clearAllErrors() {
    setFieldError('error-cliente-nombre', 'cliente-nombre', null);
    setFieldError('error-cliente-email', 'cliente-email', null);
    setFeedback('', 'success');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Carga y renderiza la lista de clientes desde la API mediante GET /clientes/
   */
  async function loadClientsTable() {
    const tbody = document.getElementById('clientes-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Cargando clientes desde la API...</td></tr>';

    try {
      const clients = await root.LibreriaApp.api.getClientes({ limit: 100, offset: 0 });
      if (root.LibreriaApp.state && root.LibreriaApp.state.setClientes) {
        root.LibreriaApp.state.setClientes(clients);
      }

      if (!Array.isArray(clients) || clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;" class="text-muted">No hay clientes registrados en la base de datos.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      clients.forEach((client) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${client.id}</strong></td>
          <td>${escapeHtml(client.nombre)}</td>
          <td><code>${escapeHtml(client.email)}</code></td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error('[ClientesView] Error cargando tabla de clientes:', err);
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--color-error);">Error al consultar clientes: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  /**
   * Consulta individual por ID (GET /clientes/{id}) exigida por consigna
   */
  async function searchClientById() {
    const idInput = document.getElementById('cliente-buscar-id');
    const resultDiv = document.getElementById('cliente-consulta-resultado');
    if (!idInput || !resultDiv) return;

    const clienteId = parseInt(idInput.value, 10);
    if (isNaN(clienteId) || clienteId <= 0) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<span style="color: var(--color-error);">Ingrese un ID numérico de cliente válido (>= 1).</span>';
      return;
    }

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<span style="color: var(--text-secondary);">Buscando ficha de cliente...</span>';

    try {
      const client = await root.LibreriaApp.api.getCliente(clienteId);
      resultDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <strong>${escapeHtml(client.nombre)}</strong> &lt;<code>${escapeHtml(client.email)}</code>&gt;
            <span style="margin-left: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">(ID: #${client.id})</span>
          </div>
          <span class="badge" style="background-color: var(--color-success-bg); color: var(--color-success); border-color: var(--color-success);">Cliente Verificado</span>
        </div>
      `;
    } catch (err) {
      resultDiv.innerHTML = `<span style="color: var(--color-error);">✗ ${escapeHtml(err.message)}</span>`;
    }
  }

  /**
   * Procesa el formulario de alta de cliente mediante POST /clientes/
   */
  async function handleSubmit(e) {
    e.preventDefault();
    clearAllErrors();

    const nombreInput = document.getElementById('cliente-nombre');
    const emailInput = document.getElementById('cliente-email');
    const submitBtn = document.getElementById('btn-submit-cliente');

    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    let hasErrors = false;
    if (!nombre) {
      setFieldError('error-cliente-nombre', 'cliente-nombre', 'El nombre completo es obligatorio.');
      hasErrors = true;
    }
    if (!email) {
      setFieldError('error-cliente-email', 'cliente-email', 'El correo electrónico es obligatorio.');
      hasErrors = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('error-cliente-email', 'cliente-email', 'Formato de correo electrónico inválido.');
      hasErrors = true;
    }

    if (hasErrors) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Registrando cliente...';
    }

    try {
      const createdClient = await root.LibreriaApp.api.createCliente({ nombre, email });

      setFeedback(`¡Cliente "${createdClient.nombre}" registrado con éxito!`, 'success');

      const form = document.getElementById('form-cliente');
      if (form) form.reset();

      // Recargar tabla de clientes
      await loadClientsTable();

      // Si la vista de ventas está inicializada, refrescar su selector de clientes
      if (root.LibreriaApp.views.ventas && typeof root.LibreriaApp.views.ventas.loadClientOptions === 'function') {
        root.LibreriaApp.views.ventas.loadClientOptions();
      }
    } catch (err) {
      console.error('[ClientesView] Error al registrar cliente:', err);
      // Mensaje de error 409 (email duplicado) o 422
      setFeedback(`No fue posible registrar el cliente: ${err.message}`, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Registrar Cliente';
      }
    }
  }

  function init() {
    const form = document.getElementById('form-cliente');
    if (form) {
      form.addEventListener('submit', handleSubmit);
      form.addEventListener('reset', clearAllErrors);
    }

    const searchBtn = document.getElementById('btn-buscar-cliente-id');
    if (searchBtn) {
      searchBtn.addEventListener('click', searchClientById);
    }

    const refreshBtn = document.getElementById('btn-refresh-clientes');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadClientsTable);
    }

    loadClientsTable();
  }

  const clientesView = {
    init,
    loadClientsTable,
    searchClientById,
    onActivate() {
      loadClientsTable();
    }
  };

  root.LibreriaApp.views.clientes = clientesView;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = clientesView;
  }
})();
