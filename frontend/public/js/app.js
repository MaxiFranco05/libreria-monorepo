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
   * Simulador de vista de teléfono móvil (iPhone 14 · 390x844) para evaluación y defensa
   * Carga un iframe sandbox con viewport móvil nativo adaptable a la altura de la pantalla (100vh).
   */
  function toggleDeviceSimulator(forceState) {
    const overlay = document.getElementById('device-simulator-overlay');
    const iframe = document.getElementById('simulator-iframe');
    if (!overlay) return;

    const shouldOpen = typeof forceState === 'boolean'
      ? forceState
      : !overlay.classList.contains('active');

    if (shouldOpen) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (iframe) {
        const currentHash = window.location.hash || '#catalogo';
        const baseUrl = window.location.origin + window.location.pathname;
        iframe.src = `${baseUrl}?simulated_mobile=true${currentHash}`;
      }
    } else {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      if (iframe) {
        iframe.src = 'about:blank';
      }
    }
  }

  function openSimulator() {
    toggleDeviceSimulator(true);
  }

  function closeSimulator() {
    toggleDeviceSimulator(false);
  }

  function reloadSimulatorIframe() {
    const iframe = document.getElementById('simulator-iframe');
    if (iframe) {
      try {
        iframe.contentWindow.location.reload();
      } catch (e) {
        const currentHash = window.location.hash || '#catalogo';
        const baseUrl = window.location.origin + window.location.pathname;
        iframe.src = `${baseUrl}?simulated_mobile=true${currentHash}`;
      }
    }
  }

  function openSimulatorInNewTab() {
    const iframe = document.getElementById('simulator-iframe');
    let targetUrl = window.location.href;
    if (iframe && iframe.contentWindow) {
      try {
        targetUrl = iframe.contentWindow.location.href || targetUrl;
      } catch (e) {}
    }
    window.open(targetUrl, '_blank');
  }

  root.toggleDeviceSimulator = toggleDeviceSimulator;
  root.openSimulator = openSimulator;
  root.closeSimulator = closeSimulator;
  root.reloadSimulatorIframe = reloadSimulatorIframe;
  root.openSimulatorInNewTab = openSimulatorInNewTab;

  window.toggleDeviceSimulator = toggleDeviceSimulator;
  window.openSimulator = openSimulator;
  window.closeSimulator = closeSimulator;
  window.reloadSimulatorIframe = reloadSimulatorIframe;
  window.openSimulatorInNewTab = openSimulatorInNewTab;

  // Prevención de recursión y emulación táctil en modo móvil simulado
  const isInsideSimulator = window.self !== window.top || window.location.search.includes('simulated_mobile=true');
  if (isInsideSimulator) {
    const simBtn = document.getElementById('simulator-toggle');
    if (simBtn) simBtn.style.display = 'none';
    const simOverlay = document.getElementById('device-simulator-overlay');
    if (simOverlay) simOverlay.style.display = 'none';

    // Si el usuario presiona Escape interactuando dentro del iframe, propagar el cierre a la ventana padre
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        try {
          if (window.parent && typeof window.parent.toggleDeviceSimulator === 'function') {
            window.parent.toggleDeviceSimulator(false);
          }
        } catch (err) {}
      }
    });

    // Emulación táctil (Touch Drag-to-Scroll): Arrastrar con el cursor como si fuera el dedo
    (function setupTouchDragToScroll() {
      let isDown = false;
      let startY = 0;
      let scrollTop = 0;
      let activeScrollable = null;
      let hasMoved = false;

      function getScrollContainer(target) {
        let el = target;
        while (el && el !== document.body && el !== document.documentElement) {
          const style = window.getComputedStyle(el);
          const overflowY = style.overflowY;
          if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
            return el;
          }
          el = el.parentElement;
        }
        return window;
      }

      window.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const targetEl = e.target instanceof Element ? e.target : (e.target && e.target.parentElement);
        if (!targetEl || typeof targetEl.closest !== 'function') return;
        const interactive = targetEl.closest('button, input, select, textarea, a, kbd, label, [role="button"]');
        if (interactive) return;

        isDown = true;
        hasMoved = false;
        startY = e.pageY;
        activeScrollable = getScrollContainer(e.target);
        scrollTop = activeScrollable === window ? (window.pageYOffset || document.documentElement.scrollTop) : activeScrollable.scrollTop;
        document.body.style.cursor = 'grab';
        document.body.style.userSelect = 'none';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const deltaY = e.pageY - startY;
        if (Math.abs(deltaY) > 3) {
          hasMoved = true;
          document.body.style.cursor = 'grabbing';
        }
        if (activeScrollable === window) {
          window.scrollTo(0, scrollTop - deltaY);
        } else if (activeScrollable) {
          activeScrollable.scrollTop = scrollTop - deltaY;
        }
      });

      const endDrag = (e) => {
        if (!isDown) return;
        isDown = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (hasMoved) {
          const stopClick = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            window.removeEventListener('click', stopClick, true);
          };
          window.addEventListener('click', stopClick, true);
        }
      };

      window.addEventListener('mouseup', endDrag);
      window.addEventListener('mouseleave', endDrag);
    })();
  }

  /**
   * Cierre accesible de modales y del simulador móvil al hacer clic sobre el backdrop o presionar Escape
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

    const simOverlay = document.getElementById('device-simulator-overlay');
    if (simOverlay) {
      simOverlay.addEventListener('click', (e) => {
        if (e.target === simOverlay) {
          toggleDeviceSimulator(false);
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && simOverlay && simOverlay.classList.contains('active')) {
        toggleDeviceSimulator(false);
      }
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
