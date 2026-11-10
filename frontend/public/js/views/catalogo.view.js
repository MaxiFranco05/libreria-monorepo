/**
 * ============================================================================
 * Vista: Catálogo de Libros (js/views/catalogo.view.js)
 * Renderizado de libros y motor de búsqueda en tiempo real por título
 * Cumple RN-CAT-01 a RN-CAT-06 y directrices de seguridad XSS
 * ============================================================================
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.LibreriaApp = root.LibreriaApp || {};
  root.LibreriaApp.views = root.LibreriaApp.views || {};

  /**
   * Crea de forma 100% segura el nodo DOM para una tarjeta de libro
   * Sin utilizar .innerHTML para prevenir vulnerabilidades XSS
   * @param {Object} book - Entidad de libro
   * @param {Object} helpers - Utilidades de formato y colecciones de estado
   * @returns {HTMLElement} Elemento article .book-card
   */
  function createBookCardElement(book, { formatters, editoriales, generos, autores }) {
    const card = document.createElement('article');
    card.className = 'book-card';
    card.setAttribute('aria-labelledby', `book-title-${book.id}`);

    // --- Header de la tarjeta ---
    const header = document.createElement('header');
    header.className = 'book-card-header';

    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'book-card-badges';

    const genreBadge = document.createElement('span');
    const generoNombre = formatters.getGeneroName(book.generoId, generos);
    genreBadge.className = 'badge';
    // Si no tiene género asignado, aplicar clase distintiva suave
    if (generoNombre === 'Sin clasificar') {
      genreBadge.classList.add('badge-navy');
    }
    genreBadge.textContent = generoNombre;
    badgesContainer.appendChild(genreBadge);
    header.appendChild(badgesContainer);

    const title = document.createElement('h3');
    title.className = 'book-card-title';
    title.id = `book-title-${book.id}`;
    title.textContent = book.titulo || 'Sin título';
    header.appendChild(title);
    card.appendChild(header);

    // --- Cuerpo de la tarjeta (Metadatos) ---
    const body = document.createElement('div');
    body.className = 'book-card-body';

    // Editorial
    const editorialItem = document.createElement('div');
    editorialItem.className = 'book-meta-item';
    const editorialLabel = document.createElement('span');
    editorialLabel.className = 'book-meta-label';
    editorialLabel.textContent = 'Editorial:';
    const editorialValue = document.createElement('span');
    editorialValue.className = 'book-meta-value';
    editorialValue.textContent = formatters.getEditorialName(book.editorialId, editoriales);
    editorialItem.appendChild(editorialLabel);
    editorialItem.appendChild(editorialValue);
    body.appendChild(editorialItem);

    // Autores
    const authorsItem = document.createElement('div');
    authorsItem.className = 'book-meta-item';
    const authorsLabel = document.createElement('span');
    authorsLabel.className = 'book-meta-label';
    authorsLabel.textContent = 'Autor(es):';
    const authorsValue = document.createElement('span');
    authorsValue.className = 'book-meta-value';
    authorsValue.textContent = formatters.formatAuthors(book.autorIds, autores);
    authorsItem.appendChild(authorsLabel);
    authorsItem.appendChild(authorsValue);
    body.appendChild(authorsItem);

    // ISBN
    const isbnItem = document.createElement('div');
    isbnItem.className = 'book-meta-item';
    const isbnLabel = document.createElement('span');
    isbnLabel.className = 'book-meta-label';
    isbnLabel.textContent = 'ISBN:';
    const isbnValue = document.createElement('span');
    isbnValue.className = 'book-meta-isbn';
    isbnValue.textContent = book.isbn || '-';
    isbnItem.appendChild(isbnLabel);
    isbnItem.appendChild(isbnValue);
    body.appendChild(isbnItem);

    card.appendChild(body);

    // --- Pie de tarjeta (Precio) ---
    const footer = document.createElement('footer');
    footer.className = 'book-card-footer';

    const priceTag = document.createElement('div');
    priceTag.className = 'book-price-tag';

    const priceLabel = document.createElement('span');
    priceLabel.className = 'book-price-label';
    priceLabel.textContent = 'Precio';

    const priceValue = document.createElement('span');
    priceValue.className = 'book-price-value';
    priceValue.textContent = formatters.formatCurrency(book.precio);

    priceTag.appendChild(priceLabel);
    priceTag.appendChild(priceValue);
    footer.appendChild(priceTag);

    card.appendChild(footer);

    return card;
  }

  /**
   * Crea el componente seguro de estado sin resultados
   * @returns {HTMLElement} Elemento div .no-results-card
   */
  function createNoResultsElement() {
    const container = document.createElement('div');
    container.className = 'no-results-card';
    container.setAttribute('role', 'status');

    const icon = document.createElement('div');
    icon.className = 'no-results-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '📖';
    container.appendChild(icon);

    const message = document.createElement('p');
    message.className = 'no-results-message';
    // RN-CAT-05: Mensaje claro y visible indicando la ausencia de resultados
    message.textContent = 'No se encontraron libros que coincidan con la búsqueda';
    container.appendChild(message);

    const hint = document.createElement('p');
    hint.className = 'no-results-hint';
    hint.textContent = 'Probá modificando los términos de búsqueda o ingresando una palabra clave diferente.';
    container.appendChild(hint);

    return container;
  }

  /**
   * Renderiza la colección de libros en la grilla del catálogo
   * @param {Array|null} books - Lista de libros a exhibir (o null para leer el estado completo)
   */
  function render(books = null) {
    const grid = document.getElementById('catalogo-grid');
    const statusRegion = document.getElementById('catalogo-search-status');
    if (!grid) return;

    const state = root.LibreriaApp.state;
    const formatters = root.LibreriaApp.formatters;
    const booksToRender = Array.isArray(books) ? books : (state ? state.getBooks() : []);

    // Limpieza segura del contenedor sin usar innerHTML
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }

    if (booksToRender.length === 0) {
      grid.appendChild(createNoResultsElement());
      if (statusRegion) {
        statusRegion.textContent = 'No se encontraron libros que coincidan con la búsqueda.';
      }
      return;
    }

    const helpers = {
      formatters,
      editoriales: state ? state.getEditorials() : [],
      generos: state ? state.getGenres() : [],
      autores: state ? state.getAuthors() : []
    };

    const fragment = document.createDocumentFragment();
    booksToRender.forEach((book) => {
      fragment.appendChild(createBookCardElement(book, helpers));
    });

    grid.appendChild(fragment);

    if (statusRegion) {
      statusRegion.textContent = `Mostrando ${booksToRender.length} libros en el catálogo.`;
    }
  }

  /**
   * Filtra los libros según el término ingresado en la barra de búsqueda
   * Implementa RN-CAT-01 (toLowerCase), RN-CAT-02 (coincidencia parcial) y RN-CAT-03 (trim)
   * @param {string} query - Texto de búsqueda ingresado por el usuario
   */
  function filterByTitle(query) {
    const state = root.LibreriaApp.state;
    if (!state) return;

    // RN-CAT-03: Limpieza de espacios en blanco sobrantes
    const cleanQuery = typeof query === 'string' ? query.trim() : '';

    // RN-CAT-04: Búsqueda vacía devuelve la totalidad de los libros
    if (!cleanQuery) {
      render(state.getBooks());
      return;
    }

    // RN-CAT-01 y RN-CAT-02: Comparación insensible a mayúsculas/minúsculas y por subcadena
    const lowerQuery = cleanQuery.toLowerCase();
    const allBooks = state.getBooks();

    const filtered = allBooks.filter((book) => {
      const title = (book.titulo || '').toLowerCase();
      return title.includes(lowerQuery);
    });

    render(filtered);
  }

  /**
   * Inicializa la vista de catálogo y vincula los eventos
   */
  function init() {
    const searchInput = document.getElementById('catalogo-search');
    if (searchInput) {
      // Evento input para respuesta dinámica en tiempo real
      searchInput.addEventListener('input', (e) => {
        filterByTitle(e.target.value);
      });
    }

    // Suscripción reactiva ante cambios en el estado
    if (root.LibreriaApp.state && typeof root.LibreriaApp.state.subscribe === 'function') {
      root.LibreriaApp.state.subscribe((event) => {
        if (event === 'init' || event === 'book:added' || event === 'libros:updated') {
          // Re-renderizar preservando el filtro activo si existiera
          const currentQuery = searchInput ? searchInput.value : '';
          filterByTitle(currentQuery);
        }
      });
    }

    // Render inicial
    render();
  }

  const catalogoView = {
    init,
    render,
    filterByTitle,
    createBookCardElement
  };

  root.LibreriaApp.views.catalogo = catalogoView;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = catalogoView;
  }
})();
