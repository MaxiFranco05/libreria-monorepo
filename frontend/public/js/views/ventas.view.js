/**
 * ============================================================================
 * Ventas View - Registro y Confirmación de Ventas (Ejercicio 3)
 * ============================================================================
 * Maneja la selección de cliente (con búsqueda por ID), agregación de libros,
 * edición y eliminación de renglones en borrador, prevención de libros duplicados,
 * envío a POST /ventas/ (201), visualización de precios unitarios y subtotales
 * devueltos por la API, y conservación del borrador ante errores (409 o 422).
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.LibreriaApp = root.LibreriaApp || {};
  root.LibreriaApp.views = root.LibreriaApp.views || {};

  // Estado del pedido en borrador en memoria
  let _draft = {
    cliente_id: null,
    renglones: [] // { libro_id, titulo, precio, cantidad, subtotal }
  };

  let isSubmitting = false;

  function setFeedback(message, type = 'info') {
    const container = document.getElementById('venta-feedback');
    if (!container) return;
    container.innerHTML = '';
    if (!message) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = type === 'success'
      ? 'alert alert-success'
      : (type === 'error' ? 'alert alert-error' : 'alert alert-info');
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

  function clearFieldErrors() {
    setFieldError('error-venta-cliente', 'venta-cliente', null);
    setFieldError('error-venta-libro', 'venta-libro', null);
    setFieldError('error-venta-cantidad', 'venta-cantidad', null);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Carga la lista de clientes en el selector
   */
  async function loadClientOptions() {
    const select = document.getElementById('venta-cliente');
    if (!select) return;

    try {
      const clients = await root.LibreriaApp.api.getClientes({ limit: 100 });
      const currentSelected = select.value;
      select.innerHTML = '<option value="">-- Seleccione un cliente --</option>';

      clients.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `[ID ${c.id}] ${c.nombre} (${c.email})`;
        select.appendChild(opt);
      });

      if (currentSelected) select.value = currentSelected;
    } catch (err) {
      console.warn('[VentasView] Error cargando clientes para select:', err);
    }
  }

  /**
   * Carga la lista de libros en el selector
   */
  async function loadBookOptions() {
    const select = document.getElementById('venta-libro');
    if (!select) return;

    try {
      const formatCurrency = root.LibreriaApp.formatters?.formatCurrency || ((v) => `$${Number(v).toFixed(2)}`);
      const books = await root.LibreriaApp.api.getLibros({ limit: 100 });
      select.innerHTML = '<option value="">-- Seleccione un libro --</option>';

      books.forEach((b) => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.dataset.precio = b.precio;
        opt.dataset.titulo = b.titulo;
        opt.dataset.stock = b.stock;
        opt.textContent = `${b.titulo} — ${formatCurrency(b.precio)} (Stock: ${b.stock} u.)`;
        select.appendChild(opt);
      });
    } catch (err) {
      console.warn('[VentasView] Error cargando libros para select:', err);
    }
  }

  /**
   * Verifica cliente por ID (GET /clientes/{id}) y lo selecciona en el dropdown
   */
  async function verifyClientById() {
    const idInput = document.getElementById('venta-cliente-id-search');
    const select = document.getElementById('venta-cliente');
    if (!idInput || !select) return;

    const clienteId = parseInt(idInput.value, 10);
    if (isNaN(clienteId) || clienteId <= 0) {
      setFieldError('error-venta-cliente', 'venta-cliente', 'Ingrese un ID de cliente válido (>= 1).');
      return;
    }

    try {
      const client = await root.LibreriaApp.api.getCliente(clienteId);
      // Asegurar que exista la opción en el select
      let option = Array.from(select.options).find((opt) => opt.value === String(client.id));
      if (!option) {
        option = document.createElement('option');
        option.value = client.id;
        option.textContent = `[ID ${client.id}] ${client.nombre} (${client.email})`;
        select.appendChild(option);
      }
      select.value = String(client.id);
      _draft.cliente_id = client.id;
      setFieldError('error-venta-cliente', 'venta-cliente', null);
      setFeedback(`Cliente ID ${client.id} (${client.nombre}) seleccionado.`, 'info');
      idInput.value = '';
    } catch (err) {
      setFieldError('error-venta-cliente', 'venta-cliente', `Cliente no encontrado: ${err.message}`);
    }
  }

  /**
   * Agrega un libro al borrador (controlando que no haya libros repetidos)
   */
  function addRowToDraft() {
    clearFieldErrors();
    const bookSelect = document.getElementById('venta-libro');
    const quantityInput = document.getElementById('venta-cantidad');
    if (!bookSelect || !quantityInput) return;

    const libroId = parseInt(bookSelect.value, 10);
    const cantidad = parseInt(quantityInput.value, 10);

    if (isNaN(libroId) || libroId <= 0) {
      setFieldError('error-venta-libro', 'venta-libro', 'Debe seleccionar un libro del catálogo.');
      return;
    }

    if (isNaN(cantidad) || cantidad <= 0) {
      setFieldError('error-venta-cantidad', 'venta-cantidad', 'La cantidad debe ser un entero positivo mayor o igual a 1.');
      return;
    }

    const selectedOption = bookSelect.options[bookSelect.selectedIndex];
    const titulo = selectedOption ? selectedOption.dataset.titulo : 'Libro';
    const precio = selectedOption ? parseFloat(selectedOption.dataset.precio) : 0;
    const stock = selectedOption ? parseInt(selectedOption.dataset.stock, 10) : 0;

    // Validación estricta de stock disponible
    if (cantidad > stock) {
      setFieldError('error-venta-cantidad', 'venta-cantidad', `Stock insuficiente: sólo hay ${stock} ejemplares disponibles de "${titulo}".`);
      return;
    }

    // Regla de negocio: un solo renglón por libro (no duplicar libro_id)
    const existingIndex = _draft.renglones.findIndex((r) => r.libro_id === libroId);
    if (existingIndex !== -1) {
      const nuevaCantidad = _draft.renglones[existingIndex].cantidad + cantidad;
      if (nuevaCantidad > stock) {
        setFieldError('error-venta-cantidad', 'venta-cantidad', `No podés agregar más: el pedido alcanzaría ${nuevaCantidad} u. y el stock máximo es de ${stock} u.`);
        return;
      }
      _draft.renglones[existingIndex].cantidad = nuevaCantidad;
      _draft.renglones[existingIndex].subtotal = nuevaCantidad * _draft.renglones[existingIndex].precio;
      setFeedback(`Se incrementó la cantidad del libro "${titulo}" en el borrador (${nuevaCantidad} u.).`, 'info');
    } else {
      _draft.renglones.push({
        libro_id: libroId,
        titulo,
        precio,
        cantidad,
        stock,
        subtotal: cantidad * precio
      });
    }

    renderDraftTable();
    bookSelect.value = '';
    quantityInput.value = '1';
  }

  /**
   * Renderiza la tabla de renglones en borrador
   */
  function renderDraftTable() {
    const tbody = document.getElementById('borrador-table-body');
    const totalEl = document.getElementById('venta-total-general');
    if (!tbody) return;

    const formatCurrency = root.LibreriaApp.formatters?.formatCurrency || ((v) => `$${Number(v).toFixed(2)}`);

    if (_draft.renglones.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;" class="text-muted">El pedido no tiene renglones todavía.</td></tr>';
      if (totalEl) totalEl.textContent = '$0.00';
      return;
    }

    tbody.innerHTML = '';
    let total = 0;

    _draft.renglones.forEach((renglon, index) => {
      total += renglon.subtotal;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(renglon.titulo)}</strong></td>
        <td>${formatCurrency(renglon.precio)}</td>
        <td style="width: 120px;">
          <input type="number" class="form-control form-control-sm" min="1" step="1" value="${renglon.cantidad}" data-index="${index}" style="width: 80px; display: inline-block;">
        </td>
        <td style="font-weight: 600;">${formatCurrency(renglon.subtotal)}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-pagination" style="color: var(--color-error);" data-index="${index}" aria-label="Eliminar renglón">
            Quitar
          </button>
        </td>
      `;

      // Evento cambiar cantidad
      const qtyInput = tr.querySelector('input');
      qtyInput.addEventListener('change', (e) => {
        const newQty = parseInt(e.target.value, 10);
        if (isNaN(newQty) || newQty <= 0) {
          e.target.value = renglon.cantidad;
          return;
        }
        if (renglon.stock !== undefined && newQty > renglon.stock) {
          setFeedback(`Stock insuficiente para "${renglon.titulo}": sólo hay ${renglon.stock} ejemplares disponibles.`, 'error');
          e.target.value = renglon.cantidad;
          return;
        }
        renglon.cantidad = newQty;
        renglon.subtotal = renglon.cantidad * renglon.precio;
        renderDraftTable();
      });

      // Evento quitar renglón
      const removeBtn = tr.querySelector('button');
      removeBtn.addEventListener('click', () => {
        _draft.renglones.splice(index, 1);
        renderDraftTable();
      });

      tbody.appendChild(tr);
    });

    if (totalEl) {
      totalEl.textContent = formatCurrency(total);
    }
  }

  /**
   * Limpia el borrador tras una confirmación exitosa
   */
  function resetDraft() {
    _draft = {
      cliente_id: null,
      renglones: []
    };
    const clientSelect = document.getElementById('venta-cliente');
    if (clientSelect) clientSelect.value = '';
    const bookSelect = document.getElementById('venta-libro');
    if (bookSelect) bookSelect.value = '';
    const quantityInput = document.getElementById('venta-cantidad');
    if (quantityInput) quantityInput.value = '1';
    renderDraftTable();
    clearFieldErrors();
  }

  /**
   * Muestra el resumen de la venta confirmada devuelta por la API (201)
   * Mostrando precios unitarios copiados del catálogo, subtotales y total de la respuesta
   * @param {Object} venta - VentaRead
   */
  function renderConfirmedSaleSummary(venta) {
    const container = document.getElementById('venta-confirmada-resumen');
    if (!container) return;

    const formatCurrency = root.LibreriaApp.formatters?.formatCurrency || ((v) => `$${Number(v).toFixed(2)}`);
    const formatDateTime = root.LibreriaApp.formatters?.formatDateTime || ((v) => String(v));

    container.style.display = 'block';
    container.innerHTML = `
      <div class="confirmed-sale-summary">
        <h4 class="confirmed-sale-title">✓ Comprobante de Venta Emitido #${venta.id}</h4>
        <p style="margin-bottom: 0.5rem;">
          <strong>Fecha:</strong> ${formatDateTime(venta.fecha)} | 
          <strong>Cliente:</strong> ${escapeHtml(venta.cliente?.nombre || 'N/D')} (${escapeHtml(venta.cliente?.email || 'N/D')})
        </p>
        <table class="table" style="background: var(--bg-surface); border-radius: var(--radius-sm); margin-top: 0.75rem; font-size: 0.9rem;">
          <thead>
            <tr>
              <th>Libro</th>
              <th>Precio Unitario</th>
              <th>Cantidad</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${(venta.renglones || []).map((r) => `
              <tr>
                <td><strong>${escapeHtml(r.titulo)}</strong></td>
                <td>${formatCurrency(r.precio_unitario)}</td>
                <td>${r.cantidad} u.</td>
                <td style="font-weight: 600;">${formatCurrency(r.subtotal)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: var(--bg-surface-alt); font-weight: 700;">
              <td colspan="3" style="text-align: right;">Total Facturado:</td>
              <td style="color: var(--color-success); font-size: 1.15rem;">${formatCurrency(venta.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  /**
   * Confirma la venta mediante POST /ventas/
   */
  async function confirmSale() {
    clearFieldErrors();
    const summaryContainer = document.getElementById('venta-confirmada-resumen');
    if (summaryContainer) summaryContainer.style.display = 'none';

    const clientSelect = document.getElementById('venta-cliente');
    const clienteId = clientSelect ? parseInt(clientSelect.value, 10) : NaN;

    if (isNaN(clienteId) || clienteId <= 0) {
      setFieldError('error-venta-cliente', 'venta-cliente', 'Debe seleccionar o verificar un cliente comprador.');
      return;
    }

    if (_draft.renglones.length === 0) {
      setFeedback('Debe incluir al menos un renglón de libro en el pedido antes de confirmar.', 'error');
      return;
    }

    // Validar cantidades enteras positivas y no duplicados
    const libroIds = _draft.renglones.map((r) => r.libro_id);
    const hasDuplicates = libroIds.length !== new Set(libroIds).size;
    if (hasDuplicates) {
      setFeedback('Error: el borrador contiene libros repetidos. Cada libro debe figurar en un único renglón.', 'error');
      return;
    }

    for (const r of _draft.renglones) {
      if (isNaN(r.cantidad) || r.cantidad <= 0) {
        setFeedback(`La cantidad para "${r.titulo}" debe ser un entero positivo mayor a 0.`, 'error');
        return;
      }
      if (r.stock !== undefined && r.cantidad > r.stock) {
        setFeedback(`No se puede confirmar: "${r.titulo}" solicita ${r.cantidad} u. pero sólo hay ${r.stock} u. en stock.`, 'error');
        return;
      }
    }

    // Deshabilitar botón mientras se procesa el envío
    const confirmBtn = document.getElementById('btn-confirmar-venta');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Emitiendo comprobante...';
    }
    isSubmitting = true;

    const payload = {
      cliente_id: clienteId,
      renglones: _draft.renglones.map((r) => ({
        libro_id: r.libro_id,
        cantidad: r.cantidad
      }))
    };

    try {
      const responseVenta = await root.LibreriaApp.api.createVenta(payload);

      setFeedback(`¡Venta #${responseVenta.id} registrada exitosamente!`, 'success');
      renderConfirmedSaleSummary(responseVenta);

      // Limpiar formulario después de confirmar y actualizar el historial
      resetDraft();

      // Recargar opciones de libros y catálogo para reflejar de inmediato el stock restado
      await loadBookOptions();
      if (root.LibreriaApp.views.catalogo && typeof root.LibreriaApp.views.catalogo.loadCatalog === 'function') {
        root.LibreriaApp.views.catalogo.loadCatalog({ resetOffset: false });
      }
      if (root.LibreriaApp.views.libros && typeof root.LibreriaApp.views.libros.loadBooksTable === 'function') {
        root.LibreriaApp.views.libros.loadBooksTable();
      }

      if (root.LibreriaApp.views.historial && typeof root.LibreriaApp.views.historial.loadSales === 'function') {
        root.LibreriaApp.views.historial.loadSales({ resetOffset: true });
      }
    } catch (err) {
      console.error('[VentasView] Error al confirmar venta:', err);
      // Mostrar mensaje del servidor ante 409 o 422 y CONSERVAR EL BORRADOR
      setFeedback(`No fue posible procesar la venta: ${err.message}. El borrador se conserva para corrección.`, 'error');
    } finally {
      isSubmitting = false;
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirmar Venta';
      }
    }
  }

  function init() {
    const addBtn = document.getElementById('btn-agregar-renglon');
    if (addBtn) addBtn.addEventListener('click', addRowToDraft);

    const confirmBtn = document.getElementById('btn-confirmar-venta');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmSale);

    const verifyClientBtn = document.getElementById('btn-venta-verificar-cliente');
    if (verifyClientBtn) verifyClientBtn.addEventListener('click', verifyClientById);

    const clientSelect = document.getElementById('venta-cliente');
    if (clientSelect) {
      clientSelect.addEventListener('change', (e) => {
        _draft.cliente_id = e.target.value ? parseInt(e.target.value, 10) : null;
      });
    }

    loadClientOptions();
    loadBookOptions();
    renderDraftTable();
  }

  const ventasView = {
    init,
    loadClientOptions,
    loadBookOptions,
    resetDraft,
    onActivate() {
      loadClientOptions();
      loadBookOptions();
    }
  };

  root.LibreriaApp.views.ventas = ventasView;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ventasView;
  }
})();
