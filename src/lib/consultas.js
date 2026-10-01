// ─── CONSULTAS TRANSVERSALES ──────────────────────
// Selectores que cruzan clientes + cobros para las pestañas globales
// (Llamadas, Carreras, Cobros) y el panel de Inicio.

import { esActivo } from "./estado.js";
import { calcularCliente } from "./logica.js";
import { hoyDias, isoADias, diasAIso, claveMes, dentroDeRango } from "./fechas.js";

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

// Lista de claves "AAAA-MM" de los últimos `n` meses, terminando en el actual.
function ultimosMeses(hoy, n) {
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
  return meses;
}

// ── Serie de ingresos cobrados por mes (para la gráfica) ──
// Devuelve los últimos `n` meses hasta el actual, con la suma cobrada de cada uno.
export function serieIngresos(doc, hoy = hoyDias(), n = 8) {
  const porMes = {};
  for (const c of doc.cobros || []) {
    if (c.estado !== "Cobrado") continue;
    const k = claveMes(c.fechaPago);
    if (k) porMes[k] = (porMes[k] || 0) + (Number(c.importe) || 0);
  }
  return ultimosMeses(hoy, n).map((mes) => ({ mes, total: Math.round(porMes[mes] || 0) }));
}

// Un cobro "dispara" una venta nueva si es el primer pago de un ciclo: una
// cuota 1 ("Cuota 1/3"), un pago único ("Programa completo", "Renovación",
// "Renovación anticipada"...) — cualquier concepto que NO sea "Cuota 2/3",
// "Cuota 3/3" etc. (una cuota 2ª en adelante nunca dispara nada nuevo, ya se
// facturó con la cuota 1 de su ciclo).
function esCuotaDeContinuacion(concepto) {
  const m = /^Cuota\s*(\d+)/i.exec(String(concepto || "").trim());
  return m ? Number(m[1]) > 1 : false;
}

