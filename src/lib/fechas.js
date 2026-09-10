// ─── FECHAS ───────────────────────────────────────
// Formato de almacenamiento: texto ISO "AAAA-MM-DD".
// Internamente se trabaja en "días desde epoch" (enteros) para que todos
// los cálculos de semanas/plazos sean restas exactas sin líos de horas.

const MS_DIA = 86400000;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "AAAA-MM-DD" → días desde epoch (UTC). Devuelve null si no es válida.
export function isoADias(iso) {
  if (!iso || typeof iso !== "string") return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  const t = Date.UTC(y, mo - 1, d);
  const dd = new Date(t);
  // rechaza fechas imposibles (ej. 2026-02-31)
  if (dd.getUTCFullYear() !== y || dd.getUTCMonth() !== mo - 1 || dd.getUTCDate() !== d) return null;
  return Math.floor(t / MS_DIA);
}

// días desde epoch → "AAAA-MM-DD"
export function diasAIso(dias) {
  if (dias == null || !Number.isFinite(dias)) return null;
  const d = new Date(dias * MS_DIA);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

// Hoy en días desde epoch, en horario local (el "día natural" de la usuaria).
export function hoyDias() {
  const n = new Date();
  return Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / MS_DIA);
}

// "dd/mm/aaaa" (lo que teclea la usuaria) → "AAAA-MM-DD". null si no cuadra.
export function ddmmaaaaAIso(str) {
  if (!str) return null;
  const p = String(str).trim().split(/[/\-.]/);
  if (p.length !== 3) return null;
  const [d, m, y] = p.map((x) => parseInt(x, 10));
  if (!d || !m || !y) return null;
  const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return isoADias(iso) == null ? null : iso;
}

// ─── FORMATEO (solo presentación) ─────────────────
export function fFecha(iso) {
  const dias = isoADias(iso);
  if (dias == null) return "—";
  const d = new Date(dias * MS_DIA);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function fFechaCorta(iso) {
  const dias = isoADias(iso);
  if (dias == null) return "—";
  const d = new Date(dias * MS_DIA);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

export function fMesAnyo(iso) {
  const dias = isoADias(iso);
  if (dias == null) return "—";
  const d = new Date(dias * MS_DIA);
  return `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Clave de mes "AAAA-MM" (para agrupar cobros por mes de facturación).
export function claveMes(iso) {
  return typeof iso === "string" && /^\d{4}-\d{2}/.test(iso) ? iso.slice(0, 7) : null;
}

export { MS_DIA, MESES };
