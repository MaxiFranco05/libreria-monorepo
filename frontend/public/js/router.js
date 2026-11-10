/**
 * ============================================================================
 * Router SPA - Enrutador Nativo por Hash
 * Gestión de vistas, fallback a #catalogo y accesibilidad de navegación
 * ============================================================================
 */

(function () {
  'use strict';

  // Espacio de nombres global de la aplicación
  window.LibreriaApp = window.LibreriaApp || {};

  /**
   * Rutas válidas registradas en el shell de la aplicación
   */
  const VALID_ROUTES = Object.freeze([
    'catalogo',
    'libros',
    'clientes',
    'ventas',
    'historial'
  ]);

  const DEFAULT_ROUTE = 'catalogo';

  /**
   * Extrae y normaliza el ID de ruta a partir del hash actual de la URL
   * @returns {string} ID de ruta validado
   */
  function parseHash() {
    const rawHash = window.location.hash.replace(/^#/, '').trim().toLowerCase();
    if (!rawHash || !VALID_ROUTES.includes(rawHash)) {
      return DEFAULT_ROUTE;
    }
    return rawHash;
  }

  /**
   * Actualiza el estado visual y semántico de los enlaces de la barra de navegación
   * @param {string} activeRoute - ID de la ruta activa
   */
  function updateNavLinks(activeRoute) {
    const navLinks = document.querySelectorAll('.app-nav .nav-link');
    const targetHash = `#${activeRoute}`;

    navLinks.forEach((link) => {
      const isTarget = link.getAttribute('href') === targetHash;
      if (isTarget) {
        link.setAttribute('aria-current', 'page');
        link.classList.add('active');
      } else {
        link.removeAttribute('aria-current');
        link.classList.remove('active');
      }
    });
  }

  /**
   * Conmuta la visibilidad de las secciones de vista y transfiere el foco de manera accesible
   * @param {string} activeRoute - ID de la sección a activar
   */
  function activateView(activeRoute) {
    const sections = document.querySelectorAll('.view-section');
    let activeSection = null;

    sections.forEach((section) => {
      if (section.id === activeRoute) {
        section.classList.add('active');
        activeSection = section;
      } else {
        section.classList.remove('active');
      }
    });

    // Accesibilidad: transferir el foco al encabezado principal de la vista activa
    if (activeSection) {
      const heading = activeSection.querySelector('h2');
      if (heading) {
        heading.focus({ preventScroll: true });
      }
    }
  }

  /**
   * Manejador principal invocado ante cambios de hash o carga inicial
   */
  function handleRoute() {
    const targetRoute = parseHash();

    // Si el hash en la barra de direcciones difiere de la ruta resuelta, normalizar sin recarga
    if (window.location.hash !== `#${targetRoute}`) {
      window.location.hash = `#${targetRoute}`;
      return; // El cambio de hash volverá a disparar handleRoute()
    }

    // Restablecer posición de scroll al inicio de la nueva vista
    if (typeof window.scrollTo === 'function') {
      window.scrollTo(0, 0);
    }

    updateNavLinks(targetRoute);
    activateView(targetRoute);
  }

  /**
   * Configura la interceptación accesible del skip-link para evitar alterar el hash de ruta
   */
  function setupSkipLink() {
    const skipLink = document.querySelector('.skip-link');
    if (skipLink) {
      skipLink.addEventListener('click', (e) => {
        e.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus({ preventScroll: false });
          if (typeof mainContent.scrollIntoView === 'function') {
            mainContent.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    }
  }

  /**
   * Navega programáticamente hacia una ruta registrada
   * @param {string} routeId - ID de la ruta destino
   */
  function navigateTo(routeId) {
    const target = VALID_ROUTES.includes(routeId) ? routeId : DEFAULT_ROUTE;
    window.location.hash = `#${target}`;
  }

  /**
   * Inicializa los listeners del enrutador y componentes de navegación
   */
  function init() {
    setupSkipLink();
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  // Exposición del enrutador en el namespace de la aplicación
  window.LibreriaApp.router = {
    init,
    navigateTo,
    parseHash,
    setupSkipLink,
    VALID_ROUTES,
    DEFAULT_ROUTE
  };
})();
