// ─── LÓGICA DE PROGRAMA ───────────────────────────
// Portada 1:1 (en comportamiento) del calc() del CRM anterior.
// Diferencias: fechas en ISO (no números serie) y nombres en claro.

import { isoADias, hoyDias } from "./fechas.js";

// Modalidad → semanas totales del ciclo.
export const MODALIDADES = {
  "3 meses": 12,
  "6 meses": 24,
  "6+1 meses": 28,
  "12 meses": 52,
};
export const LISTA_MODALIDADES = ["3 meses", "6 meses", "6+1 meses", "12 meses"];

export function semanasDeModalidad(modalidad) {
  return MODALIDADES[modalidad] || 12;
}

// Semana (local, dentro del ciclo) en la que toca la llamada de renovación.
export function semanaDeRenovacion(modalidad) {
  if (modalidad === "6 meses") return 23;
  if (modalidad === "6+1 meses") return 27;
  if (modalidad === "12 meses") return 50;
  return 11; // 3 meses
}

// Semanas (en numeración GLOBAL) en las que toca llamada de optimización:
// cada 6 semanas (cada 7 en la modalidad "6+1"), dentro del ciclo vigente.
export function semanasDeOptimizacion(modalidad, semanasPrevias = 0, semanasTotal = 12) {
  const intervalo = modalidad === "6+1 meses" ? 7 : 6;
  const res = [];
  for (let w = intervalo; w <= 400; w += intervalo) {
    if (w > semanasPrevias && w <= semanasPrevias + semanasTotal - 1) res.push(w);
  }
  return res;
}

function semaforoPorDias(diasRestantes) {
  if (diasRestantes <= 0) return "⚫";
  if (diasRestantes <= 7) return "🔴";
  if (diasRestantes <= 21) return "🟡";
  return "🟢";
}

// Carreras del cliente ordenadas y filtradas.
export function carrerasOrdenadas(cliente, hoy = hoyDias()) {
  const lista = Array.isArray(cliente?.carreras) ? cliente.carreras : [];
  return lista
    .map((r) => ({ ...r, _dias: isoADias(r.fecha) }))
    .filter((r) => r._dias != null)
    .sort((a, b) => a._dias - b._dias);
}

// ── Cálculo principal de un cliente ──────────────
export function calcularCliente(cliente, hoy = hoyDias()) {
  const fiDias = isoADias(cliente?.fechaInicio);
  const st = Number(cliente?.semanasTotal) || semanasDeModalidad(cliente?.modalidad);
  const sp = Number(cliente?.semanasPrevias) || 0;

  const totalDias = st * 7;
  const finDias = fiDias == null ? null : fiDias + totalDias;
  const diasRestantes = finDias == null ? null : finDias - hoy;
  const transcurridos = fiDias == null ? 0 : Math.max(0, hoy - fiDias);

  const pct = totalDias > 0 ? Math.max(0, Math.min(transcurridos / totalDias, 1)) : 0;
  const semanaPrograma = Math.max(1, Math.min(Math.floor(transcurridos / 7) + 1, st));
  const semanaGlobal = sp + semanaPrograma;
  const semaforo = diasRestantes == null ? "⚫" : semaforoPorDias(diasRestantes);

  const semanaRenovacion = semanaDeRenovacion(cliente?.modalidad);
  const semanasOptimizacion = semanasDeOptimizacion(cliente?.modalidad, sp, st);

  const esRenovacionAhora = semanaPrograma === semanaRenovacion;
  const esRenovacionPronto = semanaPrograma === semanaRenovacion - 1;
  const esOptimizacionAhora = semanasOptimizacion.includes(semanaGlobal);
  const proximaOptimizacion = semanasOptimizacion.find((w) => w > semanaGlobal) || null;
  const esMensual = semanaPrograma % 4 === 0;

  const carreras = carrerasOrdenadas(cliente, hoy);
  const carrerasProximas = carreras.filter((r) => r._dias > hoy);
  const proximaCarrera = carrerasProximas[0] || null;
  const diasProximaCarrera = proximaCarrera ? proximaCarrera._dias - hoy : null;

  return {
    fiDias,
    finDias,
    diasRestantes,
    pct,
    semanaPrograma,
    semanaGlobal,
    semaforo,
    semanaRenovacion,
    semanasOptimizacion,
    esRenovacionAhora,
    esRenovacionPronto,
    esOptimizacionAhora,
    proximaOptimizacion,
    esMensual,
    carreras,
    carrerasProximas,
    proximaCarrera,
    diasProximaCarrera,
  };
}
