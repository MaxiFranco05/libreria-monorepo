/**
 * ============================================================================
 * Ventas View - Simulación de Ventas e Inmutabilidad Histórica (C-04)
 * ============================================================================
 * Maneja la composición de pedidos en borrador, control de no duplicidad,
 * edición/baja de renglones, cálculo financiero a dos decimales y confirmación
 * con congelamiento de precio histórico (RN-VNT-01 a RN-VNT-06, RN-VNT-08).
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.LibreriaApp = root.LibreriaApp || {};
  root.LibreriaApp.views = root.LibreriaApp.views || {};

  // Estado privado del pedido en borrador (draft)
  let _draft = {
    clienteId: '',
    renglones: []
  };

  /**
   * Obtiene una copia profunda del borrador actual
   * @returns {{ clienteId: string, renglones: Array }}
   */
  function getDraft() {
    return {
      clienteId: _draft.clienteId,
      renglones: _draft.renglones.map((r) => ({ ...r }))
    };
  }

  /**
   * Reinicia el borrador y restablece los controles de UI asociados
   */
  function resetDraft() {
    _draft = {
      clienteId: '',
      renglones: []
    };

    if (typeof document !== 'undefined') {
      const clientSelect = document.getElementById('venta-cliente');
      if (clientSelect) clientSelect.value = '';

      const bookSelect = document.getElementById('venta-libro');
      if (bookSelect) bookSelect.value = '';

      const quantityInput = document.getElementById('venta-cantidad');
      if (quantityInput) quantityInput.value = '1';

      renderDraftTable();
      updateTotalGeneral();
      clearFieldErrors();
    }
  }

  /**
   * Presenta un mensaje de feedback accesible (sin innerHTML dinámico)
   * @param {string} message - Texto descriptivo
   * @param {'success'|'error'|'info'} type - Tipo de notificación
   */
  function setFeedback(message, type = 'info') {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('venta-feedback');
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    if (!message) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = type === 'success'
      ? 'alert alert-success'
      : (type === 'error' ? 'alert alert-error' : 'alert alert-info');
    alertDiv.textContent = message;
    container.appendChild(alertDiv);
  }

  /**
   * Muestra u oculta el mensaje de error de un campo de formulario
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

  function clearFieldErrors() {
    setFieldError('error-venta-cliente', 'venta-cliente', null);
    setFieldError('error-venta-libro', 'venta-libro', null);
    setFieldError('error-venta-cantidad', 'venta-cantidad', null);
  }

  /**
   * Puebla el selector de clientes preservando la selección previa (RN-CLI-04, RN-VNT-01)
   */
  function populateClientSelect() {
    if (typeof document === 'undefined') return;
    const select = document.getElementById('venta-cliente');
    if (!select) return;

    const state = root.LibreriaApp.state;
    const clients = state && typeof state.getClients === 'function' ? state.getClients() : [];
    const prevValue = select.value;

    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Seleccione un cliente --';
    select.appendChild(defaultOption);

    let hasPrev = false;
    clients.forEach((c) => {
      if (!c) return;
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.nombreCompleto} (${c.email})`;
      if (c.id === prevValue) {
        hasPrev = true;
      }
      select.appendChild(opt);
    });

    if (hasPrev) {
      select.value = prevValue;
      _draft.clienteId = prevValue;
    } else {
      _draft.clienteId = '';
    }
  }

  /**
   * Puebla el selector de libros con título y precio formateado preservando selección previa (RN-LIB-06)
   */
  function populateBookSelect() {
    if (typeof document === 'undefined') return;
    const select = document.getElementById('venta-libro');
    if (!select) return;

    const state = root.LibreriaApp.state;
    const formatters = root.LibreriaApp.formatters;
    const books = state && typeof state.getBooks === 'function' ? state.getBooks() : [];
    const prevValue = select.value;

    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Seleccione un libro --';
    select.appendChild(defaultOption);

    let hasPrev = false;
    books.forEach((b) => {
      if (!b) return;
      const opt = document.createElement('option');
      opt.value = b.id;
      const priceStr = formatters && typeof formatters.formatCurrency === 'function'
        ? formatters.formatCurrency(b.precio)
        : `$${Number(b.precio).toFixed(2)}`;
      opt.textContent = `${b.titulo} (${priceStr})`;
      if (b.id === prevValue) {
        hasPrev = true;
      }
      select.appendChild(opt);
    });

    if (hasPrev) {
      select.value = prevValue;
    }
  }

  /**
   * Calcula el total general del pedido en borrador redondeado a 2 decimales (RN-VNT-05)
   * @returns {number} Sumatoria de subtotales
   */
  function calculateDraftTotal() {
    const formatters = root.LibreriaApp.formatters;
    const sum = _draft.renglones.reduce((acc, r) => acc + (Number(r.subtotal) || 0), 0);
    return formatters && typeof formatters.roundCurrency === 'function'
      ? formatters.roundCurrency(sum)
      : Math.round((sum + Number.EPSILON) * 100) / 100;
  }

  /**
   * Actualiza el visualizador de total general en la interfaz
   */
  function updateTotalGeneral() {
    if (typeof document === 'undefined') return;
    const totalEl = document.getElementById('venta-total-general');
    if (!totalEl) return;

    const total = calculateDraftTotal();
    const formatters = root.LibreriaApp.formatters;
    totalEl.textContent = formatters && typeof formatters.formatCurrency === 'function'
      ? formatters.formatCurrency(total)
      : `$${total.toFixed(2)}`;
  }

  /**
   * Agrega un libro al pedido en borrador con control de no duplicidad (RN-VNT-02, RN-VNT-03, RN-VNT-05)
   * @param {string} libroId - ID del libro seleccionado
   * @param {number|string} cantidad - Cantidad a comprar (entero >= 1)
   * @returns {{ success: boolean, error?: string, draft?: Object }}
   */
  function addToDraft(libroId, cantidad) {
    const state = root.LibreriaApp.state;
    const validators = root.LibreriaApp.validators;
    const formatters = root.LibreriaApp.formatters;

    clearFieldErrors();

    // 1. Validar libro seleccionado
    const books = state && typeof state.getBooks === 'function' ? state.getBooks() : [];
    const bookCheck = validators && typeof validators.validateSaleBookSelection === 'function'
      ? validators.validateSaleBookSelection(libroId, books)
      : { valid: Boolean(libroId), error: 'Debe seleccionar un libro para agregar al pedido.' };

    if (!bookCheck.valid) {
      setFieldError('error-venta-libro', 'venta-libro', bookCheck.error);
      setFeedback(bookCheck.error, 'error');
      return { success: false, error: bookCheck.error };
    }

    // 2. Validar cantidad numérica entera >= 1
    const qtyCheck = validators && typeof validators.validateSaleQuantity === 'function'
      ? validators.validateSaleQuantity(cantidad)
      : { valid: Number.isInteger(Number(cantidad)) && Number(cantidad) >= 1, sanitizedValue: Number(cantidad), error: 'La cantidad debe ser un número entero mayor o igual a 1.' };

    if (!qtyCheck.valid) {
      setFieldError('error-venta-cantidad', 'venta-cantidad', qtyCheck.error);
      setFeedback(qtyCheck.error, 'error');
      return { success: false, error: qtyCheck.error };
    }

    const cleanBookId = bookCheck.sanitizedValue || libroId;
    const cleanQty = qtyCheck.sanitizedValue || Number(cantidad);

    const book = state && typeof state.getBookById === 'function' ? state.getBookById(cleanBookId) : null;
    if (!book) {
      const err = 'El libro seleccionado no se encuentra en el catálogo.';
      setFeedback(err, 'error');
      return { success: false, error: err };
    }

    const precioUnitario = Number(book.precio);
    const titulo = String(book.titulo);

    // 3. Control de no duplicidad en el borrador (RN-VNT-03)
    const existingIndex = _draft.renglones.findIndex((r) => r.libroId === cleanBookId);

    if (existingIndex !== -1) {
      // Incrementar cantidad existente
      const existingRow = _draft.renglones[existingIndex];
      existingRow.cantidad += cleanQty;
      const rawSubtotal = existingRow.cantidad * existingRow.precioUnitario;
      existingRow.subtotal = formatters && typeof formatters.roundCurrency === 'function'
        ? formatters.roundCurrency(rawSubtotal)
        : Math.round((rawSubtotal + Number.EPSILON) * 100) / 100;

      setFeedback(
        `Se incrementaron ${cleanQty} unidad(es) de «${existingRow.titulo}». Cantidad acumulada: ${existingRow.cantidad}.`,
        'info'
      );
    } else {
      // Nuevo renglón
      const rawSubtotal = cleanQty * precioUnitario;
      const subtotal = formatters && typeof formatters.roundCurrency === 'function'
        ? formatters.roundCurrency(rawSubtotal)
        : Math.round((rawSubtotal + Number.EPSILON) * 100) / 100;

      _draft.renglones.push({
        libroId: cleanBookId,
        titulo,
        precioUnitario,
        cantidad: cleanQty,
        subtotal
      });

      setFeedback(`«${titulo}» se agregó al pedido correctamente.`, 'success');
    }

    if (typeof document !== 'undefined') {
      const bookSelect = document.getElementById('venta-libro');
      if (bookSelect) bookSelect.value = '';

      const quantityInput = document.getElementById('venta-cantidad');
      if (quantityInput) quantityInput.value = '1';

      renderDraftTable();
      updateTotalGeneral();
    }

    return { success: true, draft: getDraft() };
  }

  /**
   * Modifica en vivo la cantidad de un renglón en el borrador (RN-VNT-04)
   * @param {string} libroId - ID del libro en el renglón
   * @param {number|string} newQuantity - Nueva cantidad entera >= 1
   * @returns {boolean} True si se actualizó, false si fue inválido
   */
  function updateDraftQuantity(libroId, newQuantity) {
    const validators = root.LibreriaApp.validators;
    const formatters = root.LibreriaApp.formatters;

    const qtyCheck = validators && typeof validators.validateSaleQuantity === 'function'
      ? validators.validateSaleQuantity(newQuantity)
      : { valid: Number.isInteger(Number(newQuantity)) && Number(newQuantity) >= 1, sanitizedValue: Number(newQuantity) };

    if (!qtyCheck.valid) {
      setFeedback('La cantidad debe ser un número entero mayor o igual a 1.', 'error');
      if (typeof document !== 'undefined') {
        renderDraftTable();
      }
      return false;
    }

    const row = _draft.renglones.find((r) => r.libroId === libroId);
    if (!row) return false;

    row.cantidad = qtyCheck.sanitizedValue;
    const rawSubtotal = row.cantidad * row.precioUnitario;
    row.subtotal = formatters && typeof formatters.roundCurrency === 'function'
      ? formatters.roundCurrency(rawSubtotal)
      : Math.round((rawSubtotal + Number.EPSILON) * 100) / 100;

    if (typeof document !== 'undefined') {
      renderDraftTable();
      updateTotalGeneral();
    }

    return true;
  }

  /**
   * Elimina un renglón individual del borrador (RN-VNT-04)
   * @param {string} libroId - ID del libro a eliminar
   * @returns {boolean} True si se eliminó
   */
  function removeFromDraft(libroId) {
    const index = _draft.renglones.findIndex((r) => r.libroId === libroId);
    if (index === -1) return false;

    const removed = _draft.renglones.splice(index, 1)[0];
    setFeedback(`«${removed.titulo}» fue eliminado del pedido.`, 'info');

    if (typeof document !== 'undefined') {
      renderDraftTable();
      updateTotalGeneral();
    }

    return true;
  }

  /**
   * Renderiza la tabla de borrador de forma segura en el DOM (sin innerHTML)
   */
  function renderDraftTable() {
    if (typeof document === 'undefined') return;
    const tbody = document.getElementById('borrador-table-body');
    if (!tbody) return;

    const formatters = root.LibreriaApp.formatters;

    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }

    if (_draft.renglones.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.id = 'borrador-empty-cell';
      td.style.textAlign = 'center';
      td.style.padding = '2rem 1rem';
      td.style.color = 'var(--text-muted)';
      td.style.fontStyle = 'italic';
      td.textContent = 'El pedido en borrador está vacío. Seleccione libros para comenzar.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    _draft.renglones.forEach((r) => {
      const tr = document.createElement('tr');

      // Columna 1: Libro (Título)
      const tdLibro = document.createElement('td');
      tdLibro.textContent = r.titulo;
      tr.appendChild(tdLibro);

      // Columna 2: Precio Unitario
      const tdPrecio = document.createElement('td');
      tdPrecio.textContent = formatters && typeof formatters.formatCurrency === 'function'
        ? formatters.formatCurrency(r.precioUnitario)
        : `$${Number(r.precioUnitario).toFixed(2)}`;
      tr.appendChild(tdPrecio);

      // Columna 3: Cantidad con input numérico accesible
      const tdCant = document.createElement('td');
      const inputCant = document.createElement('input');
      inputCant.type = 'number';
      inputCant.className = 'cart-qty-input';
      inputCant.min = '1';
      inputCant.step = '1';
      inputCant.value = String(r.cantidad);
      inputCant.setAttribute('aria-label', `Cantidad para ${r.titulo}`);
      inputCant.addEventListener('change', (e) => {
        updateDraftQuantity(r.libroId, e.target.value);
      });
      tdCant.appendChild(inputCant);
      tr.appendChild(tdCant);

      // Columna 4: Subtotal
      const tdSubtotal = document.createElement('td');
      tdSubtotal.textContent = formatters && typeof formatters.formatCurrency === 'function'
        ? formatters.formatCurrency(r.subtotal)
        : `$${Number(r.subtotal).toFixed(2)}`;
      tr.appendChild(tdSubtotal);

      // Columna 5: Botón eliminar
      const tdAcciones = document.createElement('td');
      const btnDelete = document.createElement('button');
      btnDelete.type = 'button';
      btnDelete.className = 'btn-delete-item';
      btnDelete.textContent = 'Eliminar';
      btnDelete.setAttribute('aria-label', `Eliminar ${r.titulo} del pedido`);
      btnDelete.addEventListener('click', () => {
        removeFromDraft(r.libroId);
      });
      tdAcciones.appendChild(btnDelete);
      tr.appendChild(tdAcciones);

      tbody.appendChild(tr);
    });
  }

  /**
   * Confirma la orden de venta con validaciones, snapshot histórico y reseteo (RN-VNT-01, RN-VNT-02, RN-VNT-06, RN-VNT-08)
   * @param {string} [clienteIdOverride] - ID opcional de cliente para testing programático
   * @returns {{ success: boolean, error?: string, sale?: Object }}
   */
  function confirmSale(clienteIdOverride) {
    const state = root.LibreriaApp.state;
    const validators = root.LibreriaApp.validators;
    const formatters = root.LibreriaApp.formatters;

    clearFieldErrors();

    // Resolver clienteId
    let clienteId = clienteIdOverride;
    if (clienteId === undefined && typeof document !== 'undefined') {
      const select = document.getElementById('venta-cliente');
      clienteId = select ? select.value : _draft.clienteId;
    }

    // 1. Validar cliente (RN-VNT-01)
    const clients = state && typeof state.getClients === 'function' ? state.getClients() : [];
    const clientCheck = validators && typeof validators.validateSaleClient === 'function'
      ? validators.validateSaleClient(clienteId, clients)
      : { valid: Boolean(clienteId), error: 'Debe seleccionar un cliente para la venta.' };

    if (!clientCheck.valid) {
      setFieldError('error-venta-cliente', 'venta-cliente', clientCheck.error);
      setFeedback(clientCheck.error, 'error');
      return { success: false, error: clientCheck.error };
    }

    // 2. Validar renglones (RN-VNT-02)
    const rowsCheck = validators && typeof validators.validateSaleRows === 'function'
      ? validators.validateSaleRows(_draft.renglones)
      : { valid: _draft.renglones.length > 0, error: 'La venta debe incluir al menos un libro en el pedido.' };

    if (!rowsCheck.valid) {
      setFeedback(rowsCheck.error, 'error');
      return { success: false, error: rowsCheck.error };
    }

    // 3. Crear entidad Venta con snapshot congelado (RN-VNT-06)
    const saleId = state && typeof state.getNextSaleId === 'function'
      ? state.getNextSaleId()
      : `VNT-${Date.now()}`;

    const fechaStr = formatters && typeof formatters.formatDateTime === 'function'
      ? formatters.formatDateTime(new Date())
      : new Date().toISOString();

    const total = calculateDraftTotal();

    const sale = {
      id: saleId,
      fecha: fechaStr,
      clienteId: clientCheck.sanitizedValue || clienteId,
      total,
      renglones: _draft.renglones.map((r) => ({
        libroId: r.libroId,
        titulo: r.titulo,
        precioUnitario: r.precioUnitario,
        cantidad: r.cantidad,
        subtotal: r.subtotal
      }))
    };

    // 4. Registrar en el estado centralizado
    if (state && typeof state.addVenta === 'function') {
      state.addVenta(sale);
    } else if (state && typeof state.addSale === 'function') {
      state.addSale(sale);
    }

    // 5. Vaciar borrador y notificar éxito accesible (RN-VNT-08)
    const formattedTotal = formatters && typeof formatters.formatCurrency === 'function'
      ? formatters.formatCurrency(total)
      : `$${total.toFixed(2)}`;

    resetDraft();
    setFeedback(`¡Venta ${sale.id} confirmada exitosamente por un total de ${formattedTotal}!`, 'success');

    return { success: true, sale };
  }

  /**
   * Inicializa la vista de ventas, suscribe eventos reactivos y vincula listeners de UI
   */
  function init() {
    if (typeof document === 'undefined') return;

    // Suscripción reactiva a cambios de catálogo y clientes (RN-CLI-04, RN-LIB-06)
    const state = root.LibreriaApp.state;
    if (state && typeof state.on === 'function') {
      state.on('clientes:updated', () => {
        populateClientSelect();
      });
      state.on('libros:updated', () => {
        populateBookSelect();
      });
    }

    // Población inicial de selectores
    populateClientSelect();
    populateBookSelect();
    renderDraftTable();
    updateTotalGeneral();

    // Listener para cliente
    const clientSelect = document.getElementById('venta-cliente');
    if (clientSelect) {
      clientSelect.addEventListener('change', (e) => {
        _draft.clienteId = e.target.value;
        if (e.target.value) {
          setFieldError('error-venta-cliente', 'venta-cliente', null);
        }
      });
    }

    // Listener botón "Agregar al pedido"
    const btnAdd = document.getElementById('btn-agregar-renglon');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const bookSelect = document.getElementById('venta-libro');
        const qtyInput = document.getElementById('venta-cantidad');
        const libroId = bookSelect ? bookSelect.value : '';
        const cantidad = qtyInput ? qtyInput.value : 1;
        addToDraft(libroId, cantidad);
      });
    }

    // Listener botón "Confirmar Venta"
    const btnConfirm = document.getElementById('btn-confirmar-venta');
    if (btnConfirm) {
      btnConfirm.addEventListener('click', (e) => {
        e.preventDefault();
        confirmSale();
      });
    }
  }

  const ventasView = {
    init,
    getDraft,
    resetDraft,
    populateClientSelect,
    populateBookSelect,
    calculateDraftTotal,
    addToDraft,
    updateDraftQuantity,
    removeFromDraft,
    renderDraftTable,
    confirmSale,
    setFeedback
  };

  root.LibreriaApp.views.ventas = ventasView;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ventasView;
  }
})();
