/**
 * ============================================================================
 * App - Inicializador Central de la SPA Librería Central (Evaluación Global)
 * Orquestación de módulos, cliente API y enrutador por hash
 * ============================================================================
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  window.LibreriaApp = window.LibreriaApp || {};
  root.LibreriaApp = window.LibreriaApp;

  /**
   * Inicializa los subsistemas de la SPA cuando el DOM está completamente cargado
   */
  async function initApp() {
    const app = root.LibreriaApp;

    // 1. Verificación inicial de salud de la API
    if (app.api && typeof app.api.checkHealth === 'function') {
      try {
        const health = await app.api.checkHealth();
        console.info('[LibreriaApp] Conexión establecida con la API FastAPI (/api/health/ready):', health);
      } catch (err) {
        console.warn('[LibreriaApp] Advertencia: la API no responde en /api/health/ready:', err.message);
      }
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

    console.info('[LibreriaApp] SPA Librería Central (Evaluación Global) inicializada con éxito.');
  }

  // Esperar a que el DOM esté disponible para iniciar
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }
  }

  root.LibreriaApp.init = initApp;
})();
