// ─── CONSULTAS TRANSVERSALES ──────────────────────
// Selectores que cruzan clientes + cobros para las pestañas globales
// (Llamadas, Carreras, Cobros) y el panel de Inicio.

import { esActivo } from "./estado.js";
import { calcularCliente } from "./logica.js";
import { hoyDias, isoADias, diasAIso, claveMes } from "./fechas.js";

export function mapaNombres(doc) {
  const m = {};
  for (const c of doc.clientes || []) m[c.id] = c.nombre;
  return m;
}

// ── Llamadas ─────────────────────────────────────
// Pendiente = ya toca y no está marcada como hecha. Solo clientes activos.
export function llamadas(doc, hoy = hoyDias()) {
  const pendientes = []; // ya tocaban y sin hacer
  const semanaQueViene = []; // toca la semana que viene → hay que agendar ya
  const proximas = []; // en 2-3 semanas
  const revisionMensual = []; // esta semana cumplen semana múltiplo de 4

  for (const c of doc.clientes || []) {
    if (!esActivo(c)) continue;
    const d = calcularCliente(c, hoy);

    // Renovación
    if (!c.llamadaRenovacion?.hecha) {
      const falta = d.semanaRenovacion - d.semanaPrograma;
      const fila = { cliente: c, d, tipo: "renovacion", semana: d.semanaRenovacion, ambito: "local" };
      if (falta <= 0) pendientes.push(fila);
      else if (falta === 1) semanaQueViene.push(fila);
      else if (falta <= 3) proximas.push({ ...fila, faltan: falta });
    }

    // Optimización
    for (const w of d.semanasOptimizacion) {
      if (c.llamadasOptimizacion?.[w]?.hecha) continue;
      const falta = w - d.semanaGlobal;
      const fila = { cliente: c, d, tipo: "optimizacion", semana: w, ambito: "global" };
      if (falta <= 0) pendientes.push(fila);
      else if (falta === 1) semanaQueViene.push(fila);
      else if (falta <= 3) proximas.push({ ...fila, faltan: falta });
    }

    // Revisión mensual (semana de programa múltiplo de 4)
    if (d.esMensual) {
      revisionMensual.push({ cliente: c, d, semana: d.semanaPrograma });
    }
  }

  const orden = (a, b) => (a.tipo === b.tipo ? a.semana - b.semana : a.tipo === "renovacion" ? -1 : 1);
  pendientes.sort(orden);
  semanaQueViene.sort(orden);
  proximas.sort((a, b) => a.faltan - b.faltan);
  revisionMensual.sort((a, b) => a.cliente.nombre.localeCompare(b.cliente.nombre));

  return {
    pendientes,
    semanaQueViene,
    proximas,
    revisionMensual,
    // compatibilidad con panelInicio (recuento de pendientes)
    pendientesRenov: pendientes.filter((x) => x.tipo === "renovacion"),
    pendientesOptim: pendientes.filter((x) => x.tipo === "optimizacion"),
  };
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

// ── Panel de Inicio ──────────────────────────────
export function panelInicio(doc, hoy = hoyDias()) {
  const clientes = doc.clientes || [];
  const cobros = doc.cobros || [];

  const activos = clientes.filter(esActivo);
  const nActivo = clientes.filter((c) => c.estado === "Activo").length;
  const nRenovado = clientes.filter((c) => c.estado === "Renovado").length;

  // Límites del mes natural actual
  const hoyIso = diasAIso(hoy);
  const mesActual = hoyIso.slice(0, 7); // "AAAA-MM"
  const [y, m] = mesActual.split("-").map(Number);
  const primerDia = isoADias(`${mesActual}-01`);
  const primerDiaSigMes = isoADias(
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`
  );
  const ultimoDia = primerDiaSigMes - 1;

  const cobrosMes = cobros.filter((c) => claveMes(c.fechaPago) === mesActual);
  const ingresosMes = sum(cobrosMes.filter((c) => c.estado === "Cobrado"));
  const ingresosMesPendiente = sum(cobrosMes.filter((c) => c.estado !== "Cobrado"));

  // Renovaciones previstas del mes = clientes activos cuyo ciclo termina este mes
  const renovacionesMes = activos
    .map((c) => ({ cliente: c, d: calcularCliente(c, hoy) }))
    .filter(({ d }) => d.finDias != null && d.finDias >= primerDia && d.finDias <= ultimoDia)
    .sort((a, b) => a.d.finDias - b.d.finDias);

  const pagosPendientes = cobros
    .filter((c) => c.estado !== "Cobrado")
    .map((c) => ({ ...c, clienteNombre: mapaNombres(doc)[c.clienteId] || "—" }))
    .sort((a, b) => String(a.fechaPago).localeCompare(String(b.fechaPago)));
  const totalPendiente = sum(pagosPendientes);

  const { pendientesRenov, pendientesOptim, revisionMensual } = llamadas(doc, hoy);
  const carrerasProximas = carreras(doc, hoy).proximas.filter((f) => f.diasRestantes <= 30);

  return {
    activos: activos.length,
    nActivo,
    nRenovado,
    mesActual,
    ingresosMes,
    ingresosMesPendiente,
    renovacionesMes,
    pagosPendientes,
    totalPendiente,
    pendientesRenov,
    pendientesOptim,
    revisionMensual,
    carrerasProximas,
  };
}

// ── Serie de ingresos cobrados por mes (para la gráfica) ──
// Devuelve los últimos `n` meses hasta el actual, con la suma cobrada de cada uno.
export function serieIngresos(doc, hoy = hoyDias(), n = 8) {
  const mesActual = diasAIso(hoy).slice(0, 7);
  let [y, m] = mesActual.split("-").map(Number);
  const meses = [];
  for (let i = 0; i < n; i++) {
    meses.unshift(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  const porMes = {};
  for (const c of doc.cobros || []) {
    if (c.estado !== "Cobrado") continue;
    const k = claveMes(c.fechaPago);
    if (k) porMes[k] = (porMes[k] || 0) + (Number(c.importe) || 0);
  }
  return meses.map((mes) => ({ mes, total: Math.round(porMes[mes] || 0) }));
}
