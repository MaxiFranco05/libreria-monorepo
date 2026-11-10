/**
 * ============================================================================
 * Clientes View - Formulario de Alta, Edición y Consulta Individual (Ejercicio 2)
 * ============================================================================
 * Maneja la interacción del formulario de clientes, validación de nombre y email,
 * alta mediante POST /clientes/ (201), edición parcial mediante PATCH /clientes/{id},
 * manejo de error 409 (email duplicado) o 422, y consulta individual por ID
 * mediante GET /clientes/{id}.
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
    alertDiv.setAttribute('role', 'alert');
    alertDiv.textContent = message;
    container.appendChild(alertDiv);
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
        inputEl.focus();
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

    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Cargando clientes desde la API...</td></tr>';

    try {
      const clients = await root.LibreriaApp.api.getClientes({ limit: 100, offset: 0 });
      if (root.LibreriaApp.state && root.LibreriaApp.state.setClientes) {
        root.LibreriaApp.state.setClientes(clients);
      }

      if (!Array.isArray(clients) || clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;" class="text-muted">No hay clientes registrados en la base de datos.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      clients.forEach((client) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-family: var(--font-family-mono); font-weight: 600; color: var(--text-muted);">${client.id}</td>
          <td style="font-weight: 600;">${escapeHtml(client.nombre)}</td>
          <td><code>${escapeHtml(client.email)}</code></td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="btn btn-outline btn-pagination btn-editar-cliente" data-client-id="${client.id}">
              Editar
            </button>
          </td>
        `;

        tr.querySelector('.btn-editar-cliente').addEventListener('click', () => {
          openEditClientModal(client);
        });

        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error('[ClientesView] Error cargando tabla de clientes:', err);
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-error);">Error al consultar clientes: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  /**
   * Abre el modal accesible de edición de cliente para modificar nombre y correo
   * @param {Object} client
   */
  function openEditClientModal(client) {
    const modal = document.getElementById('modal-editar-cliente');
    if (!modal) return;

    const idInput = document.getElementById('editar-cliente-id');
    const nombreInput = document.getElementById('editar-cliente-nombre');
    const emailInput = document.getElementById('editar-cliente-email');
    const pillsContainer = document.getElementById('modal-editar-cliente-pills');
    const feedback = document.getElementById('editar-cliente-feedback');

    if (idInput) idInput.value = client.id;
    if (nombreInput) nombreInput.value = client.nombre || '';
    if (emailInput) emailInput.value = client.email || '';
    if (feedback) feedback.innerHTML = '';

    setFieldError('error-editar-cliente-nombre', 'editar-cliente-nombre', null);
    setFieldError('error-editar-cliente-email', 'editar-cliente-email', null);

    if (pillsContainer) {
      pillsContainer.innerHTML = `
        <span class="meta-pill">ID #${client.id}</span>
        <span class="meta-pill isbn-pill">${escapeHtml(client.email || '')}</span>
      `;
    }

    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
  }

  /**
   * Procesa la actualización parcial de un cliente (PATCH /clientes/{id})
   */
  async function handleEditClientSubmit(e) {
    e.preventDefault();
    const idInput = document.getElementById('editar-cliente-id');
    const nombreInput = document.getElementById('editar-cliente-nombre');
    const emailInput = document.getElementById('editar-cliente-email');
    const feedback = document.getElementById('editar-cliente-feedback');
    const modal = document.getElementById('modal-editar-cliente');
    const saveBtn = document.getElementById('btn-guardar-editar-cliente');

    const clientId = parseInt(idInput ? idInput.value : '', 10);
    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    if (isNaN(clientId) || clientId <= 0) return;

    setFieldError('error-editar-cliente-nombre', 'editar-cliente-nombre', null);
    setFieldError('error-editar-cliente-email', 'editar-cliente-email', null);

    if (!nombre) {
      if (feedback) feedback.innerHTML = '<div class="alert alert-error">El nombre del cliente no puede estar vacío.</div>';
      return;
    }
    if (!email) {
      if (feedback) feedback.innerHTML = '<div class="alert alert-error">El correo electrónico no puede estar vacío.</div>';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (feedback) feedback.innerHTML = '<div class="alert alert-error">Formato de correo electrónico inválido.</div>';
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';
    }

    try {
      await root.LibreriaApp.api.patchCliente(clientId, {
        nombre,
        email
      });

      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');

      setFeedback(`¡Cliente #${clientId} ("${nombre}") actualizado con éxito!`, 'success');
      await loadClientsTable();

      // Sincronizar selector de clientes en Punto de Venta si existe
      if (root.LibreriaApp.views.ventas && typeof root.LibreriaApp.views.ventas.loadClientOptions === 'function') {
        root.LibreriaApp.views.ventas.loadClientOptions();
      }

      // Si la consulta directa por ID está mostrando este mismo cliente, refrescarla
      const searchIdInput = document.getElementById('cliente-buscar-id');
      const resultDiv = document.getElementById('cliente-consulta-resultado');
      if (
        searchIdInput &&
        resultDiv &&
        parseInt(searchIdInput.value, 10) === clientId &&
        resultDiv.style &&
        resultDiv.style.display &&
        resultDiv.style.display !== 'none'
      ) {
        await searchClientById();
      }
    } catch (err) {
      console.error('[ClientesView] Error actualizando cliente:', err);
      if (feedback) {
        feedback.innerHTML = `<div class="alert alert-error">Error al guardar: ${escapeHtml(err.message)}</div>`;
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar Cambios';
      }
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

    // Modal de edición de cliente
    const editForm = document.getElementById('form-editar-cliente');
    if (editForm) {
      editForm.addEventListener('submit', handleEditClientSubmit);
    }

    const modalEditarCliente = document.getElementById('modal-editar-cliente');
    const closeEditBtn = document.getElementById('btn-cerrar-modal-editar-cliente');
    const cancelEditBtn = document.getElementById('btn-cancelar-editar-cliente');
    const closeEditModal = () => {
      if (!modalEditarCliente) return;
      if (typeof modalEditarCliente.close === 'function') modalEditarCliente.close();
      else modalEditarCliente.removeAttribute('open');
    };
    if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);

    loadClientsTable();
  }

  const clientesView = {
    init,
    loadClientsTable,
    searchClientById,
    openEditClientModal,
    handleEditClientSubmit,
    onActivate() {
      loadClientsTable();
    }
  };

  root.LibreriaApp.views.clientes = clientesView;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = clientesView;
  }
})();
