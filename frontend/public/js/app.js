/**
 * ============================================================================
 * App - Inicializador Central de la SPA Librería Central
 * Orquestación de módulos, ciclo de vida de persistencia y enrutador
 * ============================================================================
 */

(function () {
  'use strict';

  // Espacio de nombres global
  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  window.LibreriaApp = window.LibreriaApp || {};
  root.LibreriaApp = window.LibreriaApp;

  // Bandera para asegurar que los listeners de sincronización se registren una sola vez
  let _storageSyncAttached = false;

  /**
   * Vincula los eventos de mutación de estado con la persistencia inmediata en storage (RN-PER-03)
   * @param {Object} app - Referencia al namespace LibreriaApp
   */
  function setupStorageSync(app) {
    if (_storageSyncAttached || !app.state || !app.storage) return;
    _storageSyncAttached = true;

    app.state.on('libros:updated', () => {
      app.storage.saveBooks(app.state.getBooks());
    });

    app.state.on('clientes:updated', () => {
      app.storage.saveClients(app.state.getClients());
    });

    app.state.on('ventas:updated', () => {
      app.storage.saveSales(app.state.getSales());
    });
  }

  /**
   * Inicializa los subsistemas de la SPA cuando el DOM está completamente cargado
   */
  function initApp() {
    const app = root.LibreriaApp;

    // 1. Inicializar el almacén central de estado y ciclo de vida de persistencia (RN-PER-01, RN-PER-02)
    if (app.state) {
      if (app.storage && app.storage.isInitialized()) {
        // Sesión subsiguiente: hidratar el estado directamente desde localStorage sin duplicar semilla
        const persistedData = app.storage.getAllData();
        app.state.init(persistedData);
        console.info(`[LibreriaApp] Estado restaurado desde localStorage: ${app.state.getBooks().length} libros, ${app.state.getClients().length} clientes, ${app.state.getSales().length} ventas.`);
      } else if (app.seedData) {
        // Primer inicio: almacenar la semilla inicial completa y activar la bandera
        if (app.storage) {
          app.storage.saveInitialSeed(app.seedData);
        }
        app.state.init(app.seedData);
        console.info(`[LibreriaApp] Estado inicializado con semilla inicial: ${app.state.getBooks().length} libros, ${app.state.getClients().length} clientes.`);
      } else {
        console.warn('[LibreriaApp] Advertencia: seedData o storage no se encuentran disponibles.');
      }

      // Configurar sincronización reactiva hacia localStorage (RN-PER-03)
      setupStorageSync(app);
    } else {
      console.warn('[LibreriaApp] Advertencia: state o seedData no se encuentran disponibles.');
    }

    // 2. Inicializar las vistas disponibles
    if (app.views) {
      if (app.views.catalogo && typeof app.views.catalogo.init === 'function') {
        app.views.catalogo.init();
      }
      if (app.views.libros && typeof app.views.libros.init === 'function') {
        app.views.libros.init();
      }
      if (app.views.clientes && typeof app.views.clientes.init === 'function') {
        app.views.clientes.init();
      }
      if (app.views.ventas && typeof app.views.ventas.init === 'function') {
        app.views.ventas.init();
      }
      if (app.views.historial && typeof app.views.historial.init === 'function') {
        app.views.historial.init();
      }
    }

    // 3. Inicializar el enrutador por hash
    if (app.router && typeof app.router.init === 'function') {
      app.router.init();
    } else {
      console.error('[LibreriaApp] Error crítico: el módulo router no se encuentra disponible.');
      return;
    }

    console.info('[LibreriaApp] SPA Shell, Catálogo, Libros, Clientes, Ventas, Historial y Storage inicializados correctamente (v1.4.0).');
  }

  // Esperar a que el DOM esté disponible para iniciar
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      // Si el DOM ya cargó previamente (ej. script diferido ejecutado tras parseo)
      initApp();
    }
  }

  // Exposición de la función de arranque
  root.LibreriaApp.init = initApp;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initApp };
  }
})();
