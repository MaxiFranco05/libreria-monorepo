/**
 * Brand Constants & Binding Helper for Previews
 */
const BRAND_NAME = "Librería Central";
const BRAND_TAGLINE = "Fondo Editorial & Gestión de Ventas";

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-brand-name]").forEach((el) => {
      el.textContent = BRAND_NAME;
    });
    document.querySelectorAll("[data-brand-tagline]").forEach((el) => {
      el.textContent = BRAND_TAGLINE;
    });
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { BRAND_NAME, BRAND_TAGLINE };
}
