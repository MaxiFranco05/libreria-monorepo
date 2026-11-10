/**
 * ============================================================================
 * Libros View - Formulario y Controlador de Alta de Libros (C-03)
 * ============================================================================
 * Maneja la interacción del formulario de libros, validación en cliente,
 * prevención de recarga y actualización reactiva en el catálogo (RN-LIB-01 a RN-LIB-06).
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
    const container = document.getElementById('libro-feedback');
    if (!container) return;

    // Limpieza segura sin innerHTML
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
   * @param {string} inputId - ID del campo de entrada (opcional)
   * @param {string|null} message - Mensaje de error (null para limpiar)
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
   * Limpia todos los errores visibles del formulario
   */
  function clearFieldErrors() {
    setFieldError('error-libro-titulo', 'libro-titulo', null);
    setFieldError('error-libro-isbn', 'libro-isbn', null);
    setFieldError('error-libro-precio', 'libro-precio', null);
    setFieldError('error-libro-editorial', 'libro-editorial', null);
    setFieldError('error-libro-genero', 'libro-genero', null);
    setFieldError('error-libro-autores', null, null);
  }

  /**
   * Puebla dinámicamente los selectores y grupos de checkboxes a partir del estado
   */
  function populateSelects() {
    if (typeof document === 'undefined') return;
    const state = root.LibreriaApp.state;
    if (!state) return;

    // 1. Selector de Editoriales
    const editorialSelect = document.getElementById('libro-editorial');
    if (editorialSelect) {
      // Limpiar opciones preservando la primera por defecto
      while (editorialSelect.firstChild) {
        editorialSelect.removeChild(editorialSelect.firstChild);
      }
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '-- Seleccione una editorial --';
      editorialSelect.appendChild(defaultOpt);

      const editoriales = typeof state.getEditoriales === 'function' ? state.getEditoriales() : state.getEditorials();
      editoriales.forEach((ed) => {
        const opt = document.createElement('option');
        opt.value = ed.id;
        opt.textContent = ed.nombre;
        editorialSelect.appendChild(opt);
      });
    }

    // 2. Selector de Géneros (con opción «Sin clasificar» RN-CAT-06 y RN-LIB-05)
    const generoSelect = document.getElementById('libro-genero');
    if (generoSelect) {
      while (generoSelect.firstChild) {
        generoSelect.removeChild(generoSelect.firstChild);
      }
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '«Sin clasificar»';
      generoSelect.appendChild(defaultOpt);

      const generos = typeof state.getGeneros === 'function' ? state.getGeneros() : state.getGenres();
      generos.forEach((gen) => {
        const opt = document.createElement('option');
        opt.value = gen.id;
        opt.textContent = gen.nombre;
        generoSelect.appendChild(opt);
      });
    }

    // 3. Checkboxes de Autores
    const autoresContainer = document.getElementById('libro-autores-group');
    if (autoresContainer) {
      while (autoresContainer.firstChild) {
        autoresContainer.removeChild(autoresContainer.firstChild);
      }
      const autores = typeof state.getAutores === 'function' ? state.getAutores() : state.getAuthors();
      autores.forEach((aut) => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'autorIds';
        checkbox.value = aut.id;
        checkbox.id = `autor-${aut.id}`;

        const span = document.createElement('span');
        span.textContent = aut.nombre || aut.nombreCompleto || '';

        label.appendChild(checkbox);
        label.appendChild(span);
        autoresContainer.appendChild(label);
      });
    }
  }

  /**
   * Procesa el envío del formulario de libros
   * @param {Event} [e] - Evento submit
   * @returns {{ success: boolean, error?: string, book?: Object }}
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

    const tituloInput = document.getElementById('libro-titulo');
    const isbnInput = document.getElementById('libro-isbn');
    const precioInput = document.getElementById('libro-precio');
    const editorialSelect = document.getElementById('libro-editorial');
    const generoSelect = document.getElementById('libro-genero');
    const autoresCheckboxes = document.querySelectorAll('input[name="autorIds"]:checked');

    const titulo = tituloInput ? tituloInput.value : '';
    const isbn = isbnInput ? isbnInput.value : '';
    const precio = precioInput ? precioInput.value : '';
    const editorialId = editorialSelect ? editorialSelect.value : '';
    const generoId = generoSelect ? generoSelect.value : '';
    const autorIds = Array.from(autoresCheckboxes).map((cb) => cb.value);

    // Ejecutar validaciones puras
    const existingBooks = typeof state.getLibros === 'function' ? state.getLibros() : state.getBooks();
    const availableEditorials = typeof state.getEditoriales === 'function' ? state.getEditoriales() : state.getEditorials();
    const availableAuthors = typeof state.getAutores === 'function' ? state.getAutores() : state.getAuthors();

    const titleCheck = validators.validateRequired(titulo, 'El título');
    const isbnCheck = validators.validateISBN(isbn, existingBooks);
    const priceCheck = validators.validatePrice(precio);
    const editorialCheck = validators.validateEditorial(editorialId, availableEditorials);
    const authorsCheck = validators.validateAuthorsSelection(autorIds, availableAuthors);

    let hasErrors = false;
    let firstInvalidInput = null;

    if (!titleCheck.valid) {
      hasErrors = true;
      setFieldError('error-libro-titulo', 'libro-titulo', titleCheck.error);
      if (!firstInvalidInput) firstInvalidInput = tituloInput;
    }

    if (!isbnCheck.valid) {
      hasErrors = true;
      setFieldError('error-libro-isbn', 'libro-isbn', isbnCheck.error);
      if (!firstInvalidInput) firstInvalidInput = isbnInput;
    }

    if (!priceCheck.valid) {
      hasErrors = true;
      setFieldError('error-libro-precio', 'libro-precio', priceCheck.error);
      if (!firstInvalidInput) firstInvalidInput = precioInput;
    }

    if (!editorialCheck.valid) {
      hasErrors = true;
      setFieldError('error-libro-editorial', 'libro-editorial', editorialCheck.error);
      if (!firstInvalidInput) firstInvalidInput = editorialSelect;
    }

    if (!authorsCheck.valid) {
      hasErrors = true;
      setFieldError('error-libro-autores', null, authorsCheck.error);
      if (!firstInvalidInput) {
        firstInvalidInput = document.getElementById('fieldset-autores');
      }
    }

    if (hasErrors) {
      setFeedback('Por favor revise los errores señalados en el formulario.', 'error');
      if (firstInvalidInput && typeof firstInvalidInput.focus === 'function') {
        firstInvalidInput.focus();
      }
      return { success: false, error: 'Validación fallida' };
    }

    // Construcción de la nueva entidad Libro
    const newBook = {
      id: `lib-${Date.now()}`,
      titulo: titleCheck.sanitizedValue,
      isbn: isbnCheck.sanitizedValue,
      precio: priceCheck.sanitizedValue,
      editorialId: editorialCheck.sanitizedValue,
      generoId: generoId && generoId.trim() !== '' ? generoId : null,
      autorIds: authorsCheck.sanitizedValue
    };

    const added = typeof state.addLibro === 'function' ? state.addLibro(newBook) : state.addBook(newBook);
    if (!added) {
      setFeedback('Error inesperado al registrar el libro en el estado.', 'error');
      return { success: false, error: 'No se pudo guardar el libro' };
    }

    // Limpieza de formulario y feedback de éxito
    const form = document.getElementById('form-libro');
    if (form) {
      form.reset();
    }
    clearFieldErrors();
    setFeedback(`¡El libro "${newBook.titulo}" fue registrado exitosamente en el catálogo!`, 'success');

    return { success: true, book: newBook };
  }

  /**
   * Renderiza el listado de libros registrados en la tabla del DOM de forma 100% segura (sin innerHTML)
   * @param {Array} [booksList] - Lista de libros a mostrar (opcional, consulta state por defecto)
   */
  function renderTable(booksList) {
    if (typeof document === 'undefined') return;

    const state = root.LibreriaApp.state;
    const formatters = root.LibreriaApp.formatters;
    const books = booksList || (state && typeof state.getLibros === 'function' ? state.getLibros() : (state && typeof state.getBooks === 'function' ? state.getBooks() : []));
    const tbody = document.getElementById('libros-table-body');
    if (!tbody) return;

    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }

    if (!Array.isArray(books) || books.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 7;
      emptyCell.textContent = 'No hay libros registrados en el sistema.';
      emptyCell.style.textAlign = 'center';
      emptyCell.style.color = 'var(--text-muted)';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    const editoriales = state && typeof state.getEditoriales === 'function' ? state.getEditoriales() : (state && typeof state.getEditorials === 'function' ? state.getEditorials() : []);
    const generos = state && typeof state.getGeneros === 'function' ? state.getGeneros() : (state && typeof state.getGenres === 'function' ? state.getGenres() : []);
    const autores = state && typeof state.getAutores === 'function' ? state.getAutores() : (state && typeof state.getAuthors === 'function' ? state.getAuthors() : []);

    books.forEach((book) => {
      const tr = document.createElement('tr');

      const tdId = document.createElement('td');
      tdId.textContent = book.id || '-';
      tdId.style.fontFamily = 'monospace';

      const tdTitulo = document.createElement('td');
      tdTitulo.textContent = book.titulo || '-';
      tdTitulo.style.fontWeight = '500';

      const tdIsbn = document.createElement('td');
      tdIsbn.textContent = book.isbn || '-';
      tdIsbn.style.fontFamily = 'monospace';

      const tdEditorial = document.createElement('td');
      tdEditorial.textContent = formatters && typeof formatters.getEditorialName === 'function'
        ? formatters.getEditorialName(book.editorialId, editoriales)
        : (book.editorialId || '-');

      const tdGenero = document.createElement('td');
      const genName = formatters && typeof formatters.getGeneroName === 'function'
        ? formatters.getGeneroName(book.generoId, generos)
        : (book.generoId || 'Sin clasificar');
      tdGenero.textContent = genName;

      const tdAutores = document.createElement('td');
      tdAutores.textContent = formatters && typeof formatters.formatAuthors === 'function'
        ? formatters.formatAuthors(book.autorIds, autores)
        : (Array.isArray(book.autorIds) ? book.autorIds.join(', ') : '-');

      const tdPrecio = document.createElement('td');
      tdPrecio.textContent = formatters && typeof formatters.formatCurrency === 'function'
        ? formatters.formatCurrency(book.precio)
        : `$${Number(book.precio || 0).toFixed(2)}`;
      tdPrecio.style.fontWeight = '600';

      tr.appendChild(tdId);
      tr.appendChild(tdTitulo);
      tr.appendChild(tdIsbn);
      tr.appendChild(tdEditorial);
      tr.appendChild(tdGenero);
      tr.appendChild(tdAutores);
      tr.appendChild(tdPrecio);
      tbody.appendChild(tr);
    });
  }

  /**
   * Inicializa la vista de libros
   */
  function init() {
    if (typeof document === 'undefined') return;

    populateSelects();
    renderTable();

    // Suscripción reactiva para refresco de tabla y selectores ante nuevos libros
    const state = root.LibreriaApp.state;
    if (state && typeof state.subscribe === 'function') {
      state.subscribe((event) => {
        if (event === 'init' || event === 'libros:updated' || event === 'book:added') {
          populateSelects();
          renderTable();
        }
      });
    }

    const form = document.getElementById('form-libro');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
      form.addEventListener('reset', () => {
        setTimeout(clearFieldErrors, 0);
      });
    }

    const btnReset = document.getElementById('btn-reset-libro');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        setFeedback('', 'success');
      });
    }
  }

  const librosView = {
    init,
    populateSelects,
    renderTable,
    handleFormSubmit,
    setFeedback,
    clearFieldErrors
  };

  root.LibreriaApp.views.libros = librosView;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = librosView;
  }
})();
