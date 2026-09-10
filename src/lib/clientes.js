// ─── CONSTRUCTORES Y MUTACIONES DE CLIENTE / COBRO ─
// Funciones puras: reciben datos, devuelven objetos nuevos. La persistencia
// la hace el store. Todo se referencia por `id`; los cobros por `clienteId`.

import { semanasDeModalidad } from "./logica.js";

export const METODOS_PAGO = ["Stripe", "PayPal", "Bizum", "Efectivo"];
export const ESTADOS_PAGO = ["Pagado", "Pendiente"];
export const ESTADOS_COBRO = ["Cobrado", "Pendiente"];

// Color por método de pago: [fondo, texto].
export const COLOR_METODO = {
  Stripe: ["#efe9fe", "#6d28d9"],
  PayPal: ["#e0edfe", "#1e40af"],
  Bizum: ["#e4f7ea", "#15803d"],
  Efectivo: ["#fdf3d6", "#854d0e"],
};

function idNuevo() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

const ahora = () => new Date().toISOString();

// ── Cliente nuevo (alta) ─────────────────────────
// datos: { nombre, modalidad, fechaInicio, importe, fraccionado, metodoPago,
//          estadoPago, objetivoCorto, objetivoLargo }
export function nuevoCliente(datos) {
  const modalidad = datos.modalidad || "3 meses";
  const semanasTotal = semanasDeModalidad(modalidad);
  const importe = Number(datos.importe) || 0;
  const t = ahora();
  return {
    id: idNuevo(),
    nombre: (datos.nombre || "").trim(),
    estado: "Activo",
    modalidad,
    semanasTotal,
    fechaInicio: datos.fechaInicio || null,
    importe,
    fraccionado: !!datos.fraccionado,
    metodoPago: datos.metodoPago || "Stripe",
    estadoPago: datos.estadoPago || "Pagado",
    objetivoCorto: datos.objetivoCorto || "",
    objetivoLargo: datos.objetivoLargo || "",
    semanasPrevias: 0,
    numRenovaciones: 0,
    notas: datos.notas || "",
    llamadaRenovacion: { hecha: false, fecha: null },
    llamadasOptimizacion: {},
    carreras: [],
    historialCiclos: [
      { fecha: datos.fechaInicio || null, modalidad, importe, semanasTotal, motivo: "alta" },
    ],
    creadoEn: t,
    actualizadoEn: t,
  };
}

// ── Cobro nuevo ──────────────────────────────────
// datos: { clienteId, fechaPago, concepto, importe, metodo, estado, nota }
export function nuevoCobro(datos) {
  return {
    id: idNuevo(),
    clienteId: datos.clienteId,
    fechaPago: datos.fechaPago || null,
    concepto: datos.concepto || "",
    importe: Number(datos.importe) || 0,
    metodo: datos.metodo || "Stripe",
    estado: datos.estado || "Cobrado",
    nota: datos.nota || "",
    creadoEn: ahora(),
  };
}

// ── Cobros generados en un alta / renovación ─────
// La 1ª cuota usa `fechaPago` (fecha REAL de cobro, ≠ fecha de inicio del
// programa). Las siguientes se estiman a +30 días cada una.
// opciones: { clienteId, fechaPago, importeTotal, fraccionado, numCuotas,
//             metodo, conceptoBase, estadoPrimera }
export function cobrosParaCiclo(opciones) {
  const {
    clienteId,
    fechaPago,
    importeTotal,
    fraccionado,
    numCuotas,
    metodo = "Stripe",
    conceptoBase = "Programa completo",
    estadoPrimera = "Cobrado",
  } = opciones;

  const total = Number(importeTotal) || 0;
  const n = fraccionado ? Math.max(2, Number(numCuotas) || 3) : 1;
  const cuota = n > 0 ? Math.round(total / n) : total;
  const base = fechaPago ? diasDesdeIso(fechaPago) : null;

  return Array.from({ length: n }, (_, i) => {
    const importe = i === n - 1 ? total - cuota * (n - 1) : cuota;
    return nuevoCobro({
      clienteId,
      fechaPago: base == null ? null : isoDesdeDias(base + i * 30),
      concepto: n === 1 ? conceptoBase : `Cuota ${i + 1}/${n}`,
      importe,
      metodo,
      estado: i === 0 ? estadoPrimera : "Pendiente",
    });
  });
}

// ── Carrera ──────────────────────────────────────
export function nuevaCarrera(datos) {
  return {
    id: idNuevo(),
    nombre: (datos.nombre || "").trim(),
    fecha: datos.fecha || null,
  };
}

// helpers de fecha locales (sin importar todo fechas.js para evitar ciclos)
function diasDesdeIso(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000);
}
function isoDesdeDias(dias) {
  const d = new Date(dias * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

// ── Marcar llamadas (transformaciones puras del documento) ──
export function marcarLlamadaRenovacion(doc, clienteId, hecha) {
  const fecha = hecha ? ahora().slice(0, 10) : null;
  return {
    ...doc,
    clientes: doc.clientes.map((c) =>
      c.id === clienteId ? { ...c, llamadaRenovacion: { hecha, fecha } } : c
    ),
  };
}

export function marcarLlamadaOptimizacion(doc, clienteId, semana, hecha) {
  const fecha = hecha ? ahora().slice(0, 10) : null;
  return {
    ...doc,
    clientes: doc.clientes.map((c) => {
      if (c.id !== clienteId) return c;
      return {
        ...c,
        llamadasOptimizacion: { ...(c.llamadasOptimizacion || {}), [semana]: { hecha, fecha } },
      };
    }),
  };
}

// ── Tareas de la agenda semanal (checklist) ──────
export function marcarTarea(doc, clave, hecha = true) {
  const tareas = { ...(doc.tareas || {}) };
  if (hecha) tareas[clave] = { hecha: true, fecha: ahora().slice(0, 10) };
  else delete tareas[clave];
  return { ...doc, tareas };
}

// ── Registro de contacto (nota de llamada con fecha) ──
export function registrarContacto(doc, clienteId, { tipo, texto }) {
  if (!texto || !texto.trim()) return doc;
  return {
    ...doc,
    clientes: doc.clientes.map((c) => {
      if (c.id !== clienteId) return c;
      const contactos = Array.isArray(c.contactos) ? c.contactos : [];
      return {
        ...c,
        contactos: [...contactos, { id: idNuevo(), fecha: ahora().slice(0, 10), tipo: tipo || "nota", texto: texto.trim() }],
      };
    }),
  };
}

// ── Selectores ───────────────────────────────────
export const cobrosDeCliente = (doc, clienteId) =>
  (doc.cobros || []).filter((c) => c.clienteId === clienteId);

export const clientePorId = (doc, id) => (doc.clientes || []).find((c) => c.id === id) || null;

export { idNuevo };
