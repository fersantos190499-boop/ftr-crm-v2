import { describe, it, expect } from "vitest";
import { llamadas, carreras, cobrosPorMes, mapaNombres } from "../lib/consultas.js";
import { marcarLlamadaRenovacion, marcarLlamadaOptimizacion, nuevoCliente } from "../lib/clientes.js";
import { isoADias, diasAIso } from "../lib/fechas.js";

const HOY = isoADias("2026-09-10");

// Cliente "3 meses" que arrancó hace 80 días → semana 12/12, ya pasó la semana
// de renovación (11) y la de optimización global (6).
function clienteMaduro(extra = {}) {
  return {
    ...nuevoCliente({ nombre: "Maduro", modalidad: "3 meses", fechaInicio: diasAIso(HOY - 80), importe: 347 }),
    ...extra,
  };
}

describe("llamadas()", () => {
  it("marca renovación y optimización como pendientes cuando ya tocan y no están hechas", () => {
    const doc = { clientes: [clienteMaduro()], cobros: [] };
    const r = llamadas(doc, HOY);
    expect(r.pendientesRenov).toHaveLength(1);
    expect(r.pendientesRenov[0].semana).toBe(11);
    expect(r.pendientesOptim.map((o) => o.semana)).toContain(6);
  });

  it("no lista lo que ya está hecho", () => {
    let doc = { clientes: [clienteMaduro()], cobros: [] };
    const id = doc.clientes[0].id;
    doc = marcarLlamadaRenovacion(doc, id, true);
    doc = marcarLlamadaOptimizacion(doc, id, 6, true);
    const r = llamadas(doc, HOY);
    expect(r.pendientesRenov).toHaveLength(0);
    expect(r.pendientesOptim).toHaveLength(0);
  });

  it("ignora clientes que no están activos", () => {
    const doc = { clientes: [clienteMaduro({ estado: "Baja" })], cobros: [] };
    const r = llamadas(doc, HOY);
    expect(r.pendientesRenov).toHaveLength(0);
    expect(r.pendientesOptim).toHaveLength(0);
  });

  it("un cliente Renovado SÍ cuenta (regla esActivo)", () => {
    const doc = { clientes: [clienteMaduro({ estado: "Renovado" })], cobros: [] };
    expect(llamadas(doc, HOY).pendientesRenov.length + llamadas(doc, HOY).pendientesOptim.length).toBeGreaterThan(0);
  });

  it("lista como 'próxima' una renovación que aún no toca pero está a ≤3 semanas", () => {
    // 3 meses, semana de renovación 11. Arranca hace 8*7=56 días → semana 9 → faltan 2.
    const c = {
      ...nuevoCliente({ nombre: "Casi", modalidad: "3 meses", fechaInicio: diasAIso(HOY - 56), importe: 347 }),
    };
    const r = llamadas({ clientes: [c], cobros: [] }, HOY);
    expect(r.pendientesRenov).toHaveLength(0);
    expect(r.proximas.some((p) => p.tipo === "renovacion" && p.faltan === 2)).toBe(true);
  });
});

describe("carreras()", () => {
  const doc = {
    clientes: [
      {
        id: "c1",
        nombre: "Ana",
        carreras: [
          { id: "r1", nombre: "10k pasada", fecha: diasAIso(HOY - 5) },
          { id: "r2", nombre: "21k futura", fecha: diasAIso(HOY + 10) },
        ],
      },
      { id: "c2", nombre: "Bea", carreras: [{ id: "r3", nombre: "42k", fecha: diasAIso(HOY + 3) }] },
    ],
    cobros: [],
  };
  it("separa próximas y pasadas y ordena por fecha", () => {
    const { proximas, pasadas } = carreras(doc, HOY);
    expect(proximas.map((f) => f.nombre)).toEqual(["42k", "21k futura"]);
    expect(proximas[0].clienteNombre).toBe("Bea");
    expect(proximas[0].diasRestantes).toBe(3);
    expect(pasadas.map((f) => f.nombre)).toEqual(["10k pasada"]);
  });
});

describe("cobrosPorMes()", () => {
  const doc = {
    clientes: [
      { id: "c1", nombre: "Ana" },
      { id: "c2", nombre: "Bea" },
    ],
    cobros: [
      { id: "p1", clienteId: "c1", fechaPago: "2026-08-05", importe: 100, estado: "Cobrado" },
      { id: "p2", clienteId: "c2", fechaPago: "2026-08-20", importe: 50, estado: "Pendiente" },
      { id: "p3", clienteId: "c1", fechaPago: "2026-09-01", importe: 200, estado: "Cobrado" },
    ],
  };
  it("agrupa por mes de fecha de pago (desc) con totales y nombre de cliente", () => {
    const meses = cobrosPorMes(doc);
    expect(meses.map((m) => m.mes)).toEqual(["2026-09", "2026-08"]);
    const agosto = meses.find((m) => m.mes === "2026-08");
    expect(agosto.totalCobrado).toBe(100);
    expect(agosto.totalPendiente).toBe(50);
    expect(agosto.cobros[0].clienteNombre).toBeDefined();
  });
});

describe("mapaNombres()", () => {
  it("id → nombre", () => {
    expect(mapaNombres({ clientes: [{ id: "x", nombre: "Zoe" }] })).toEqual({ x: "Zoe" });
  });
});

describe("marcarLlamada* (transformaciones puras)", () => {
  it("marcarLlamadaRenovacion no muta el doc original", () => {
    const doc = { clientes: [{ id: "1", llamadaRenovacion: { hecha: false, fecha: null } }], cobros: [] };
    const nuevo = marcarLlamadaRenovacion(doc, "1", true);
    expect(nuevo.clientes[0].llamadaRenovacion.hecha).toBe(true);
    expect(doc.clientes[0].llamadaRenovacion.hecha).toBe(false);
  });
  it("marcarLlamadaOptimizacion escribe la semana indicada", () => {
    const doc = { clientes: [{ id: "1", llamadasOptimizacion: {} }], cobros: [] };
    const nuevo = marcarLlamadaOptimizacion(doc, "1", 12, true);
    expect(nuevo.clientes[0].llamadasOptimizacion[12].hecha).toBe(true);
  });
});
