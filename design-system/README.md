# Sistema de Diseño — Librería Central (Gestión Editorial)

> **Propósito**: Identidad visual editorial moderna, accesible y de alta factura artesanal para el sistema de gestión de catálogo, ventas y stock de Librería Central (Evaluación Global Programación III - UTN FRM).

## Metadatos
- **Revisión**: 1
- **Aprobación**: Pendiente de revisión del usuario (Mockup visual generado)
- **Modo**: system-and-mockups
- **Filosofía**: Emil Kowalski (`emil-design-eng`) + Reglas Anti-Slop (`design-taste-frontend-v1`).

---

## Decisiones Fundamentales

1. **Eliminación del AI-Slop**:
   - Prohibido el fondo azul eléctrico / neon sci-fi genérico.
   - Prohibido el uso de Inter genérico sin personalidad o textos técnicos como `GET /libros/{id}`.
   - Prohibidos los brillos púrpuras, bordes gruesos y tarjetas idénticas sin jerarquía.

2. **Identidad Editorial Cálida**:
   - **Modo Claro (Papel & Tinta)**: Fondo marfil/papel archivo cálido (`#FBF9F5`), tinta carbón (`#18181B`), acento terracota/siena editorial (`#9A3412`), bordes milimétricos limpios (`#E7E4DD`).
   - **Modo Oscuro (Obsidiana & Ámbar)**: Fondo grafito neutro (`#0D0F12`), tarjetas grafito suave (`#15181E`), acento ámbar literario (`#F59E0B`), bordes sutiles sin resplandores exagerados.

3. **Tipografía**:
   - **Títulos y Portadas**: Tipografía Serif editorial de alto contraste (`Newsreader`, `Charter`, `Iowan Old Style`, serif).
   - **Controles y Navegación**: Tipografía Sans limpia y técnica (`Plus Jakarta Sans`, `Geist`, `-apple-system`, sans-serif).
   - **Cifras, Moneda e ISBN**: Tipografía monoespaciada tabular (`JetBrains Mono`, `ui-monospace`, monospace).

4. **Micro-interacciones y Tactilidad**:
   - Botones con estado físico activo `:active { transform: scale(0.97); }`.
   - Modales nativos `<dialog>` con cierre accesible (Esc, clic exterior y botón `✕`), sin intercepciones no deseadas.
   - Curvas de aceleración naturales: `cubic-bezier(0.16, 1, 0.3, 1)`.

---

## Archivos del Sistema
- `brand.md`: Guía de voz, tono y elementos de marca.
- `brand.js`: Constantes de marca reutilizables.
- `tokens.css`: Variables semánticas para modo claro y oscuro.
- `components.html`: Mockup interactivo completo y autónomo para previsualización inmediata.
- `previews/`: Capturas de pantalla en escritorio (1440x900) y móvil (390x844).
