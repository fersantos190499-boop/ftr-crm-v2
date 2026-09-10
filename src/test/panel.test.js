import { describe, it, expect } from "vitest";
import { panelInicio } from "../lib/consultas.js";
import { nuevoCliente } from "../lib/clientes.js";
import { isoADias, diasAIso } from "../lib/fechas.js";

const HOY = isoADias("2026-09-10"); // septiembre 2026

function doc() {
  return {
    meta: { version: 1 },
    clientes: [
      // 3 meses (84 días). Inicio 2026-06-25 -> fin 2026-09-17 -> renovación este mes
      { ...nuevoCliente({ nombre: "TerminaEsteMes", modalidad: "3 meses", fechaInicio: "2026-06-25", importe: 347 }) },
      // 3 meses. Inicio 2026-08-01 -> fin 2026-10-24 -> NO este mes
      { ...nuevoCliente({ nombre: "TerminaEnOctubre", modalidad: "3 meses", fechaInicio: "2026-08-01", importe: 347 }) },
      // Renovado (cuenta como activo)
      { ...nuevoCliente({ nombre: "Renovada", modalidad: "6 meses", fechaInicio: "2026-08-20", importe: 597 }), estado: "Renovado" },
      // Baja (no cuenta)
      { ...nuevoCliente({ nombre: "Baja", modalidad: "3 meses", fechaInicio: "2026-01-01", importe: 300 }), estado: "Baja" },
    ],
    cobros: [
      { id: "a", clienteId: "x", fechaPago: "2026-09-03", concepto: "c", importe: 347, estado: "Cobrado" },
      { id: "b", clienteId: "x", fechaPago: "2026-09-08", concepto: "c", importe: 100, estado: "Pendiente" },
      { id: "c", clienteId: "x", fechaPago: "2026-08-15", concepto: "c", importe: 597, estado: "Cobrado" },
    ],
  };
}

describe("panelInicio()", () => {
  it("clientes activos: Activo + Renovado, no Baja", () => {
    const p = panelInicio(doc(), HOY);
    expect(p.activos).toBe(3);
    expect(p.nActivo).toBe(2);
    expect(p.nRenovado).toBe(1);
  });

  it("ingresos del mes: solo cobros Cobrado con fecha de pago en septiembre", () => {
    const p = panelInicio(doc(), HOY);
    expect(p.ingresosMes).toBe(347); // el de agosto no cuenta
    expect(p.ingresosMesPendiente).toBe(100);
  });

  it("renovaciones del mes: clientes activos cuyo ciclo termina este mes", () => {
    const p = panelInicio(doc(), HOY);
    expect(p.renovacionesMes.map((r) => r.cliente.nombre)).toEqual(["TerminaEsteMes"]);
  });

  it("pagos pendientes: lista + total", () => {
    const p = panelInicio(doc(), HOY);
    expect(p.pagosPendientes).toHaveLength(1);
    expect(p.totalPendiente).toBe(100);
  });

  it("carreras próximas: solo <= 30 días", () => {
    const d = doc();
    d.clientes[0].carreras = [
      { id: "r1", nombre: "en 10 días", fecha: diasAIso(HOY + 10) },
      { id: "r2", nombre: "en 40 días", fecha: diasAIso(HOY + 40) },
    ];
    const p = panelInicio(d, HOY);
    expect(p.carrerasProximas.map((c) => c.nombre)).toEqual(["en 10 días"]);
  });

  it("incluye el desglose de llamadas pendientes", () => {
    const p = panelInicio(doc(), HOY);
    expect(Array.isArray(p.pendientesRenov)).toBe(true);
    expect(Array.isArray(p.pendientesOptim)).toBe(true);
  });
});
