/**
 * ============================================================================
 * Seed Data - Datos Iniciales Obligatorios de la Librería
 * Mínimos exigidos por consigna de cátedra (Parcial 1 - Programación III UTN)
 * ============================================================================
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.LibreriaApp = root.LibreriaApp || {};

  const seedData = Object.freeze({
    // Editoriales fijas (mínimo 2)
    editoriales: Object.freeze([
      { id: 'ed-1', nombre: 'Editorial Siglo XXI' },
      { id: 'ed-2', nombre: 'Penguin Random House' }
    ]),

    // Géneros fijos (mínimo 2)
    generos: Object.freeze([
      { id: 'gen-1', nombre: 'Ficción' },
      { id: 'gen-2', nombre: 'Ensayo' }
    ]),

    // Autores fijos (mínimo 3)
    autores: Object.freeze([
      { id: 'aut-1', nombre: 'Jorge Luis Borges' },
      { id: 'aut-2', nombre: 'Julio Cortázar' },
      { id: 'aut-3', nombre: 'Mariana Enríquez' }
    ]),

    // Clientes iniciales (mínimo 3)
    clientes: Object.freeze([
      { id: 'cli-1', nombreCompleto: 'Juan Pérez', email: 'juan.perez@example.com' },
      { id: 'cli-2', nombreCompleto: 'María Gómez', email: 'maria.gomez@example.com' },
      { id: 'cli-3', nombreCompleto: 'Carlos Rodríguez', email: 'carlos.rodriguez@example.com' }
    ]),

    // Libros iniciales (mínimo 6, contemplando género null)
    libros: Object.freeze([
      {
        id: 'lib-1',
        titulo: 'Ficciones',
        isbn: '9789500424554',
        precio: 1500,
        editorialId: 'ed-1',
        generoId: 'gen-1',
        autorIds: ['aut-1']
      },
      {
        id: 'lib-2',
        titulo: 'El Aleph',
        isbn: '9789500424561',
        precio: 2000,
        editorialId: 'ed-1',
        generoId: 'gen-1',
        autorIds: ['aut-1']
      },
      {
        id: 'lib-3',
        titulo: 'Rayuela',
        isbn: '9789870407133',
        precio: 2500,
        editorialId: 'ed-2',
        generoId: 'gen-1',
        autorIds: ['aut-2']
      },
      {
        id: 'lib-4',
        titulo: 'Bestiario',
        isbn: '9789870407140',
        precio: 1800,
        editorialId: 'ed-2',
        generoId: 'gen-1',
        autorIds: ['aut-2']
      },
      {
        id: 'lib-5',
        titulo: 'Nuestra parte de noche',
        isbn: '9788433998859',
        precio: 3200,
        editorialId: 'ed-2',
        generoId: 'gen-1',
        autorIds: ['aut-3']
      },
      {
        id: 'lib-6',
        titulo: 'Las cosas que perdimos en el fuego',
        isbn: '9788433998064',
        precio: 1900,
        editorialId: 'ed-1',
        generoId: null, // RN-CAT-06: Género ausente representado como null («Sin clasificar»)
        autorIds: ['aut-3']
      }
    ]),

    ventas: Object.freeze([])
  });

  root.LibreriaApp.seedData = seedData;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = seedData;
  }
})();
