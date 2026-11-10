/**
 * ============================================================================
 * Libros View - Formulario y Controlador de Alta de Libros (Ejercicio 2)
 * ============================================================================
 * Maneja la interacción del formulario de libros, validación en cliente,
 * consulta de editoriales/géneros, verificación de autores con GET /autores/{id},
 * alta mediante POST /libros/ (201) y manejo de errores 409 (ISBN duplicado) o 422.
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.LibreriaApp = root.LibreriaApp || {};
  root.LibreriaApp.views = root.LibreriaApp.views || {};

  // Estado temporal de autorías para el libro en creación
  let pendingAuthors = [];
  let lastVerifiedAuthor = null;

  /**
   * Muestra mensaje en el contenedor de feedback del formulario
   * @param {string} message
   * @param {'success'|'error'} type
   */
  function setFeedback(message, type) {
    const container = document.getElementById('libro-feedback');
    if (!container) return;
    container.innerHTML = '';
    if (!message) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = type === 'success' ? 'alert alert-success' : 'alert alert-error';
    alertDiv.textContent = message;
    container.appendChild(alertDiv);
  }

  /**
   * Asigna o limpia un mensaje de error por campo
   */
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
    setFieldError('error-libro-titulo', 'libro-titulo', null);
    setFieldError('error-libro-isbn', 'libro-isbn', null);
    setFieldError('error-libro-precio', 'libro-precio', null);
    setFieldError('error-libro-stock', 'libro-stock', null);
    setFieldError('error-libro-editorial', 'libro-editorial', null);
    setFieldError('error-libro-genero', 'libro-genero', null);
    setFieldError('error-libro-autores', null, null);
    setFeedback('', 'success');
  }

  /**
   * Carga dinámica de selects de Editoriales y Géneros desde la API
   */
  async function loadSelectOptions() {
    const api = root.LibreriaApp.api;
    const editorialSelect = document.getElementById('libro-editorial');
    const generoSelect = document.getElementById('libro-genero');

    try {
      const [editoriales, generos] = await Promise.all([
        api.getEditoriales(),
        api.getGeneros()
      ]);

      if (root.LibreriaApp.state) {
        if (root.LibreriaApp.state.setEditoriales) root.LibreriaApp.state.setEditoriales(editoriales);
        if (root.LibreriaApp.state.setGeneros) root.LibreriaApp.state.setGeneros(generos);
      }

      if (editorialSelect) {
        editorialSelect.innerHTML = '<option value="">-- Seleccione una editorial --</option>';
        editoriales.forEach((ed) => {
          const opt = document.createElement('option');
          opt.value = ed.id;
          opt.textContent = `${ed.nombre}${ed.pais ? ` (${ed.pais})` : ''}`;
          editorialSelect.appendChild(opt);
        });
      }

      if (generoSelect) {
        generoSelect.innerHTML = '<option value="">«Sin clasificar»</option>';
        generos.forEach((gen) => {
          const opt = document.createElement('option');
          opt.value = gen.id;
          opt.textContent = gen.nombre;
          generoSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('[LibrosView] Error cargando editoriales o géneros:', err);
      if (editorialSelect) editorialSelect.innerHTML = '<option value="">Error al cargar opciones</option>';
    }
  }

  /**
   * Renderiza los chips de autorías agregadas para el nuevo libro
   */
  function renderAuthorChips() {
    const container = document.getElementById('libro-autores-agregados');
    if (!container) return;
    container.innerHTML = '';

    if (pendingAuthors.length === 0) {
      container.innerHTML = '<span class="text-muted" style="font-size: 0.85rem; font-style: italic;">No hay autorías añadidas todavía (se requiere al menos una).</span>';
      return;
    }

    pendingAuthors.forEach((item, index) => {
      const chip = document.createElement('div');
      chip.className = 'author-chip';
      chip.innerHTML = `
        <span><strong>#${item.orden}</strong> ${escapeHtml(item.nombre)}</span>
        <span class="chip-role">(${escapeHtml(item.rol)})</span>
        <button type="button" class="btn-remove-chip" aria-label="Eliminar autoría">&times;</button>
      `;

      chip.querySelector('.btn-remove-chip').addEventListener('click', () => {
        pendingAuthors.splice(index, 1);
        renderAuthorChips();
      });

      container.appendChild(chip);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Verifica un autor mediante GET /autores/{id} (Ejercicio 2)
   */
  async function verifyAuthorById() {
    const idInput = document.getElementById('libro-autor-id-input');
    const infoSpan = document.getElementById('libro-autor-verificado-info');
    if (!idInput || !infoSpan) return;

    const autorId = parseInt(idInput.value, 10);
    if (isNaN(autorId) || autorId <= 0) {
      infoSpan.textContent = 'Ingrese un ID numérico de autor válido (>= 1).';
      infoSpan.style.color = 'var(--color-error)';
      lastVerifiedAuthor = null;
      return;
    }

    infoSpan.textContent = 'Verificando con la API...';
    infoSpan.style.color = 'var(--text-secondary)';

    try {
      const autor = await root.LibreriaApp.api.getAutor(autorId);
      lastVerifiedAuthor = autor;
      infoSpan.textContent = `✓ Autor encontrado: ${autor.nombre} (${autor.nacionalidad || 'N/D'})`;
      infoSpan.style.color = '#15803d'; // Verde éxito
    } catch (err) {
      lastVerifiedAuthor = null;
      infoSpan.textContent = `✗ ${err.message || 'Autor no encontrado en la base de datos (404)'}`;
      infoSpan.style.color = 'var(--color-error)';
    }
  }

  /**
   * Agrega el autor verificado a la lista pendingAuthors
   */
  function addVerifiedAuthorToList() {
    const infoSpan = document.getElementById('libro-autor-verificado-info');
    const rolSelect = document.getElementById('libro-autor-rol');
    const ordenInput = document.getElementById('libro-autor-orden');
    const idInput = document.getElementById('libro-autor-id-input');

    if (!lastVerifiedAuthor) {
      if (infoSpan) {
        infoSpan.textContent = 'Debe verificar primero un ID de autor existente con la API.';
        infoSpan.style.color = 'var(--color-error)';
      }
      return;
    }

    const rol = rolSelect ? rolSelect.value : 'autor';
    const orden = ordenInput ? (parseInt(ordenInput.value, 10) || 1) : 1;

    // Verificar si ya está agregado
    const existingIndex = pendingAuthors.findIndex((a) => a.autor_id === lastVerifiedAuthor.id);
    if (existingIndex !== -1) {
      pendingAuthors[existingIndex].rol = rol;
      pendingAuthors[existingIndex].orden = orden;
    } else {
      pendingAuthors.push({
        autor_id: lastVerifiedAuthor.id,
        nombre: lastVerifiedAuthor.nombre,
        rol,
        orden
      });
    }

    // Ordenar por campo orden
    pendingAuthors.sort((a, b) => a.orden - b.orden);
    renderAuthorChips();

    // Limpiar input y mensaje de autor verificado
    if (idInput) idInput.value = '';
    if (infoSpan) infoSpan.textContent = '';
    if (ordenInput) ordenInput.value = pendingAuthors.length + 1;
    lastVerifiedAuthor = null;
    setFieldError('error-libro-autores', null, null);
  }

  /**
   * Carga y renderiza la tabla de libros registrados
   */
  async function loadBooksTable() {
    const tbody = document.getElementById('libros-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Cargando libros desde la API...</td></tr>';

    try {
      const state = root.LibreriaApp.state || {};
      const formatters = root.LibreriaApp.formatters || {};
      const formatCurrency = formatters.formatCurrency || ((v) => `$${Number(v).toFixed(2)}`);

      const editoriales = state.getEditoriales ? state.getEditoriales() : [];
      const generos = state.getGeneros ? state.getGeneros() : [];

      const books = await root.LibreriaApp.api.getLibros({ limit: 50, offset: 0 });
      if (!Array.isArray(books) || books.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;" class="text-muted">No hay libros registrados en la API.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      books.forEach((book) => {
        const edName = formatters.getEditorialName ? formatters.getEditorialName(book.editorial_id, editoriales) : 'N/D';
        const genName = formatters.getGeneroName ? formatters.getGeneroName(book.genero_id, generos) : 'Sin clasificar';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${book.id}</strong></td>
          <td>${escapeHtml(book.titulo)}</td>
          <td><code>${escapeHtml(book.isbn)}</code></td>
          <td>${escapeHtml(edName)}</td>
          <td><span class="badge ${genName === 'Sin clasificar' ? 'badge-navy' : ''}">${escapeHtml(genName)}</span></td>
          <td>${book.stock ?? 0} u.</td>
          <td style="font-weight: 600;">${formatCurrency(book.precio)}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-pagination" data-book-id="${book.id}">
              Ver Detalle
            </button>
          </td>
        `;

        tr.querySelector('button').addEventListener('click', () => {
          if (root.LibreriaApp.views.catalogo && typeof root.LibreriaApp.views.catalogo.loadCatalog === 'function') {
            // Reutilizar modal de detalle del catálogo
            const modal = document.getElementById('modal-libro-detalle');
            if (modal) {
              root.LibreriaApp.views.catalogo.loadCatalog(); // sincroniza
            }
          }
          // Abrir modal directamente
          openBookModalDirect(book.id);
        });

        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error('[LibrosView] Error cargando tabla de libros:', err);
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-error);">Error al cargar libros: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  async function openBookModalDirect(bookId) {
    const modal = document.getElementById('modal-libro-detalle');
    const modalTitle = document.getElementById('modal-libro-titulo');
    const modalBody = document.getElementById('modal-libro-contenido');
    if (!modal || !modalBody) return;

    modalTitle.textContent = 'Cargando detalle...';
    modalBody.innerHTML = '<p style="text-align: center;">Consultando libro...</p>';
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');

    try {
      const book = await root.LibreriaApp.api.getLibro(bookId);
      modalTitle.textContent = book.titulo;
      const formatCurrency = root.LibreriaApp.formatters?.formatCurrency || ((v) => `$${Number(v).toFixed(2)}`);
      const autorias = Array.isArray(book.autorias) ? book.autorias : [];

      modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div><strong>ISBN:</strong> ${escapeHtml(book.isbn)} | <strong>Precio:</strong> ${formatCurrency(book.precio)} | <strong>Stock:</strong> ${book.stock}</div>
          <div><strong>Editorial:</strong> ${escapeHtml(book.editorial?.nombre || 'N/D')} | <strong>Género:</strong> ${escapeHtml(book.genero?.nombre || 'Sin clasificar')}</div>
          <h4 style="margin-top: 1rem; color: var(--accent-navy);">Autorías registradas (GET /libros/${bookId}):</h4>
          <table class="table" style="font-size: 0.9rem;">
            <thead><tr><th>Orden</th><th>Autor</th><th>Rol</th><th>Nacionalidad</th></tr></thead>
            <tbody>
              ${autorias.map((a) => `
                <tr>
                  <td>#${a.orden ?? 1}</td>
                  <td>${escapeHtml(a.autor?.nombre || 'Desconocido')}</td>
                  <td><span class="badge">${escapeHtml(a.rol)}</span></td>
                  <td>${escapeHtml(a.autor?.nacionalidad || 'N/D')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      modalBody.innerHTML = `<p style="color: var(--color-error);">${escapeHtml(e.message)}</p>`;
    }
  }

  /**
   * Procesa el envío del formulario mediante POST /libros/
   * @param {Event} e
   */
  async function handleSubmit(e) {
    e.preventDefault();
    clearAllErrors();

    const tituloInput = document.getElementById('libro-titulo');
    const isbnInput = document.getElementById('libro-isbn');
    const precioInput = document.getElementById('libro-precio');
    const stockInput = document.getElementById('libro-stock');
    const editorialSelect = document.getElementById('libro-editorial');
    const generoSelect = document.getElementById('libro-genero');

    const titulo = tituloInput ? tituloInput.value.trim() : '';
    const isbn = isbnInput ? isbnInput.value.trim() : '';
    const precio = precioInput ? parseFloat(precioInput.value) : NaN;
    const stock = stockInput ? parseInt(stockInput.value, 10) : NaN;
    const editorialId = editorialSelect ? parseInt(editorialSelect.value, 10) : NaN;
    const generoId = (generoSelect && generoSelect.value) ? parseInt(generoSelect.value, 10) : null;

    let hasErrors = false;

    if (!titulo) {
      setFieldError('error-libro-titulo', 'libro-titulo', 'El título es obligatorio.');
      hasErrors = true;
    }
    if (!isbn) {
      setFieldError('error-libro-isbn', 'libro-isbn', 'El ISBN es obligatorio.');
      hasErrors = true;
    }
    if (isNaN(precio) || precio <= 0) {
      setFieldError('error-libro-precio', 'libro-precio', 'El precio debe ser un número positivo mayor a 0.');
      hasErrors = true;
    }
    if (isNaN(stock) || stock < 0) {
      setFieldError('error-libro-stock', 'libro-stock', 'El stock debe ser un entero mayor o igual a 0.');
      hasErrors = true;
    }
    if (isNaN(editorialId) || editorialId <= 0) {
      setFieldError('error-libro-editorial', 'libro-editorial', 'Debe seleccionar una editorial.');
      hasErrors = true;
    }
    if (pendingAuthors.length === 0) {
      setFieldError('error-libro-autores', null, 'Debe asociar al menos un autor al libro.');
      hasErrors = true;
    }

    if (hasErrors) return;

    const submitBtn = document.getElementById('btn-submit-libro');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Registrando en API...';
    }

    const payload = {
      titulo,
      isbn,
      precio,
      stock,
      editorial_id: editorialId,
      genero_id: generoId,
      autores: pendingAuthors.map((a) => ({
        autor_id: a.autor_id,
        rol: a.rol,
        orden: a.orden
      }))
    };

    try {
      const createdBook = await root.LibreriaApp.api.createLibro(payload);

      setFeedback(`¡Libro "${createdBook.titulo}" registrado exitosamente con ID ${createdBook.id}!`, 'success');

      // Limpiar formulario y estado de autorías
      const form = document.getElementById('form-libro');
      if (form) form.reset();
      pendingAuthors = [];
      renderAuthorChips();

      // Recargar tabla de libros y catálogo
      await loadBooksTable();
      if (root.LibreriaApp.views.catalogo && typeof root.LibreriaApp.views.catalogo.loadCatalog === 'function') {
        root.LibreriaApp.views.catalogo.loadCatalog({ resetOffset: true });
      }
    } catch (err) {
      console.error('[LibrosView] Error al registrar libro:', err);
      // Mostrar mensaje del servidor ante 409 o 422 sin perder el borrador
      setFeedback(`Error del servidor (${err.status || 'Red'}): ${err.message}`, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Registrar Libro';
      }
    }
  }

  function init() {
    const form = document.getElementById('form-libro');
    if (form) {
      form.addEventListener('submit', handleSubmit);
      form.addEventListener('reset', () => {
        pendingAuthors = [];
        lastVerifiedAuthor = null;
        renderAuthorChips();
        clearAllErrors();
      });
    }

    const verifyBtn = document.getElementById('btn-verificar-autor');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', verifyAuthorById);
    }

    const addAuthorBtn = document.getElementById('btn-agregar-autor-lista');
    if (addAuthorBtn) {
      addAuthorBtn.addEventListener('click', addVerifiedAuthorToList);
    }

    const refreshBtn = document.getElementById('btn-refresh-libros');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadBooksTable);
    }

    // Cargar selectores y tabla
    loadSelectOptions();
    loadBooksTable();
  }

  const librosView = {
    init,
    loadSelectOptions,
    loadBooksTable,
    onActivate() {
      loadSelectOptions();
      loadBooksTable();
    }
  };

  root.LibreriaApp.views.libros = librosView;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = librosView;
  }
})();
