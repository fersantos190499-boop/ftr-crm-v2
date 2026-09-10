// ─── CONSULTAS TRANSVERSALES ──────────────────────
// Selectores que cruzan clientes + cobros para las pestañas globales
// (Llamadas, Carreras, Cobros) y el panel de Inicio.

import { esActivo } from "./estado.js";
import { calcularCliente } from "./logica.js";
import { hoyDias, isoADias, claveMes } from "./fechas.js";

export function mapaNombres(doc) {
  const m = {};
  for (const c of doc.clientes || []) m[c.id] = c.nombre;
  return m;
}

// ── Llamadas ─────────────────────────────────────
// Pendiente = ya toca y no está marcada como hecha. Solo clientes activos.
export function llamadas(doc, hoy = hoyDias()) {
  const pendientesRenov = [];
  const pendientesOptim = [];
  const proximas = [];

  for (const c of doc.clientes || []) {
    if (!esActivo(c)) continue;
    const d = calcularCliente(c, hoy);

    // Renovación
    if (!c.llamadaRenovacion?.hecha) {
      if (d.semanaPrograma >= d.semanaRenovacion) {
        pendientesRenov.push({ cliente: c, d, tipo: "renovacion", semana: d.semanaRenovacion });
      } else if (d.semanaRenovacion - d.semanaPrograma <= 3) {
        proximas.push({
          cliente: c,
          d,
          tipo: "renovacion",
          semana: d.semanaRenovacion,
          faltan: d.semanaRenovacion - d.semanaPrograma,
        });
      }
    }

    // Optimización
    for (const w of d.semanasOptimizacion) {
      const hecha = c.llamadasOptimizacion?.[w]?.hecha;
      if (hecha) continue;
      if (w <= d.semanaGlobal) {
        pendientesOptim.push({ cliente: c, d, tipo: "optimizacion", semana: w });
      } else if (w - d.semanaGlobal <= 3) {
        proximas.push({ cliente: c, d, tipo: "optimizacion", semana: w, faltan: w - d.semanaGlobal });
      }
    }
  }

  proximas.sort((a, b) => a.faltan - b.faltan);
  return { pendientesRenov, pendientesOptim, proximas };
}

// ── Carreras ─────────────────────────────────────
export function carreras(doc, hoy = hoyDias()) {
  const filas = [];
  for (const c of doc.clientes || []) {
    for (const r of c.carreras || []) {
      const dias = isoADias(r.fecha);
      filas.push({
        ...r,
        clienteId: c.id,
        clienteNombre: c.nombre,
        diasRestantes: dias == null ? null : dias - hoy,
        _orden: dias == null ? Infinity : dias,
      });
    }
  }
  filas.sort((a, b) => a._orden - b._orden);
  return {
    proximas: filas.filter((f) => f.diasRestantes != null && f.diasRestantes >= 0),
    pasadas: filas.filter((f) => f.diasRestantes != null && f.diasRestantes < 0).reverse(),
  };
}

// ── Cobros por mes de facturación (fechaPago) ─────
export function cobrosPorMes(doc) {
  const nombres = mapaNombres(doc);
  const mapa = new Map();
  for (const co of doc.cobros || []) {
    const k = claveMes(co.fechaPago) || "0000-00";
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push({ ...co, clienteNombre: nombres[co.clienteId] || "—" });
  }
  return [...mapa.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([mes, lista]) => ({
      mes,
      cobros: lista.slice().sort((a, b) => String(b.fechaPago).localeCompare(String(a.fechaPago))),
      totalCobrado: sum(lista.filter((c) => c.estado === "Cobrado")),
      totalPendiente: sum(lista.filter((c) => c.estado !== "Cobrado")),
    }));
}

const sum = (arr) => arr.reduce((s, c) => s + (Number(c.importe) || 0), 0);
