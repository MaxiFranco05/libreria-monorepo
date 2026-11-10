/**
 * ============================================================================
 * Historial View - Consulta Auditable y Desglose Inmutable de Ventas (C-04)
 * ============================================================================
 * Presenta el listado maestro de ventas confirmadas y su desglose por renglones,
 * garantizando la exhibición estricta del precio unitario histórico congelado
 * sin recalcular jamás desde el catálogo (RN-VNT-06, RN-VNT-07, Regla Dura #7).
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.LibreriaApp = root.LibreriaApp || {};
  root.LibreriaApp.views = root.LibreriaApp.views || {};

  /**
   * Conmuta la visibilidad accesible del detalle de renglones de una venta
   * @param {string} saleId - ID de la venta
   */
  function toggleDetail(saleId) {
    if (typeof document === 'undefined') return;
    const detailRow = document.getElementById(`detalle-venta-${saleId}`);
    const toggleBtn = document.getElementById(`btn-toggle-${saleId}`);
    if (!detailRow || !toggleBtn) return;

    const isHidden = detailRow.hasAttribute('hidden');
    if (isHidden) {
      detailRow.removeAttribute('hidden');
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.textContent = 'Ocultar detalle';
    } else {
      detailRow.setAttribute('hidden', '');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.textContent = 'Ver detalle';
    }
  }

  /**
   * Renderiza la tabla maestra de transacciones confirmadas en el DOM (sin innerHTML)
   * @param {Array} [salesList] - Lista opcional de ventas (consulta state.getVentas() por defecto)
   */
  function renderTable(salesList) {
    if (typeof document === 'undefined') return;

    const state = root.LibreriaApp.state;
    const formatters = root.LibreriaApp.formatters;

    const sales = salesList || (state && typeof state.getVentas === 'function' ? state.getVentas() : (state ? state.getSales() : []));
    const clients = state && typeof state.getClients === 'function' ? state.getClients() : [];

    const emptyContainer = document.getElementById('historial-vacio');
    const tableContainer = document.getElementById('historial-table-container');
    const tbody = document.getElementById('historial-table-body');

    if (!tbody) return;

    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }

    if (!Array.isArray(sales) || sales.length === 0) {
      if (emptyContainer) {
        emptyContainer.removeAttribute('hidden');
        emptyContainer.style.display = '';
      }
      if (tableContainer) {
        tableContainer.setAttribute('hidden', '');
        tableContainer.style.display = 'none';
      }
      return;
    }

    if (emptyContainer) {
      emptyContainer.setAttribute('hidden', '');
      emptyContainer.style.display = 'none';
    }
    if (tableContainer) {
      tableContainer.removeAttribute('hidden');
      tableContainer.style.display = '';
    }

    sales.forEach((sale) => {
      if (!sale) return;

      // Fila Maestra de la Venta
      const trMaster = document.createElement('tr');
      trMaster.className = 'historial-master-row';

      // 1. ID Venta
      const tdId = document.createElement('td');
      tdId.textContent = sale.id;
      trMaster.appendChild(tdId);

      // 2. Fecha y Hora formateada
      const tdFecha = document.createElement('td');
      tdFecha.textContent = formatters && typeof formatters.formatDateTime === 'function'
        ? formatters.formatDateTime(sale.fecha)
        : String(sale.fecha);
      trMaster.appendChild(tdFecha);

      // 3. Cliente
      const tdCliente = document.createElement('td');
      tdCliente.textContent = formatters && typeof formatters.getClientName === 'function'
        ? formatters.getClientName(sale.clienteId, clients)
        : (sale.clienteId || 'Cliente no especificado');
      trMaster.appendChild(tdCliente);

      // 4. Total general
      const tdTotal = document.createElement('td');
      tdTotal.style.fontWeight = '600';
      tdTotal.textContent = formatters && typeof formatters.formatCurrency === 'function'
        ? formatters.formatCurrency(sale.total)
        : `$${Number(sale.total).toFixed(2)}`;
      trMaster.appendChild(tdTotal);

      // 5. Botón accesible para expandir/colapsar renglones
      const tdAcciones = document.createElement('td');
      const btnDetail = document.createElement('button');
      btnDetail.type = 'button';
      btnDetail.className = 'btn-toggle-detail';
      btnDetail.id = `btn-toggle-${sale.id}`;
      btnDetail.setAttribute('aria-expanded', 'false');
      btnDetail.setAttribute('aria-controls', `detalle-venta-${sale.id}`);
      btnDetail.textContent = 'Ver detalle';
      btnDetail.addEventListener('click', () => {
        toggleDetail(sale.id);
      });
      tdAcciones.appendChild(btnDetail);
      trMaster.appendChild(tdAcciones);

      tbody.appendChild(trMaster);

      // Fila de Desglose de Renglones (oculta inicialmente)
      const trDetail = document.createElement('tr');
      trDetail.id = `detalle-venta-${sale.id}`;
      trDetail.className = 'historial-detail-row';
      trDetail.setAttribute('hidden', '');

      const tdDetailColspan = document.createElement('td');
      tdDetailColspan.colSpan = 5;
      tdDetailColspan.className = 'historial-detail-cell';

      // Sub-tabla semántica de renglones históricos
      const subTable = document.createElement('table');
      subTable.className = 'historial-detail-table';

      const thead = document.createElement('thead');
      const trHead = document.createElement('tr');

      const thLibro = document.createElement('th');
      thLibro.textContent = 'Libro';
      trHead.appendChild(thLibro);

      const thCant = document.createElement('th');
      thCant.textContent = 'Cantidad';
      trHead.appendChild(thCant);

      const thPrecioHist = document.createElement('th');
      thPrecioHist.textContent = 'Precio Unitario Histórico';
      trHead.appendChild(thPrecioHist);

      const thSubtotal = document.createElement('th');
      thSubtotal.textContent = 'Subtotal';
      trHead.appendChild(thSubtotal);

      thead.appendChild(trHead);
      subTable.appendChild(thead);

      const tbodyDetail = document.createElement('tbody');

      const renglones = Array.isArray(sale.renglones) ? sale.renglones : [];
      renglones.forEach((r) => {
        const trItem = document.createElement('tr');

        // IMPORTANTE (Regla Dura #7): Se utiliza exclusivamente el snapshot congelado en el renglón.
        // No se consulta el catálogo de libros.
        const tdItemLibro = document.createElement('td');
        tdItemLibro.textContent = r.titulo;
        trItem.appendChild(tdItemLibro);

        const tdItemCant = document.createElement('td');
        tdItemCant.textContent = String(r.cantidad);
        trItem.appendChild(tdItemCant);

        const tdItemPrecio = document.createElement('td');
        tdItemPrecio.textContent = formatters && typeof formatters.formatCurrency === 'function'
          ? formatters.formatCurrency(r.precioUnitario)
          : `$${Number(r.precioUnitario).toFixed(2)}`;
        trItem.appendChild(tdItemPrecio);

        const tdItemSubtotal = document.createElement('td');
        tdItemSubtotal.textContent = formatters && typeof formatters.formatCurrency === 'function'
          ? formatters.formatCurrency(r.subtotal)
          : `$${Number(r.subtotal).toFixed(2)}`;
        trItem.appendChild(tdItemSubtotal);

        tbodyDetail.appendChild(trItem);
      });

      subTable.appendChild(tbodyDetail);
      tdDetailColspan.appendChild(subTable);
      trDetail.appendChild(tdDetailColspan);

      tbody.appendChild(trDetail);
    });
  }

  /**
   * Inicializa la vista de historial y suscribe a eventos reactivos
   */
  function init() {
    if (typeof document === 'undefined') return;

    const state = root.LibreriaApp.state;
    if (state && typeof state.on === 'function') {
      state.on('ventas:updated', () => {
        renderTable();
      });
      state.on('clientes:updated', () => {
        renderTable();
      });
    }

    renderTable();
  }

  const historialView = {
    init,
    renderTable,
    toggleDetail
  };

  root.LibreriaApp.views.historial = historialView;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = historialView;
  }
})();
