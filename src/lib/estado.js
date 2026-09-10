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

// Paleta por estado: [fondo, texto, acento].
export const COLOR_ESTADO = {
  Activo: ["#e7f3f8", "#256780", "#5ba5c0"],
  Renovado: ["#f1ecfe", "#6d28d9", "#8b5cf6"],
  Finalizado: ["#f1f3f5", "#5b6472", "#9ca3af"],
  Baja: ["#ffeef1", "#be123c", "#f43f5e"],
};

// Paleta por color de semáforo (urgencia): [fondo, texto, acento].
export const COLOR_SEMAFORO = {
  "🔴": ["#fdecec", "#b91c1c", "#ef4444"],
  "🟡": ["#fdf4e3", "#b45309", "#f59e0b"],
  "🟢": ["#e9f9ee", "#15803d", "#22c55e"],
  "⚫": ["#f1f3f5", "#6b7280", "#9ca3af"],
};

// Color de urgencia a partir de días restantes (para carreras, plazos…).
export function urgenciaPorDias(dias) {
  if (dias == null) return "⚫";
  if (dias <= 7) return "🔴";
  if (dias <= 21) return "🟡";
  return "🟢";
}
