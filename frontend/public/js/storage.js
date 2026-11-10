/**
 * ============================================================================
 * Storage Adapter - Capa de Persistencia Segura en LocalStorage
 * Gestión de claves canónicas, serialización JSON tolerante a fallos
 * y control del ciclo de vida de la aplicación.
 * ============================================================================
 */

(function () {
  'use strict';

  // Soporte universal para ejecución en navegador (window) y Node.js (globalThis / tests)
  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.LibreriaApp = root.LibreriaApp || {};

  /**
   * Obtiene la referencia al motor de almacenamiento local (o fallback en memoria)
   * @returns {Storage|Object} Instancia de almacenamiento
   */
  function getStorageEngine() {
    try {
      if (typeof root.localStorage !== 'undefined' && root.localStorage !== null) {
        return root.localStorage;
      }
      if (typeof localStorage !== 'undefined' && localStorage !== null) {
        return localStorage;
      }
    } catch (e) {
      console.warn('[LibreriaApp.storage] Acceso a localStorage restringido o no disponible:', e.message);
    }
    return null;
  }

  // Claves canónicas estandarizadas
  const KEYS = Object.freeze({
    INITIALIZED: 'libreria_inicializada',
    BOOKS: 'libreria_libros',
    CLIENTS: 'libreria_clientes',
    SALES: 'libreria_ventas',
    EDITORIALS: 'libreria_editoriales',
    GENRES: 'libreria_generos',
    AUTHORS: 'libreria_autores'
  });

  const storage = {
    KEYS,

    /**
     * Recupera un valor almacenado deserializado con manejo seguro de errores
     * @param {string} key - Clave a consultar
     * @param {*} defaultValue - Valor retornado ante ausencia o fallo de parseo
     * @returns {*} Valor recuperado o defaultValue
     */
    get(key, defaultValue = null) {
      const engine = getStorageEngine();
      if (!engine) return defaultValue;

      try {
        const raw = engine.getItem(key);
        if (raw === null || typeof raw === 'undefined') {
          return defaultValue;
        }
        return JSON.parse(raw);
      } catch (err) {
        console.warn(`[LibreriaApp.storage] Error al leer o deserializar la clave "${key}":`, err.message);
        return defaultValue;
      }
    },

    /**
     * Serializa y almacena un valor bajo la clave especificada
     * @param {string} key - Clave canónica
     * @param {*} value - Valor u objeto a serializar
     * @returns {boolean} True si se guardó con éxito, False ante error
     */
    set(key, value) {
      const engine = getStorageEngine();
      if (!engine) return false;

      try {
        const serialized = JSON.stringify(value);
        engine.setItem(key, serialized);
        return true;
      } catch (err) {
        console.error(`[LibreriaApp.storage] Error al serializar o persistir la clave "${key}":`, err.message);
        return false;
      }
    },

    /**
     * Remueve una clave específica del almacenamiento
     * @param {string} key - Clave a eliminar
     * @returns {boolean} True si se eliminó con éxito
     */
    remove(key) {
      const engine = getStorageEngine();
      if (!engine) return false;
      try {
        engine.removeItem(key);
        return true;
      } catch (err) {
        console.warn(`[LibreriaApp.storage] Error al remover la clave "${key}":`, err.message);
        return false;
      }
    },

    /**
     * Verifica si una clave existe en el almacenamiento
     * @param {string} key - Clave a comprobar
     * @returns {boolean} True si existe
     */
    has(key) {
      const engine = getStorageEngine();
      if (!engine) return false;
      try {
        return engine.getItem(key) !== null;
      } catch (err) {
        return false;
      }
    },

    /**
     * Limpia todas las claves administradas por la aplicación
     */
    clearAll() {
      const engine = getStorageEngine();
      if (!engine) return;
      try {
        Object.values(KEYS).forEach((k) => engine.removeItem(k));
      } catch (err) {
        console.warn('[LibreriaApp.storage] Error al limpiar almacenamiento:', err.message);
      }
    },

    // ------------------------------------------------------------------------
    // Ciclo de Vida y Bandera de Inicialización
    // ------------------------------------------------------------------------

    /**
     * Verifica si la aplicación ya ha sido inicializada previamente en localStorage
     * @returns {boolean} True si libreria_inicializada === 'true'
     */
    isInitialized() {
      const val = this.get(KEYS.INITIALIZED, null);
      return val === 'true' || val === true;
    },

    /**
     * Marca o desmarca la bandera de inicialización
     * @param {boolean} value - Estado booleano
     * @returns {boolean} True si se guardó con éxito
     */
    setInitialized(value = true) {
      if (value) {
        return this.set(KEYS.INITIALIZED, 'true');
      }
      return this.remove(KEYS.INITIALIZED);
    },

    /**
     * Persiste la totalidad de las colecciones de la semilla inicial
     * @param {Object} seedData - Semilla que contiene libros, editoriales, etc.
     * @returns {boolean} True si todas las colecciones se almacenaron con éxito
     */
    saveInitialSeed(seedData = {}) {
      try {
        this.saveBooks(Array.isArray(seedData.libros) ? seedData.libros : []);
        this.saveEditorials(Array.isArray(seedData.editoriales) ? seedData.editoriales : []);
        this.saveGenres(Array.isArray(seedData.generos) ? seedData.generos : []);
        this.saveAuthors(Array.isArray(seedData.autores) ? seedData.autores : []);
        this.saveClients(Array.isArray(seedData.clientes) ? seedData.clientes : []);
        this.saveSales(Array.isArray(seedData.ventas) ? seedData.ventas : []);
        this.setInitialized(true);
        return true;
      } catch (err) {
        console.error('[LibreriaApp.storage] Error al guardar la semilla inicial:', err.message);
        return false;
      }
    },

    // ------------------------------------------------------------------------
    // Libros
    // ------------------------------------------------------------------------
    getBooks() {
      const books = this.get(KEYS.BOOKS, []);
      return Array.isArray(books) ? books.map((b) => ({ ...b })) : [];
    },
    getLibros() {
      return this.getBooks();
    },
    saveBooks(books) {
      return this.set(KEYS.BOOKS, Array.isArray(books) ? books : []);
    },
    saveLibros(libros) {
      return this.saveBooks(libros);
    },

    // ------------------------------------------------------------------------
    // Clientes
    // ------------------------------------------------------------------------
    getClients() {
      const clients = this.get(KEYS.CLIENTS, []);
      return Array.isArray(clients) ? clients.map((c) => ({ ...c })) : [];
    },
    getClientes() {
      return this.getClients();
    },
    saveClients(clients) {
      return this.set(KEYS.CLIENTS, Array.isArray(clients) ? clients : []);
    },
    saveClientes(clientes) {
      return this.saveClients(clientes);
    },

    // ------------------------------------------------------------------------
    // Ventas
    // ------------------------------------------------------------------------
    getSales() {
      const sales = this.get(KEYS.SALES, []);
      return Array.isArray(sales)
        ? sales.map((s) => ({
            ...s,
            renglones: Array.isArray(s.renglones) ? s.renglones.map((r) => ({ ...r })) : []
          }))
        : [];
    },
    getVentas() {
      return this.getSales();
    },
    saveSales(sales) {
      return this.set(KEYS.SALES, Array.isArray(sales) ? sales : []);
    },
    saveVentas(ventas) {
      return this.saveSales(ventas);
    },

    // ------------------------------------------------------------------------
    // Entidades de Referencia Fijas
    // ------------------------------------------------------------------------
    getEditorials() {
      const eds = this.get(KEYS.EDITORIALS, []);
      return Array.isArray(eds) ? eds.map((e) => ({ ...e })) : [];
    },
    getEditoriales() {
      return this.getEditorials();
    },
    saveEditorials(editorials) {
      return this.set(KEYS.EDITORIALS, Array.isArray(editorials) ? editorials : []);
    },
    saveEditoriales(editoriales) {
      return this.saveEditorials(editoriales);
    },

    getGenres() {
      const genres = this.get(KEYS.GENRES, []);
      return Array.isArray(genres) ? genres.map((g) => ({ ...g })) : [];
    },
    getGeneros() {
      return this.getGenres();
    },
    saveGenres(genres) {
      return this.set(KEYS.GENRES, Array.isArray(genres) ? genres : []);
    },
    saveGeneros(generos) {
      return this.saveGenres(generos);
    },

    getAuthors() {
      const authors = this.get(KEYS.AUTHORS, []);
      return Array.isArray(authors) ? authors.map((a) => ({ ...a })) : [];
    },
    getAutores() {
      return this.getAuthors();
    },
    saveAuthors(authors) {
      return this.set(KEYS.AUTHORS, Array.isArray(authors) ? authors : []);
    },
    saveAutores(autores) {
      return this.saveAuthors(autores);
    },

    /**
     * Carga todas las colecciones almacenadas en un único objeto estructurado
     * @returns {Object} Dataset completo para hidratar LibreriaApp.state
     */
    getAllData() {
      return {
        libros: this.getBooks(),
        editoriales: this.getEditorials(),
        generos: this.getGenres(),
        autores: this.getAuthors(),
        clientes: this.getClients(),
        ventas: this.getSales()
      };
    }
  };

  root.LibreriaApp.storage = storage;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = storage;
  }
})();