// ── Facturación (dinero contratado) ──────────────
// Cada alta y cada renovación es una "venta": se reconoce el TOTAL
// contratado de ese ciclo (historialCiclos.importe — nunca el importe de una
// cuota suelta), haya entrado ya el cash o no. La fecha de la venta es la del
// cobro que dispara ese ciclo (ver esCuotaDeContinuacion), no la de
// fechaInicio: en la práctica el cliente suele pagar unos días ANTES de que
// el programa arranque oficialmente, así que fechaInicio no sirve para saber
// cuándo se contrató de verdad. Los disparadores de un cliente se emparejan
// EN ORDEN cronológico con sus ciclos (también en orden): si un ciclo no
// tiene ningún disparador disponible antes de que empiece el siguiente (p.
// ej. una renovación "ya cobrada por adelantado", sin cobro propio), se usa
// su fechaInicio como reserva. Las cuotas 2ª en adelante no vuelven a sumar
// en facturación (solo entran en caja): por eso facturación y caja pueden no
// coincidir.
export function ventas(doc) {
  const out = [];
  for (const c of doc.clientes || []) {
    // Si por lo que sea un cliente no tiene historialCiclos (p. ej. datos
    // traspasados a mano desde el CRM antiguo), se reconstruye su alta a
    // partir de sus propios datos de ciclo actuales, para que nunca falte
    // de la facturación.
    const ciclos = (
      Array.isArray(c.historialCiclos) && c.historialCiclos.length > 0
        ? c.historialCiclos
        : c.importe
        ? [{ fecha: c.fechaInicio, modalidad: c.modalidad, importe: c.importe, semanasTotal: c.semanasTotal, motivo: "alta" }]
        : []
    )
      .slice()
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

    const disparadores = (doc.cobros || [])
      .filter((co) => co.clienteId === c.id && !esCuotaDeContinuacion(co.concepto))
      .sort((a, b) => String(a.fechaPago).localeCompare(String(b.fechaPago)));

    let j = 0;
    ciclos.forEach((h, i) => {
      const limite = ciclos[i + 1]?.fecha; // sin límite = último ciclo del cliente
      let fecha = h.fecha;
      if (j < disparadores.length && (!limite || String(disparadores[j].fechaPago) < String(limite))) {
        fecha = disparadores[j].fechaPago;
        j++;
      }
      out.push({
        clienteId: c.id,
        clienteNombre: c.nombre,
        fecha,
        importe: Number(h.importe) || 0,
        modalidad: h.modalidad,
        motivo: h.motivo === "renovacion" ? "renovacion" : "alta",
      });
    });
  }
  return out.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

export function resumenFacturacion(doc, hoy = hoyDias()) {
  const v = ventas(doc);
  const mesActual = diasAIso(hoy).slice(0, 7);
  const deAltas = v.filter((x) => x.motivo === "alta");
  const deRenovaciones = v.filter((x) => x.motivo === "renovacion");
  return {
    ventas: v,
    totalFacturado: sum(v),
    totalAltas: sum(deAltas),
    totalRenovaciones: sum(deRenovaciones),
    facturadoEsteMes: sum(v.filter((x) => claveMes(x.fecha) === mesActual)),
  };
}

// ── Resumen de facturación + caja acotado a un periodo { desde, hasta } ──
// (días desde epoch, ambos inclusive; null/null = sin filtro, "todo").
// Facturación: por fecha del ciclo (alta/renovación). Caja: por fecha de pago
// de los cobros ya "Cobrado" — son dos recortes de tiempo distintos a propósito
// (devengo vs. caja), igual que en resumenFacturacion().
export function resumenPeriodo(doc, { desde = null, hasta = null } = {}) {
  const v = ventas(doc).filter((x) => dentroDeRango(x.fecha, desde, hasta));
  const deAltas = v.filter((x) => x.motivo === "alta");
  const deRenovaciones = v.filter((x) => x.motivo === "renovacion");
  const cobrado = (doc.cobros || []).filter(
    (c) => c.estado === "Cobrado" && dentroDeRango(c.fechaPago, desde, hasta)
  );
  return {
    totalAltas: sum(deAltas),
    totalRenovaciones: sum(deRenovaciones),
    totalFacturado: sum(v),
    totalCobrado: sum(cobrado),
  };
}

// Serie mensual de facturación separada por alta/renovación (gráfica apilada).
export function serieFacturacion(doc, hoy = hoyDias(), n = 8) {
  const v = ventas(doc);
  return ultimosMeses(hoy, n).map((mes) => {
    const delMes = v.filter((x) => claveMes(x.fecha) === mes);
    return {
      mes,
      altas: Math.round(sum(delMes.filter((x) => x.motivo === "alta"))),
      renovaciones: Math.round(sum(delMes.filter((x) => x.motivo === "renovacion"))),
    };
  });
}

// Serie mensual combinada: lo facturado (altas + renovaciones, contratado) junto
// al cash collected real de ese mismo mes — para comparar de un vistazo cuánto
// se contrata vs. cuánto entra de verdad.
export function serieComparativa(doc, hoy = hoyDias(), n = 8) {
  const fact = serieFacturacion(doc, hoy, n);
  const cobrado = serieIngresos(doc, hoy, n);
  const porMes = Object.fromEntries(cobrado.map((x) => [x.mes, x.total]));
  return fact.map((f) => ({ ...f, cobrado: porMes[f.mes] || 0 }));
}

// ── Tasa de renovación ────────────────────────────
// De cada ciclo que YA se ha resuelto (el cliente decidió seguir o no), ¿en
// cuántos renovó? Un ciclo con otro ciclo detrás en historialCiclos ya
// renovó, es un hecho. El ÚLTIMO ciclo de cada cliente solo se evalúa cuando
// ya está resuelto: si el cliente está Finalizado/Baja, no renovó (pase lo
// que pase con la fecha); si sigue Activo/Renovado, cuenta como renovado solo
// si su ciclo ya debería haber terminado (si no, sigue en curso y no se
// evalúa todavía — ni a favor ni en contra).
export function tasaRenovacion(doc, hoy = hoyDias()) {
  let renovaron = 0;
  const noRenovaronLista = [];
  for (const c of doc.clientes || []) {
    const ciclos = Array.isArray(c.historialCiclos) ? c.historialCiclos : [];
    if (ciclos.length === 0) continue;
    ciclos.forEach((h, i) => {
      if (i < ciclos.length - 1) {
        renovaron++;
        return;
      }
      if (c.estado === "Finalizado" || c.estado === "Baja") {
        noRenovaronLista.push({ clienteId: c.id, clienteNombre: c.nombre, estado: c.estado, finCiclo: h.fecha });
        return;
      }
      const inicio = isoADias(h.fecha);
      const semanas = Number(h.semanasTotal) || 0;
      if (inicio == null || semanas <= 0) return; // datos incompletos: no se evalúa
      if (inicio + semanas * 7 <= hoy) renovaron++; // ya tocaba y sigue activo -> cuenta como renovado
      // si aún no ha terminado, el ciclo sigue en curso: no se evalúa todavía
    });
  }
  const noRenovaron = noRenovaronLista.length;
  const total = renovaron + noRenovaron;
  return {
    renovaron,
    noRenovaron,
    total,
    tasa: total > 0 ? Math.round((renovaron / total) * 1000) / 10 : null,
    noRenovaronLista: noRenovaronLista.sort((a, b) => String(b.finCiclo).localeCompare(String(a.finCiclo))),
  };
}

// ── LTV (valor de vida del cliente) ───────────────
// Lo que ha facturado cada cliente a lo largo de TODA su relación (todos sus
// ciclos: alta + cada renovación), de siempre — no solo el ciclo actual.
export function ltvPorCliente(doc) {
  const mapa = new Map();
  for (const v of ventas(doc)) {
    mapa.set(v.clienteId, (mapa.get(v.clienteId) || 0) + v.importe);
  }
  return mapa;
}

export function ltvCliente(doc, clienteId) {
  return ltvPorCliente(doc).get(clienteId) || 0;
}

export function ltvMedio(doc) {
  const valores = [...ltvPorCliente(doc).values()];
  if (valores.length === 0) return 0;
  return Math.round(valores.reduce((s, x) => s + x, 0) / valores.length);
}
