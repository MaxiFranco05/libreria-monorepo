/**
 * ============================================================================
 * Clientes View - Formulario de Alta y Nómina de Clientes (C-03)
 * ============================================================================
 * Maneja la interacción del formulario de clientes, validación de nombre y email único,
 * renderizado reactivo de la tabla de clientes y prevención de recarga (RN-CLI-01 a RN-CLI-04).
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.LibreriaApp = root.LibreriaApp || {};
  root.LibreriaApp.views = root.LibreriaApp.views || {};

  /**
   * Muestra un mensaje en el contenedor de feedback del formulario
   * @param {string} message - Texto del mensaje
   * @param {'success'|'error'} type - Tipo de mensaje
   */
  function setFeedback(message, type) {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('cliente-feedback');
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    if (!message) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = type === 'success' ? 'alert alert-success' : 'alert alert-error';
    alertDiv.textContent = message;
    container.appendChild(alertDiv);
  }

  /**
   * Muestra u oculta el mensaje de error de un campo específico
   * @param {string} errorElementId - ID del elemento de error
   * @param {string} inputId - ID del campo de entrada
   * @param {string|null} message - Mensaje de error
   */
  function setFieldError(errorElementId, inputId, message) {
    if (typeof document === 'undefined') return;
    const errorEl = document.getElementById(errorElementId);
    const inputEl = inputId ? document.getElementById(inputId) : null;

    if (errorEl) {
      if (message) {
        errorEl.textContent = message;
        errorEl.classList.add('active');
      } else {
        errorEl.textContent = '';
        errorEl.classList.remove('active');
      }
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

  /**
   * Limpia todos los errores visibles del formulario de clientes
   */
  function clearFieldErrors() {
    setFieldError('error-cliente-nombre', 'cliente-nombre', null);
    setFieldError('error-cliente-email', 'cliente-email', null);
  }

  /**
   * Renderiza la nómina de clientes en la tabla del DOM de forma segura (sin innerHTML)
   * @param {Array} [clientsList] - Lista de clientes a mostrar (opcional, consulta state por defecto)
   */
  function renderTable(clientsList) {
    if (typeof document === 'undefined') return;

    const state = root.LibreriaApp.state;
    const clients = clientsList || (state && typeof state.getClientes === 'function' ? state.getClientes() : (state ? state.getClients() : []));
    const tbody = document.getElementById('clientes-table-body');
    if (!tbody) return;

    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }

    if (!Array.isArray(clients) || clients.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 3;
      emptyCell.textContent = 'No hay clientes registrados en el sistema.';
      emptyCell.style.textAlign = 'center';
      emptyCell.style.color = 'var(--text-muted)';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    clients.forEach((client) => {
      const tr = document.createElement('tr');

      const tdId = document.createElement('td');
      tdId.textContent = client.id;
      tdId.style.fontFamily = 'monospace';

      const tdNombre = document.createElement('td');
      tdNombre.textContent = client.nombreCompleto;
      tdNombre.style.fontWeight = '500';

      const tdEmail = document.createElement('td');
      tdEmail.textContent = client.email;

      tr.appendChild(tdId);
      tr.appendChild(tdNombre);
      tr.appendChild(tdEmail);
      tbody.appendChild(tr);
    });
  }

  /**
   * Procesa el envío del formulario de clientes
   * @param {Event} [e] - Evento submit
   * @returns {{ success: boolean, error?: string, client?: Object }}
   */
  function handleFormSubmit(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    setFeedback('', 'success');
    clearFieldErrors();

    if (typeof document === 'undefined') {
      return { success: false, error: 'DOM no disponible' };
    }

    const state = root.LibreriaApp.state;
    const validators = root.LibreriaApp.validators;
    if (!state || !validators) {
      return { success: false, error: 'Módulos no disponibles' };
    }

    const nombreInput = document.getElementById('cliente-nombre');
    const emailInput = document.getElementById('cliente-email');

    const nombre = nombreInput ? nombreInput.value : '';
    const email = emailInput ? emailInput.value : '';

    const existingClients = typeof state.getClientes === 'function' ? state.getClientes() : state.getClients();

    const nameCheck = validators.validateRequired(nombre, 'El nombre completo');
    const emailCheck = validators.validateEmail(email, existingClients);

    let hasErrors = false;
    let firstInvalidInput = null;

    if (!nameCheck.valid) {
      hasErrors = true;
      setFieldError('error-cliente-nombre', 'cliente-nombre', nameCheck.error);
      if (!firstInvalidInput) firstInvalidInput = nombreInput;
    }

    if (!emailCheck.valid) {
      hasErrors = true;
      setFieldError('error-cliente-email', 'cliente-email', emailCheck.error);
      if (!firstInvalidInput) firstInvalidInput = emailInput;
    }

    if (hasErrors) {
      setFeedback('Por favor revise los errores señalados en el formulario.', 'error');
      if (firstInvalidInput && typeof firstInvalidInput.focus === 'function') {
        firstInvalidInput.focus();
      }
      return { success: false, error: 'Validación fallida' };
    }

    // Construcción de la nueva entidad Cliente
    const newClient = {
      id: `cli-${Date.now()}`,
      nombreCompleto: nameCheck.sanitizedValue,
      email: emailCheck.sanitizedValue
    };

    const added = typeof state.addCliente === 'function' ? state.addCliente(newClient) : state.addClient(newClient);
    if (!added) {
      setFeedback('Error inesperado al registrar el cliente en el estado.', 'error');
      return { success: false, error: 'No se pudo guardar el cliente' };
    }

    // Limpieza de formulario y feedback de éxito
    const form = document.getElementById('form-cliente');
    if (form) {
      form.reset();
    }
    clearFieldErrors();
    setFeedback(`¡El cliente "${newClient.nombreCompleto}" fue registrado exitosamente!`, 'success');

    return { success: true, client: newClient };
  }

  /**
   * Inicializa la vista de clientes
   */
  function init() {
    if (typeof document === 'undefined') return;

    renderTable();

    // Suscripción reactiva para refresco de tabla ante nuevos clientes (RN-CLI-04)
    const state = root.LibreriaApp.state;
    if (state && typeof state.subscribe === 'function') {
      state.subscribe((event) => {
        if (event === 'init' || event === 'client:added' || event === 'clientes:updated') {
          renderTable();
        }
      });
    }

    const form = document.getElementById('form-cliente');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
      form.addEventListener('reset', () => {
        setTimeout(clearFieldErrors, 0);
      });
    }

    const btnReset = document.getElementById('btn-reset-cliente');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        setFeedback('', 'success');
      });
    }
  }

  const clientesView = {
    init,
    renderTable,
    handleFormSubmit,
    setFeedback,
    clearFieldErrors
  };

  root.LibreriaApp.views.clientes = clientesView;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = clientesView;
  }
})();
