/**
 * ============================================================================
 * State Manager - Almacén Centralizado de Estado en Memoria
 * Fuente única de verdad para libros, editoriales, géneros, autores, clientes y ventas
 * ============================================================================
 */

(function () {
  'use strict';

  // Soporte universal para ejecución en navegador (window) y entorno de testing (globalThis / Node)
  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.LibreriaApp = root.LibreriaApp || {};

  // Estado privado en memoria
  const _state = {
    libros: [],
    editoriales: [],
    generos: [],
    autores: [],
    clientes: [],
    ventas: []
  };

  // Suscriptores para reactividad entre módulos
  const _listeners = [];

  function notify(event, data) {
    _listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (err) {
        console.error('[LibreriaApp.state] Error en listener:', err);
      }
    });
  }

  const state = {
    /**
     * Inicializa el estado con colecciones base garantizando clonación profunda
     * @param {Object} seedData - Conjunto de datos iniciales
     */
    init(seedData = {}) {
      _state.libros = Array.isArray(seedData.libros) ? seedData.libros.map((b) => ({ ...b })) : [];
      _state.editoriales = Array.isArray(seedData.editoriales) ? seedData.editoriales.map((e) => ({ ...e })) : [];
      _state.generos = Array.isArray(seedData.generos) ? seedData.generos.map((g) => ({ ...g })) : [];
      _state.autores = Array.isArray(seedData.autores) ? seedData.autores.map((a) => ({ ...a })) : [];
      _state.clientes = Array.isArray(seedData.clientes) ? seedData.clientes.map((c) => ({ ...c })) : [];
      _state.ventas = Array.isArray(seedData.ventas)
        ? seedData.ventas.map((s) => ({
            ...s,
            renglones: Array.isArray(s.renglones) ? s.renglones.map((r) => ({ ...r })) : []
          }))
        : [];
      notify('init', { ..._state });
    },

    // ------------------------------------------------------------------------
    // Libros
    // ------------------------------------------------------------------------
    getBooks() {
      return _state.libros.map((b) => ({ ...b }));
    },
    getLibros() {
      return this.getBooks();
    },
    getBookById(id) {
      const found = _state.libros.find((b) => b.id === id);
      return found ? { ...found } : null;
    },
    getBookByISBN(isbn) {
      if (!isbn) return null;
      const cleanISBN = String(isbn).replace(/[\s-]/g, '').toLowerCase();
      const found = _state.libros.find((b) => String(b.isbn).replace(/[\s-]/g, '').toLowerCase() === cleanISBN);
      return found ? { ...found } : null;
    },
    addBook(book) {
      if (!book || typeof book !== 'object') return false;
      _state.libros.push({ ...book });
      notify('book:added', { book: { ...book } });
      notify('libros:updated', { libro: { ...book }, libros: this.getBooks() });
      return true;
    },
    addLibro(libro) {
      return this.addBook(libro);
    },
    updateBookPrice(bookId, newPrice) {
      const index = _state.libros.findIndex((b) => b.id === bookId);
      if (index === -1) return false;
      const num = Number(newPrice);
      if (isNaN(num) || num <= 0) return false;
      const newBook = {
        ..._state.libros[index],
        precio: Math.round((num + Number.EPSILON) * 100) / 100
      };
      _state.libros[index] = newBook;
      notify('book:updated', { book: { ...newBook } });
      notify('libros:updated', { libro: { ...newBook }, libros: this.getBooks() });
      return true;
    },

    // ------------------------------------------------------------------------
    // Editoriales (Entidad de referencia fija)
    // ------------------------------------------------------------------------
    getEditorials() {
      return _state.editoriales.map((e) => ({ ...e }));
    },
    getEditoriales() {
      return this.getEditorials();
    },
    getEditorialById(id) {
      const found = _state.editoriales.find((e) => e.id === id);
      return found ? { ...found } : null;
    },

    // ------------------------------------------------------------------------
    // Géneros (Entidad de referencia fija)
    // ------------------------------------------------------------------------
    getGenres() {
      return _state.generos.map((g) => ({ ...g }));
    },
    getGeneros() {
      return this.getGenres();
    },
    getGenreById(id) {
      const found = _state.generos.find((g) => g.id === id);
      return found ? { ...found } : null;
    },

    // ------------------------------------------------------------------------
    // Autores (Entidad de referencia fija)
    // ------------------------------------------------------------------------
    getAuthors() {
      return _state.autores.map((a) => ({ ...a }));
    },
    getAutores() {
      return this.getAuthors();
    },
    getAuthorById(id) {
      const found = _state.autores.find((a) => a.id === id);
      return found ? { ...found } : null;
    },

    // ------------------------------------------------------------------------
    // Clientes
    // ------------------------------------------------------------------------
    getClients() {
      return _state.clientes.map((c) => ({ ...c }));
    },
    getClientes() {
      return this.getClients();
    },
    getClientById(id) {
      const found = _state.clientes.find((c) => c.id === id);
      return found ? { ...found } : null;
    },
    getClientByEmail(email) {
      if (!email) return null;
      const cleanEmail = String(email).trim().toLowerCase();
      const found = _state.clientes.find((c) => String(c.email).trim().toLowerCase() === cleanEmail);
      return found ? { ...found } : null;
    },
    addClient(client) {
      if (!client || typeof client !== 'object') return false;
      _state.clientes.push({ ...client });
      notify('client:added', { client: { ...client } });
      notify('clientes:updated', { cliente: { ...client }, clientes: this.getClients() });
      return true;
    },
    addCliente(cliente) {
      return this.addClient(cliente);
    },

    // ------------------------------------------------------------------------
    // Ventas
    // ------------------------------------------------------------------------
    getNextSaleId() {
      const prefix = 'VNT-';
      let maxNum = 1000;
      _state.ventas.forEach((v) => {
        if (v && v.id && typeof v.id === 'string' && v.id.startsWith(prefix)) {
          const num = parseInt(v.id.substring(prefix.length), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      return `${prefix}${maxNum + 1}`;
    },
    getSales() {
      return _state.ventas.map((s) => ({
        ...s,
        renglones: Array.isArray(s.renglones) ? s.renglones.map((r) => ({ ...r })) : []
      }));
    },
    getVentas() {
      return this.getSales();
    },
    addSale(sale) {
      if (!sale || typeof sale !== 'object') return false;
      const clonedRenglones = Array.isArray(sale.renglones)
        ? sale.renglones.map((r) => ({ ...r }))
        : [];
      const clonedSale = {
        ...sale,
        renglones: clonedRenglones
      };
      _state.ventas.push(clonedSale);
      notify('sale:added', { sale: { ...clonedSale, renglones: clonedSale.renglones.map((r) => ({ ...r })) } });
      notify('ventas:updated', {
        sale: { ...clonedSale, renglones: clonedSale.renglones.map((r) => ({ ...r })) },
        ventas: this.getSales()
      });
      return true;
    },
    addVenta(venta) {
      return this.addSale(venta);
    },

    // ------------------------------------------------------------------------
    // Sistema de Suscripción Pub/Sub
    // ------------------------------------------------------------------------
    subscribe(listener) {
      if (typeof listener === 'function') {
        _listeners.push(listener);
        return () => {
          const index = _listeners.indexOf(listener);
          if (index !== -1) _listeners.splice(index, 1);
        };
      }
      return () => {};
    },

    /**
     * Suscripción semántica a un evento específico
     * @param {string} eventName - Nombre del evento (ej. 'libros:updated', 'clientes:updated')
     * @param {Function} handler - Callback que recibe data
     * @returns {Function} Función para desuscribir
     */
    on(eventName, handler) {
      if (typeof handler !== 'function') return () => {};
      return this.subscribe((event, data) => {
        if (event === eventName) {
          handler(data);
        }
      });
    }
  };

  root.LibreriaApp.state = state;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = state;
  }
})();
