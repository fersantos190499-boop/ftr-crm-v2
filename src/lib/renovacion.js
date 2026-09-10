// ─── RENOVACIÓN ───────────────────────────────────
// Una sola acción. Actualiza EL MISMO registro del cliente (mismo id) y pasa
// a estado "Renovado". Nunca crea un cliente ni una ficha nueva. Nunca usa el
// estado "Pendiente". No existe "renovación anticipada".
//
// Regla del cobro:
//   - form.yaCobrado === true  → NO se crea ningún cobro (ya lo apuntó a mano).
//   - form.yaCobrado !== true   → se crea el cobro (único o fraccionado).

import { semanasDeModalidad } from "./logica.js";
import { cobrosParaCiclo } from "./clientes.js";

export function renovarCliente(doc, clienteId, form) {
  const anterior = (doc.clientes || []).find((c) => c.id === clienteId);
  if (!anterior) return doc; // cliente inexistente → sin cambios

  const modalidad = form.modalidad || anterior.modalidad;
  const semanasTotal = semanasDeModalidad(modalidad);
  const importe = Number(form.importe) || 0;
  const semanasTotalAnterior =
    Number(anterior.semanasTotal) || semanasDeModalidad(anterior.modalidad);
  const t = new Date().toISOString();

  const clienteRenovado = {
    ...anterior, // mismo id, nombre, objetivos, notas, carreras, llamadasOptimizacion…
    modalidad,
    semanasTotal,
    importe,
    fechaInicio: form.fechaInicio || anterior.fechaInicio,
    metodoPago: form.metodoPago || anterior.metodoPago,
    fraccionado: !!form.fraccionado,
    estadoPago: form.yaCobrado || (form.primeraCobrada && !form.fraccionado) ? "Pagado" : "Pendiente",
    estado: "Renovado",
    semanasPrevias: (Number(anterior.semanasPrevias) || 0) + semanasTotalAnterior,
    numRenovaciones: (Number(anterior.numRenovaciones) || 0) + 1,
    llamadaRenovacion: { hecha: false, fecha: null }, // se reinicia para el ciclo nuevo
    historialCiclos: [
      ...(Array.isArray(anterior.historialCiclos) ? anterior.historialCiclos : []),
      {
        fecha: form.fechaInicio || anterior.fechaInicio,
        modalidad,
        importe,
        semanasTotal,
        motivo: "renovacion",
      },
    ],
    actualizadoEn: t,
  };

  const clientes = doc.clientes.map((c) => (c.id === clienteId ? clienteRenovado : c));

  let cobros = doc.cobros;
  if (!form.yaCobrado) {
    const nuevos = cobrosParaCiclo({
      clienteId,
      fechaPago: form.fechaPago,
      importeTotal: importe,
      fraccionado: !!form.fraccionado,
      numCuotas: form.numCuotas,
      metodo: form.metodoPago || anterior.metodoPago,
      conceptoBase: "Renovación",
      estadoPrimera: form.primeraCobrada ? "Cobrado" : "Pendiente",
    });
    cobros = [...doc.cobros, ...nuevos];
  }

  return { ...doc, clientes, cobros };
}
