/**
 * ============================================================================
 * App - Inicializador Central de la SPA Librería Central
 * Orquestación de módulos, modo oscuro accesible, switch animado y simulador móvil
 * ============================================================================
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  window.LibreriaApp = window.LibreriaApp || {};
  root.LibreriaApp = window.LibreriaApp;

  /**
   * Configura el conmutador de modo claro / oscuro accesible con persistencia y switch animado
   */
  function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    const thumbIcon = document.getElementById('theme-toggle-icon');
    if (!btn) return;

    function updateThemeUI(theme) {
      const isDark = theme === 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      btn.setAttribute('aria-checked', isDark ? 'true' : 'false');
      btn.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      btn.setAttribute('title', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');

      if (thumbIcon) {
        if (isDark) {
          thumbIcon.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>';
        } else {
          thumbIcon.innerHTML = `
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="m4.93 4.93 1.41 1.41"></path>
            <path d="m17.66 17.66 1.41 1.41"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
          `;
        }
      }
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
   * Simulador de vista de teléfono móvil (390x844) para evaluación y defensa
   */
  function toggleDeviceSimulator() {
    const isSimulator = document.body.classList.toggle('device-simulator-mode');
    const btnText = document.getElementById('simulator-btn-text');
    if (btnText) {
      btnText.textContent = isSimulator ? 'Salir de Móvil' : 'Simular Móvil';
    }
  }
  root.toggleDeviceSimulator = toggleDeviceSimulator;
  window.toggleDeviceSimulator = toggleDeviceSimulator;

  /**
   * Cierre accesible de modales al hacer clic sobre el backdrop
   */
  function setupBackdropModalClose() {
    const dialogs = document.querySelectorAll('dialog.app-modal');
    dialogs.forEach((dialog) => {
      dialog.addEventListener('click', (e) => {
        const rect = dialog.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY &&
          e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX &&
          e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
          dialog.close();
        }
      });
    });
  }

  /**
   * Inicializa los subsistemas de la SPA cuando el DOM está completamente cargado
   */
  async function initApp() {
    const app = root.LibreriaApp;

    // 1. Configurar Modo Oscuro y Modales
    setupThemeToggle();
    setupBackdropModalClose();

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
