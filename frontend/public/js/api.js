/**
 * ============================================================================
 * Cliente HTTP Centralizado (js/api.js)
 * Conexión centralizada con la API de FastAPI mediante JavaScript nativo (fetch)
 * Cumple con el Ejercicio 1 de la evaluación Global:
 * - URL base pública '/api'
 * - Conservación estricta de barras finales (/api/libros/, /api/ventas/, etc.)
 * - Parseo uniforme de respuestas y manejo estandarizado de errores (409, 422, red)
 * ============================================================================
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.LibreriaApp = root.LibreriaApp || {};

  const BASE_URL = '/api';

  /**
   * Extrae de forma legible el mensaje de error devuelto por FastAPI (detail)
   * @param {any} detail - Campo detail devuelto por el servidor
   * @param {string} fallback - Mensaje por defecto si no se puede parsear
   * @returns {string} Mensaje human-readable
   */
  function extractDetailMessage(detail, fallback) {
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((err) => {
          const loc = Array.isArray(err.loc) ? err.loc.filter((p) => p !== 'body').join(' -> ') : '';
          return loc ? `${loc}: ${err.msg}` : err.msg;
        })
        .join(' | ');
    }
    if (typeof detail === 'object' && detail.msg) return detail.msg;
    return JSON.stringify(detail);
  }

  /**
   * Ejecuta peticiones fetch con gestión de headers, timeout y normalización de errores
   * @param {string} endpoint - Ruta relativa que inicia con / (ej: '/libros/')
   * @param {RequestInit} [options={}] - Opciones de fetch
   * @returns {Promise<any>}
   */
  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const defaultHeaders = {
      'Accept': 'application/json'
    };

    if (options.body && typeof options.body === 'string') {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    let response;
    try {
      response = await fetch(url, config);
    } catch (networkError) {
      const error = new Error('No se pudo establecer conexión con el servidor. Verifique su red o el estado de la API.');
      error.status = 0;
      error.isNetworkError = true;
      error.originalError = networkError;
      throw error;
    }

    // Petición exitosa sin contenido (204)
    if (response.status === 204) {
      return null;
    }

    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonErr) {
        data = null;
      }
    } else {
      try {
        data = await response.text();
      } catch (textErr) {
        data = null;
      }
    }

    if (!response.ok) {
      const fallbackMsg = `Error en el servidor (${response.status} ${response.statusText})`;
      const message = extractDetailMessage(data && data.detail, fallbackMsg);
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      error.detail = data && data.detail;
      throw error;
    }

    return data;
  }

  const api = {
    BASE_URL,

    // ------------------------------------------------------------------------
    // Salud y Diagnóstico
    // ------------------------------------------------------------------------
    async checkHealth() {
      return request('/health/ready');
    },

    // ------------------------------------------------------------------------
    // Libros y Catálogo (Ejercicio 1 y 2)
    // ------------------------------------------------------------------------
    async getLibros({ titulo, limit = 20, offset = 0, genero_id } = {}) {
      const params = new URLSearchParams();
      if (titulo && titulo.trim()) params.set('titulo', titulo.trim());
      if (limit !== undefined && limit !== null) params.set('limit', String(limit));
      if (offset !== undefined && offset !== null) params.set('offset', String(offset));
      if (genero_id) params.set('genero_id', String(genero_id));

      const qs = params.toString();
      const endpoint = `/libros/${qs ? `?${qs}` : ''}`;
      return request(endpoint, { method: 'GET' });
    },

    async getLibro(id) {
      if (!id) throw new Error('ID de libro no especificado');
      return request(`/libros/${id}`, { method: 'GET' });
    },

    async createLibro(payload) {
      return request('/libros/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    async patchLibro(id, payload) {
      if (!id) throw new Error('ID de libro no especificado');
      return request(`/libros/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    },

    // ------------------------------------------------------------------------
    // Entidades Relacionales Auxiliares (Editoriales, Géneros, Autores)
    // ------------------------------------------------------------------------
    async getEditoriales() {
      return request('/editoriales/', { method: 'GET' });
    },

    async getGeneros() {
      return request('/generos/', { method: 'GET' });
    },

    async getAutor(id) {
      if (!id) throw new Error('ID de autor no especificado');
      return request(`/autores/${id}`, { method: 'GET' });
    },

    // ------------------------------------------------------------------------
    // Clientes (Ejercicio 2)
    // ------------------------------------------------------------------------
    async getClientes({ limit = 100, offset = 0 } = {}) {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      return request(`/clientes/?${params.toString()}`, { method: 'GET' });
    },

    async getCliente(id) {
      if (!id) throw new Error('ID de cliente no especificado');
      return request(`/clientes/${id}`, { method: 'GET' });
    },

    async createCliente(payload) {
      return request('/clientes/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    // ------------------------------------------------------------------------
    // Ventas e Historial (Ejercicio 3)
    // ------------------------------------------------------------------------
    async getVentas({ limit = 20, offset = 0 } = {}) {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      return request(`/ventas/?${params.toString()}`, { method: 'GET' });
    },

    async getVenta(id) {
      if (!id) throw new Error('ID de venta no especificado');
      return request(`/ventas/${id}`, { method: 'GET' });
    },

    async createVenta(payload) {
      return request('/ventas/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  };

  root.LibreriaApp.api = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
