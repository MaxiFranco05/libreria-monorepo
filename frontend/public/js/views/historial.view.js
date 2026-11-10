/**
 * ============================================================================
 * Historial View - Consulta Auditable y Desglose Inmutable (Ejercicio 3)
 * ============================================================================
 * Consulta el listado de ventas mediante GET /ventas/ con limit y offset,
 * y permite abrir el desglose histórico inmutable con GET /ventas/{id},
 * comprobando que los importes y precios unitarios históricos se conservan
 * inalterados ante futuros cambios de precio en el catálogo.
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.LibreriaApp = root.LibreriaApp || {};
  root.LibreriaApp.views = root.LibreriaApp.views || {};

  const PAGE_LIMIT = 15;
  let currentOffset = 0;
  let isLoading = false;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Abre el modal accesible para inspeccionar el detalle histórico de una venta (GET /ventas/{id})
   * @param {number} ventaId
   */
  async function showSaleDetail(ventaId) {
    const modal = document.getElementById('modal-venta-detalle');
    const modalTitle = document.getElementById('modal-venta-titulo');
    const modalBody = document.getElementById('modal-venta-contenido');
    if (!modal || !modalBody) return;

    modalTitle.textContent = `Comprobante de Venta #${ventaId}`;
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p style="color: var(--text-secondary);">Cargando comprobante comercial...</p>
      </div>
    `;

    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');

    try {
      const venta = await root.LibreriaApp.api.getVenta(ventaId);
      const formatCurrency = root.LibreriaApp.formatters?.formatCurrency || ((v) => `$${Number(v).toFixed(2)}`);
      const formatDateTime = root.LibreriaApp.formatters?.formatDateTime || ((v) => String(v));

      const renglones = Array.isArray(venta.renglones) ? venta.renglones : [];

      modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="background: var(--bg-surface-alt); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.95rem;">
              <div><strong>Comprobante N°:</strong> #${venta.id}</div>
              <div><strong>Fecha y Hora:</strong> ${formatDateTime(venta.fecha)}</div>
              <div><strong>Cliente Comprador:</strong> ${escapeHtml(venta.cliente?.nombre || 'N/D')}</div>
              <div><strong>Correo:</strong> <code>${escapeHtml(venta.cliente?.email || 'N/D')}</code></div>
            </div>
          </div>

          <div>
            <h4 style="margin-bottom: 0.5rem; color: var(--accent-navy);">Detalle de Artículos y Valores Facturados:</h4>
            <div class="table-responsive">
              <table class="table" style="font-size: 0.9rem;">
                <thead>
                  <tr>
                    <th>Libro ID</th>
                    <th>Título del Libro</th>
                    <th>Cant.</th>
                    <th>Precio Unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${renglones.map((r) => `
                    <tr>
                      <td>#${r.libro_id}</td>
                      <td><strong>${escapeHtml(r.titulo)}</strong></td>
                      <td>${r.cantidad} u.</td>
                      <td>${formatCurrency(r.precio_unitario)}</td>
                      <td style="font-weight: 600;">${formatCurrency(r.subtotal)}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr style="background: var(--bg-surface-alt); font-weight: 700; font-size: 1rem;">
                    <td colspan="4" style="text-align: right;">Total Facturado:</td>
                    <td style="color: var(--color-success); font-size: 1.15rem;">${formatCurrency(venta.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">
            Comprobante inmutable. Los importes reflejan con fidelidad las condiciones comerciales vigentes al momento de la emisión.
          </div>
        </div>
      `;
    } catch (err) {
      modalBody.innerHTML = `<div class="state-box state-error"><p>Error consultando comprobante: ${escapeHtml(err.message)}</p></div>`;
    }
  }

  /**
   * Carga el listado paginado de ventas desde la API mediante GET /ventas/
   */
  async function loadSales({ resetOffset = false } = {}) {
    if (isLoading) return;
    isLoading = true;

    if (resetOffset) currentOffset = 0;

    const tbody = document.getElementById('historial-table-body');
    const stateContainer = document.getElementById('historial-state');
    const pagination = document.getElementById('historial-pagination');
    const pageInfo = document.getElementById('historial-pagination-info');
    const prevBtn = document.getElementById('btn-historial-prev');
    const nextBtn = document.getElementById('btn-historial-next');

    if (stateContainer) stateContainer.innerHTML = '';
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Cargando historial de ventas desde la API...</td></tr>';

    try {
      const formatCurrency = root.LibreriaApp.formatters?.formatCurrency || ((v) => `$${Number(v).toFixed(2)}`);
      const formatDateTime = root.LibreriaApp.formatters?.formatDateTime || ((v) => String(v));

      const sales = await root.LibreriaApp.api.getVentas({
        limit: PAGE_LIMIT,
        offset: currentOffset
      });

      const salesList = Array.isArray(sales) ? sales : [];

      if (salesList.length === 0) {
        if (currentOffset === 0) {
          if (tbody) tbody.innerHTML = '';
          if (stateContainer) {
            stateContainer.innerHTML = `
              <div class="state-box state-empty">
                <div class="state-icon" aria-hidden="true">🧾</div>
                <div class="state-title">No hay ventas registradas</div>
                <p class="state-message">Aún no se han emitido ventas en el sistema. Podés registrar una nueva en la sección Ventas.</p>
              </div>
            `;
          }
        } else {
          if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;" class="text-muted">No hay más ventas en esta página.</td></tr>';
        }

        if (pagination) {
          pagination.hidden = currentOffset === 0;
          if (prevBtn) prevBtn.disabled = currentOffset === 0;
          if (nextBtn) nextBtn.disabled = true;
          if (pageInfo) pageInfo.textContent = `Página ${Math.floor(currentOffset / PAGE_LIMIT) + 1}`;
        }
        return;
      }

      if (tbody) {
        tbody.innerHTML = '';
        salesList.forEach((venta) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>#${venta.id}</strong></td>
            <td>${formatDateTime(venta.fecha)}</td>
            <td>Cliente ID: <strong>${venta.cliente_id}</strong></td>
            <td style="font-weight: 700; color: #166534;">${formatCurrency(venta.total)}</td>
            <td>
              <button type="button" class="btn btn-secondary btn-pagination" data-sale-id="${venta.id}">
                Ver Comprobante
              </button>
            </td>
          `;

          tr.querySelector('button').addEventListener('click', () => {
            showSaleDetail(venta.id);
          });

          tbody.appendChild(tr);
        });
      }

      if (pagination) {
        pagination.hidden = false;
        const pageNum = Math.floor(currentOffset / PAGE_LIMIT) + 1;
        if (pageInfo) pageInfo.textContent = `Página ${pageNum} (mostrando ${salesList.length} ventas)`;
        if (prevBtn) prevBtn.disabled = currentOffset === 0;
        if (nextBtn) nextBtn.disabled = salesList.length < PAGE_LIMIT;
      }
    } catch (err) {
      console.error('[HistorialView] Error cargando ventas:', err);
      if (tbody) tbody.innerHTML = '';
      if (stateContainer) {
        stateContainer.innerHTML = `
          <div class="state-box state-error">
            <div class="state-icon" aria-hidden="true">⚠️</div>
            <div class="state-title">Error al consultar el historial de ventas</div>
            <p class="state-message">${escapeHtml(err.message)}</p>
          </div>
        `;
      }
    } finally {
      isLoading = false;
    }
  }

  function init() {
    const prevBtn = document.getElementById('btn-historial-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentOffset >= PAGE_LIMIT) {
          currentOffset -= PAGE_LIMIT;
          loadSales({ resetOffset: false });
        }
      });
    }

    const nextBtn = document.getElementById('btn-historial-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentOffset += PAGE_LIMIT;
        loadSales({ resetOffset: false });
      });
    }

    // Modal close listeners
    const modal = document.getElementById('modal-venta-detalle');
    const closeBtn = document.getElementById('btn-cerrar-modal-venta');
    const okBtn = document.getElementById('btn-modal-venta-ok');
    const closeModal = () => {
      if (!modal) return;
      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');
    };
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (okBtn) okBtn.addEventListener('click', closeModal);

    loadSales({ resetOffset: true });
  }

  const historialView = {
    init,
    loadSales,
    showSaleDetail,
    onActivate() {
      loadSales({ resetOffset: false });
    }
  };

  root.LibreriaApp.views.historial = historialView;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = historialView;
  }
})();
