/**
 * ============================================================================
 * App - Inicializador Central de la SPA Librería Central
 * Orquestación de módulos, modo oscuro accesible y enrutador por hash
 * ============================================================================
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  window.LibreriaApp = window.LibreriaApp || {};
  root.LibreriaApp = window.LibreriaApp;

  /**
   * Configura el conmutador de modo claro / oscuro accesible con persistencia
   */
  function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-toggle-icon');
    if (!btn) return;

    function updateThemeUI(theme) {
      const isDark = theme === 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      if (icon) icon.textContent = isDark ? '☀️' : '🌙';
      btn.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      btn.setAttribute('title', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    }

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateThemeUI(currentTheme);

    btn.addEventListener('click', () => {
      const activeTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('libreria_theme', activeTheme);
      } catch (e) {}
      updateThemeUI(activeTheme);
    });
  }

  /**
   * Inicializa los subsistemas de la SPA cuando el DOM está completamente cargado
   */
  async function initApp() {
    const app = root.LibreriaApp;

    // 1. Configurar Modo Oscuro
    setupThemeToggle();

    // 2. Verificación de salud silenciosa
    if (app.api && typeof app.api.checkHealth === 'function') {
      try {
        await app.api.checkHealth();
      } catch (err) {
        console.warn('[LibreriaApp] Aviso: API no disponible temporalmente:', err.message);
      }
    }

    // 3. Inicializar las vistas disponibles
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

    // 4. Inicializar el enrutador por hash
    if (app.router && typeof app.router.init === 'function') {
      app.router.init();
    } else {
      console.error('[LibreriaApp] Error: el módulo router no se encuentra disponible.');
      return;
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }
  }

  root.LibreriaApp.init = initApp;
})();
