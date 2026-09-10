// ─── ESTADOS DE CLIENTE ───────────────────────────
// Los mismos que ya usaba Fer, SIN "Pendiente".
export const ESTADOS = ["Activo", "Renovado", "Finalizado", "Baja"];

// ⚑ REGLA CENTRAL — única definición de "¿este cliente cuenta como activo?".
// Un cliente "Renovado" cuenta como activo en TODOS los contadores, filtros
// y paneles (KPIs, filtro "Activo", alertas) hasta que Fer lo pase a mano a
// "Finalizado" o "Baja". No copiar esta condición suelta en ningún otro sitio:
// importar SIEMPRE esta función.
export function esActivo(cliente) {
  return cliente?.estado === "Activo" || cliente?.estado === "Renovado";
}

// Cliente cuyo ciclo ya terminó (para análisis de retención / históricos).
export function esCerrado(cliente) {
  return cliente?.estado === "Renovado" || cliente?.estado === "Finalizado" || cliente?.estado === "Baja";
}

// Colores por estado (fondo, texto) para las etiquetas de la interfaz.
export const COLOR_ESTADO = {
  Activo: ["#e8f5fa", "#3d8aa5"],
  Renovado: ["#ede9fe", "#7c3aed"],
  Finalizado: ["#f3f4f6", "#6b7280"],
  Baja: ["#fee2e2", "#dc2626"],
};
