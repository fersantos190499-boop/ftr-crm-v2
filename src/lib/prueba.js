// ─── MES DE PRUEBA ────────────────────────────────
// Un cliente entra 1 mes pagando una mensualidad (p. ej. 149 €, precio del
// trimestre / 3). Al acabar decide: irse, seguir hasta completar el trimestre
// (paga el resto) o seguir hasta completar el semestre (paga el resto).
//
// Se modela como un ciclo normal (el alta, con el importe de la prueba) más
// la marca `cliente.prueba`. Al ampliar, el resto se registra como una venta
// propia (entrada de historialCiclos con `ampliacion: true`, motivo "alta"),
// de modo que el total contratado del cliente acaba siendo el del programa
// completo y entra en facturación el mes en que paga.

import { semanasDeModalidad } from "./logica.js";
import { cobrosParaCiclo } from "./clientes.js";
import { isoADias, diasAIso } from "./fechas.js";

export const DIAS_PRUEBA = 28;

// Precio del programa completo, para proponer el importe que falta por pagar.
export const PRECIOS_PROGRAMA = { "3 meses": 447, "6 meses": 697 };
export const OPCIONES_AMPLIACION = ["3 meses", "6 meses"];

const hoyIso = () => new Date().toISOString().slice(0, 10);

export function fechaDecisionPrueba(fechaInicio) {
  const d = isoADias(fechaInicio);
  return d == null ? null : diasAIso(d + DIAS_PRUEBA);
}

// Importe que falta por pagar si amplía a `modalidad`.
export function restanteSugerido(cliente, modalidad) {
  const total = PRECIOS_PROGRAMA[modalidad];
  const pagado = Number(cliente?.prueba?.importePrueba ?? cliente?.importe) || 0;
  return total == null ? 0 : Math.max(0, total - pagado);
}

// Crea la marca de prueba en un cliente (no toca el doc).
export function conPrueba(cliente) {
  return {
    ...cliente,
    prueba: {
      estado: "en_curso",
      fechaDecision: fechaDecisionPrueba(cliente.fechaInicio),
      importePrueba: Number(cliente.importe) || 0,
    },
  };
}

// Marca (o desmarca, si aún está en curso) a un cliente ya existente.
export function marcarPrueba(doc, clienteId, activa = true) {
  return {
    ...doc,
    clientes: doc.clientes.map((c) => {
      if (c.id !== clienteId) return c;
      if (activa) return c.prueba ? c : conPrueba(c);
      if (c.prueba?.estado !== "en_curso") return c;
      const { prueba, ...resto } = c; // eslint-disable-line no-unused-vars
      return resto;
    }),
  };
}

// form: { opcion: "se_va" | "3 meses" | "6 meses", fechaPago, restante,
//         metodo, fraccionado, numCuotas, primeraCobrada }
export function resolverPrueba(doc, clienteId, form) {
  const c = (doc.clientes || []).find((x) => x.id === clienteId);
  if (!c || c.prueba?.estado !== "en_curso") return doc;
  const t = new Date().toISOString();
  const resueltaEl = hoyIso();

  if (form.opcion === "se_va") {
    return {
      ...doc,
      clientes: doc.clientes.map((x) =>
        x.id === clienteId
          ? { ...x, estado: "Baja", prueba: { ...x.prueba, estado: "no_convertida", resueltaEl }, actualizadoEn: t }
          : x
      ),
    };
  }

  const modalidad = form.opcion;
  if (!OPCIONES_AMPLIACION.includes(modalidad)) return doc;
  const semanasTotal = semanasDeModalidad(modalidad);
  const restante = Number(form.restante) || 0;
  const importePrueba = Number(c.prueba.importePrueba) || 0;

  const cliente = {
    ...c,
    modalidad,
    semanasTotal,
    importe: importePrueba + restante,
    fraccionado: !!form.fraccionado,
    estadoPago: form.primeraCobrada && !form.fraccionado ? "Pagado" : "Pendiente",
    historialCiclos: [
      ...(Array.isArray(c.historialCiclos) ? c.historialCiclos : []),
      { fecha: form.fechaPago, modalidad, importe: restante, semanasTotal, motivo: "alta", ampliacion: true },
    ],
    prueba: { ...c.prueba, estado: "convertida", opcion: modalidad, resueltaEl },
    actualizadoEn: t,
  };

  const cobros = [
    ...doc.cobros,
    ...cobrosParaCiclo({
      clienteId,
      fechaPago: form.fechaPago,
      importeTotal: restante,
      fraccionado: !!form.fraccionado,
      numCuotas: form.numCuotas,
      metodo: form.metodo || c.metodoPago,
      conceptoBase: "Ampliación",
      estadoPrimera: form.primeraCobrada ? "Cobrado" : "Pendiente",
    }),
  ];

  return { ...doc, clientes: doc.clientes.map((x) => (x.id === clienteId ? cliente : x)), cobros };
}

// KPI: de las pruebas ya resueltas, cuántas siguen.
export function resumenPruebas(doc) {
  const lista = (doc.clientes || []).map((c) => c.prueba).filter(Boolean);
  const convertidas = lista.filter((p) => p.estado === "convertida").length;
  const noConvertidas = lista.filter((p) => p.estado === "no_convertida").length;
  const enCurso = lista.filter((p) => p.estado === "en_curso").length;
  const resueltas = convertidas + noConvertidas;
  return {
    enCurso,
    convertidas,
    noConvertidas,
    resueltas,
    tasa: resueltas > 0 ? Math.round((convertidas / resueltas) * 1000) / 10 : null,
    hay: lista.length > 0,
  };
}
