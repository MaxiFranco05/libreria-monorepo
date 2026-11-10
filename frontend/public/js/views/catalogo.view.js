/**
 * ============================================================================
 * Vista: Catálogo de Libros (js/views/catalogo.view.js)
 * Conexión nativa con FastAPI (GET /api/libros/ y GET /api/libros/{id})
 * Cumple con el Ejercicio 1 de la evaluación Global:
 * - Búsqueda parcial por título (insensible a mayúsculas/minúsculas)
 * - Paginación limit / offset con reinicio de desplazamiento al filtrar
 * - 4 estados visuales: Carga, Lista vacía, Sin coincidencias, Error de conexión
 * - Renderizado de Título, ISBN, Precio, Editorial y Género («Sin clasificar» si null)
 * - Consulta individual de autores mediante GET /libros/{id}
 * ============================================================================
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.LibreriaApp = root.LibreriaApp || {};
  root.LibreriaApp.views = root.LibreriaApp.views || {};

  const PAGE_LIMIT = 12;
  let currentOffset = 0;
  let currentQuery = '';
  let isLoading = false;
  let lastLoadedBooks = [];

  /**
   * Renderiza el estado visual correspondiente dentro de #catalogo-state
   * @param {'loading'|'empty'|'no-results'|'error'|'none'} state
   * @param {string} [errorMessage='']
   */
  function renderState(state, errorMessage = '') {
    const container = document.getElementById('catalogo-state');
    const grid = document.getElementById('catalogo-grid');
    const pagination = document.getElementById('catalogo-pagination');
    if (!container) return;

    container.innerHTML = '';

    if (state === 'none') {
      container.style.display = 'none';
      if (grid) grid.style.display = 'grid';
      return;
    }

    if (grid) grid.style.display = 'none';
    if (pagination) pagination.hidden = true;
    container.style.display = 'block';

    const box = document.createElement('div');
    box.className = `state-box state-${state}`;

    if (state === 'loading') {
      box.innerHTML = `
        <div class="state-icon" aria-hidden="true">⏳</div>
        <div class="state-title">Cargando catálogo...</div>
        <p class="state-message">Consultando ejemplares disponibles en la API.</p>
      `;
    } else if (state === 'empty') {
      box.innerHTML = `
        <div class="state-icon" aria-hidden="true">📚</div>
        <div class="state-title">No hay libros registrados</div>
        <p class="state-message">La base de datos no contiene libros en este momento. Podés registrar uno nuevo en la sección Libros.</p>
      `;
    } else if (state === 'no-results') {
      box.innerHTML = `
        <div class="state-icon" aria-hidden="true">🔍</div>
        <div class="state-title">Sin coincidencias</div>
        <p class="state-message">No se encontraron libros que coincidan con <strong>"${escapeHtml(currentQuery)}"</strong>.</p>
      `;
    } else if (state === 'error') {
      box.innerHTML = `
        <div class="state-icon" aria-hidden="true">⚠️</div>
        <div class="state-title">Error de conexión con la API</div>
        <p class="state-message">${escapeHtml(errorMessage || 'No se pudo conectar con el servidor.')}</p>
        <button type="button" class="btn btn-primary" id="btn-catalogo-retry">Reintentar</button>
      `;
    }

    container.appendChild(box);

    const retryBtn = document.getElementById('btn-catalogo-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        loadCatalog({ resetOffset: false });
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Abre el modal con el detalle completo del libro y sus autorías (GET /libros/{id})
   * @param {number} bookId
   */
  async function showBookDetail(bookId) {
    const modal = document.getElementById('modal-libro-detalle');
    const modalTitle = document.getElementById('modal-libro-titulo');
    const modalBody = document.getElementById('modal-libro-contenido');
    if (!modal || !modalBody) return;

    modalTitle.textContent = 'Cargando información...';
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p style="color: var(--text-secondary);">Cargando información editorial y autorías...</p>
      </div>
    `;

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }

    try {
      const book = await root.LibreriaApp.api.getLibro(bookId);
      modalTitle.textContent = book.titulo || 'Detalle del Libro';

      const formatters = root.LibreriaApp.formatters || {};
      const formatCurrency = formatters.formatCurrency || ((v) => `$${Number(v).toFixed(2)}`);

      const editorialName = (book.editorial && book.editorial.nombre)
        ? book.editorial.nombre
        : 'Editorial no especificada';
      const generoName = (book.genero && book.genero.nombre)
        ? book.genero.nombre
        : 'Sin clasificar';

      const autorias = Array.isArray(book.autorias) ? book.autorias : [];
      let autoresHtml = '';
      if (autorias.length === 0) {
        autoresHtml = '<p class="text-muted" style="font-style: italic;">Sin autores asociados a esta obra.</p>';
      } else {
        autoresHtml = `
          <table class="table" style="margin-top: 0.5rem; font-size: 0.9rem;">
            <thead>
              <tr>
                <th scope="col">Orden</th>
                <th scope="col">Autor</th>
                <th scope="col">Rol</th>
                <th scope="col">Nacionalidad</th>
              </tr>
            </thead>
            <tbody>
              ${autorias.map((a) => `
                <tr>
                  <td><strong>#${a.orden ?? 1}</strong></td>
                  <td>${escapeHtml(a.autor ? a.autor.nombre : 'Autor desconocido')}</td>
                  <td><span class="badge">${escapeHtml(a.rol || 'autor')}</span></td>
                  <td>${escapeHtml(a.autor ? (a.autor.nacionalidad || 'N/D') : 'N/D')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }

      modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.85rem;">
            <div>
              <span class="badge ${generoName === 'Sin clasificar' ? 'badge-navy' : ''}">${escapeHtml(generoName)}</span>
              <span style="margin-left: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">ISBN: <strong>${escapeHtml(book.isbn)}</strong></span>
            </div>
            <div style="font-size: 1.35rem; font-weight: 700; color: var(--accent-navy);">
              ${formatCurrency(book.precio)}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.25rem;">
            <div><strong style="color: var(--text-secondary);">Editorial:</strong> ${escapeHtml(editorialName)}</div>
            <div><strong style="color: var(--text-secondary);">Disponibilidad:</strong> ${book.stock !== undefined ? book.stock : 'N/D'} ejemplares</div>
          </div>

          <div style="margin-top: 0.75rem;">
            <h4 style="margin-bottom: 0.5rem; font-size: 1.05rem; color: var(--accent-navy);">Equipo Editorial y Autorías:</h4>
            ${autoresHtml}
          </div>
        </div>
      `;
    } catch (err) {
      modalTitle.textContent = 'Error';
      modalBody.innerHTML = `
        <div class="state-box state-error" style="margin: 0;">
          <p>No se pudo cargar el detalle del libro: ${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }

  /**
   * Crea el elemento tarjeta para un libro del catálogo
   * @param {Object} book - Libro retornado por GET /libros/
   * @param {Object} helpers - Diccionarios y utilidades
   * @returns {HTMLElement}
   */
  function createBookCard(book, { formatters, editoriales, generos }) {
    const card = document.createElement('article');
    card.className = 'book-card';
    card.setAttribute('aria-labelledby', `book-title-${book.id}`);

    const header = document.createElement('header');
    header.className = 'book-card-header';

    const badges = document.createElement('div');
    badges.className = 'book-card-badges';

    const genreBadge = document.createElement('span');
    const generoId = book.genero_id !== undefined ? book.genero_id : book.generoId;
    const generoName = formatters.getGeneroName ? formatters.getGeneroName(generoId, generos) : 'Sin clasificar';
    genreBadge.className = 'badge';
    if (generoName === 'Sin clasificar') {
      genreBadge.classList.add('badge-navy');
    }
    genreBadge.textContent = generoName;
    badges.appendChild(genreBadge);
    header.appendChild(badges);

    const title = document.createElement('h3');
    title.className = 'book-card-title';
    title.id = `book-title-${book.id}`;
    title.textContent = book.titulo || 'Sin título';
    header.appendChild(title);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'book-card-body';

    // Editorial
    const edItem = document.createElement('div');
    edItem.className = 'book-meta-item';
    const edLabel = document.createElement('span');
    edLabel.className = 'book-meta-label';
    edLabel.textContent = 'Editorial:';
    const edVal = document.createElement('span');
    edVal.className = 'book-meta-value';
    const editorialId = book.editorial_id !== undefined ? book.editorial_id : book.editorialId;
    edVal.textContent = formatters.getEditorialName ? formatters.getEditorialName(editorialId, editoriales) : 'Editorial';
    edItem.appendChild(edLabel);
    edItem.appendChild(edVal);
    body.appendChild(edItem);

    // ISBN
    const isbnItem = document.createElement('div');
    isbnItem.className = 'book-meta-item';
    const isbnLabel = document.createElement('span');
    isbnLabel.className = 'book-meta-label';
    isbnLabel.textContent = 'ISBN:';
    const isbnVal = document.createElement('span');
    isbnVal.className = 'book-meta-value';
    isbnVal.textContent = book.isbn || 'N/D';
    isbnItem.appendChild(isbnLabel);
    isbnItem.appendChild(isbnVal);
    body.appendChild(isbnItem);

    // Stock
    const stockItem = document.createElement('div');
    stockItem.className = 'book-meta-item';
    const stockLabel = document.createElement('span');
    stockLabel.className = 'book-meta-label';
    stockLabel.textContent = 'Stock:';
    const stockVal = document.createElement('span');
    stockVal.className = 'book-meta-value';
    stockVal.textContent = `${book.stock !== undefined ? book.stock : 0} u.`;
    stockItem.appendChild(stockLabel);
    stockItem.appendChild(stockVal);
    body.appendChild(stockItem);

    card.appendChild(body);

    // Footer con precio y botón de ver autores
    const footer = document.createElement('footer');
    footer.className = 'book-card-footer';
    footer.style.display = 'flex';
    footer.style.justifyContent = 'space-between';
    footer.style.alignItems = 'center';
    footer.style.marginTop = '1rem';
    footer.style.paddingTop = '0.75rem';
    footer.style.borderTop = '1px solid var(--border-color)';

    const price = document.createElement('span');
    price.className = 'book-price';
    price.style.fontSize = '1.2rem';
    price.style.fontWeight = '700';
    price.style.color = 'var(--accent-navy)';
    const formatCurrency = formatters.formatCurrency || ((v) => `$${Number(v).toFixed(2)}`);
    price.textContent = formatCurrency(book.precio);
    footer.appendChild(price);

    const detailBtn = document.createElement('button');
    detailBtn.type = 'button';
    detailBtn.className = 'btn btn-secondary btn-pagination';
    detailBtn.textContent = 'Ver Autores';
    detailBtn.setAttribute('aria-label', `Ver autores y detalle de ${book.titulo}`);
    detailBtn.addEventListener('click', () => {
      showBookDetail(book.id);
    });
    footer.appendChild(detailBtn);

    card.appendChild(footer);
    return card;
  }

  /**
   * Carga el catálogo desde la API mediante GET /api/libros/
   * @param {Object} [options]
   * @param {boolean} [options.resetOffset=false]
   */
  async function loadCatalog({ resetOffset = false } = {}) {
    if (isLoading) return;
    isLoading = true;

    if (resetOffset) {
      currentOffset = 0;
    }

    renderState('loading');

    const app = root.LibreriaApp;
    const api = app.api;
    const formatters = app.formatters || {};
    const state = app.state || {};

    try {
      // Asegurar que editoriales y géneros estén cargados en state para traducir nombres
      let editoriales = state.getEditoriales ? state.getEditoriales() : [];
      let generos = state.getGeneros ? state.getGeneros() : [];

      if (editoriales.length === 0 || generos.length === 0) {
        try {
          const [eds, gens] = await Promise.all([api.getEditoriales(), api.getGeneros()]);
          if (state.setEditoriales) state.setEditoriales(eds);
          if (state.setGeneros) state.setGeneros(gens);
          editoriales = eds;
          generos = gens;
        } catch (e) {
          console.warn('[Catalogo] No se pudieron precargar editoriales/géneros:', e);
        }
      }

      // Consulta de libros paginada y filtrada por título
      const books = await api.getLibros({
        titulo: currentQuery,
        limit: PAGE_LIMIT,
        offset: currentOffset
      });

      lastLoadedBooks = Array.isArray(books) ? books : [];

      const grid = document.getElementById('catalogo-grid');
      const pagination = document.getElementById('catalogo-pagination');
      const pageInfo = document.getElementById('catalogo-pagination-info');
      const prevBtn = document.getElementById('btn-catalogo-prev');
      const nextBtn = document.getElementById('btn-catalogo-next');
      const searchStatus = document.getElementById('catalogo-search-status');

      if (lastLoadedBooks.length === 0) {
        if (currentOffset === 0 && !currentQuery.trim()) {
          // Estado 2: Lista vacía en base de datos
          renderState('empty');
        } else if (currentQuery.trim()) {
          // Estado 3: Búsqueda sin coincidencias
          renderState('no-results');
        } else {
          // Fin de la paginación
          renderState('none');
          if (grid) grid.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; text-align: center;">No hay más libros para mostrar en esta página.</p>';
        }

        if (pagination) {
          pagination.hidden = currentOffset === 0 && !currentQuery;
          if (prevBtn) prevBtn.disabled = currentOffset === 0;
          if (nextBtn) nextBtn.disabled = true;
          if (pageInfo) {
            const pageNum = Math.floor(currentOffset / PAGE_LIMIT) + 1;
            pageInfo.textContent = `Página ${pageNum}`;
          }
        }
        return;
      }

      // Renderizado normal
      renderState('none');
      if (grid) {
        grid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        lastLoadedBooks.forEach((book) => {
          fragment.appendChild(createBookCard(book, { formatters, editoriales, generos }));
        });
        grid.appendChild(fragment);
      }

      // Actualizar paginador
      if (pagination) {
        pagination.hidden = false;
        const pageNum = Math.floor(currentOffset / PAGE_LIMIT) + 1;
        if (pageInfo) {
          pageInfo.textContent = `Página ${pageNum} (mostrando ${lastLoadedBooks.length} ejemplares)`;
        }
        if (prevBtn) {
          prevBtn.disabled = currentOffset === 0;
        }
        if (nextBtn) {
          // Si devolvió menos del limit, no hay página siguiente
          nextBtn.disabled = lastLoadedBooks.length < PAGE_LIMIT;
        }
      }

      if (searchStatus) {
        searchStatus.textContent = `Mostrando ${lastLoadedBooks.length} libros.`;
      }
    } catch (err) {
      console.error('[Catalogo] Error al consultar API:', err);
      // Estado 4: Error de conexión
      renderState('error', err.message);
    } finally {
      isLoading = false;
    }
  }

  /**
   * Manejador de búsqueda reactiva por título
   * @param {string} query
   */
  let searchDebounceTimeout = null;
  function handleSearch(query) {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
      currentQuery = (query || '').trim();
      // Reiniciar desplazamiento al cambiar el filtro (exigido por consigna)
      loadCatalog({ resetOffset: true });
    }, 250);
  }

  /**
   * Inicializa la vista de catálogo
   */
  function init() {
    const searchInput = document.getElementById('catalogo-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        handleSearch(e.target.value);
      });
    }

    const prevBtn = document.getElementById('btn-catalogo-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentOffset >= PAGE_LIMIT) {
          currentOffset -= PAGE_LIMIT;
          loadCatalog({ resetOffset: false });
        }
      });
    }

    const nextBtn = document.getElementById('btn-catalogo-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentOffset += PAGE_LIMIT;
        loadCatalog({ resetOffset: false });
      });
    }

    // Modal close listeners
    const modal = document.getElementById('modal-libro-detalle');
    const closeBtn = document.getElementById('btn-cerrar-modal-libro');
    const okBtn = document.getElementById('btn-modal-libro-ok');
    const closeModal = () => {
      if (!modal) return;
      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');
    };
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (okBtn) okBtn.addEventListener('click', closeModal);

    // Carga inicial
    loadCatalog({ resetOffset: true });
  }

  const catalogoView = {
    init,
    loadCatalog,
    onActivate() {
      loadCatalog({ resetOffset: false });
    }
  };

  root.LibreriaApp.views.catalogo = catalogoView;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = catalogoView;
  }
})();
