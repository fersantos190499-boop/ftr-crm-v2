import { describe, it, expect } from "vitest";
import { conPrueba, marcarPrueba, resolverPrueba, resumenPruebas, restanteSugerido, fechaDecisionPrueba } from "../lib/prueba.js";
import { nuevoCliente, cobrosParaCiclo } from "../lib/clientes.js";
import { ventas, resumenPeriodo, tasaRenovacion, panelInicio } from "../lib/consultas.js";
import { agendaSemanal } from "../lib/semana.js";
import { isoADias, rangoMes } from "../lib/fechas.js";

// Cliente que entra 1 mes de prueba pagando 149 € el 2026-10-27.
function docConPrueba() {
  const c = conPrueba(
    nuevoCliente({ nombre: "Prueba", modalidad: "3 meses", fechaInicio: "2026-10-27", importe: 149, metodoPago: "Stripe" })
  );
  const cobros = cobrosParaCiclo({ clienteId: c.id, fechaPago: "2026-10-27", importeTotal: 149, conceptoBase: "Programa completo" });
  return { clientes: [c], cobros, tareas: {} };
}

describe("mes de prueba", () => {
  it("la fecha de decisión es a las 4 semanas del inicio", () => {
    expect(fechaDecisionPrueba("2026-10-27")).toBe("2026-11-24");
    expect(docConPrueba().clientes[0].prueba).toMatchObject({ estado: "en_curso", fechaDecision: "2026-11-24", importePrueba: 149 });
  });

  it("marcarPrueba marca a un cliente ya existente y permite quitar la marca mientras está en curso", () => {
    const c = nuevoCliente({ nombre: "Ya existente", modalidad: "3 meses", fechaInicio: "2026-10-27", importe: 149 });
    let doc = { clientes: [c], cobros: [] };
    doc = marcarPrueba(doc, c.id, true);
    expect(doc.clientes[0].prueba.estado).toBe("en_curso");
    doc = marcarPrueba(doc, c.id, false);
    expect(doc.clientes[0].prueba).toBeUndefined();
  });

  it("restanteSugerido: 447 − 149 = 298 y 697 − 149 = 548", () => {
    const c = docConPrueba().clientes[0];
    expect(restanteSugerido(c, "3 meses")).toBe(298);
    expect(restanteSugerido(c, "6 meses")).toBe(548);
  });

  it("se va: pasa a Baja y no cuenta como renovación fallida", () => {
    const d0 = docConPrueba();
    const d1 = resolverPrueba(d0, d0.clientes[0].id, { opcion: "se_va" });
    expect(d1.clientes[0].estado).toBe("Baja");
    expect(d1.clientes[0].prueba.estado).toBe("no_convertida");
    expect(tasaRenovacion(d1, isoADias("2026-12-01"))).toMatchObject({ noRenovaron: 0, total: 0 });
    // lo facturado (149) se mantiene
    expect(resumenPeriodo(d1, {}).totalFacturado).toBe(149);
  });

  it("sigue 3 meses pagando 298: total 447, facturación 149 + 298 y retención intacta", () => {
    const d0 = docConPrueba();
    const d1 = resolverPrueba(d0, d0.clientes[0].id, {
      opcion: "3 meses", restante: 298, fechaPago: "2026-11-24", metodo: "Stripe", fraccionado: false, primeraCobrada: true,
    });
    const c = d1.clientes[0];
    expect(c).toMatchObject({ modalidad: "3 meses", semanasTotal: 12, importe: 447 });
    expect(c.prueba).toMatchObject({ estado: "convertida", opcion: "3 meses" });
    expect(d1.cobros).toHaveLength(2);
    expect(d1.cobros[1]).toMatchObject({ importe: 298, concepto: "Ampliación", fechaPago: "2026-11-24" });
    const v = ventas(d1);
    expect(v.map((x) => [x.fecha, x.importe, x.motivo])).toEqual([
      ["2026-11-24", 298, "alta"],
      ["2026-10-27", 149, "alta"],
    ]);
    // la venta de la ampliación entra en noviembre, la de la prueba en octubre
    expect(resumenPeriodo(d1, rangoMes(isoADias("2026-11-30"))).totalAltas).toBe(298);
    expect(resumenPeriodo(d1, rangoMes(isoADias("2026-10-30"))).totalAltas).toBe(149);
    // ampliar no es una renovación: sin eventos de retención (su ciclo sigue en curso)
    expect(tasaRenovacion(d1, isoADias("2026-12-01"))).toMatchObject({ renovaron: 0, noRenovaron: 0 });
  });

  it("sigue 6 meses pagando 548 en 2 cuotas: total 697, la cuota 2 no vuelve a facturar", () => {
    const d0 = docConPrueba();
    const d1 = resolverPrueba(d0, d0.clientes[0].id, {
      opcion: "6 meses", restante: 548, fechaPago: "2026-11-24", metodo: "Bizum", fraccionado: true, numCuotas: 2, primeraCobrada: true,
    });
    expect(d1.clientes[0]).toMatchObject({ modalidad: "6 meses", semanasTotal: 24, importe: 697 });
    expect(d1.cobros.map((c) => [c.concepto, c.importe])).toEqual([
      ["Programa completo", 149],
      ["Cuota 1/2", 274],
      ["Cuota 2/2", 274],
    ]);
    expect(resumenPeriodo(d1, {}).totalFacturado).toBe(697);
    expect(resumenPeriodo(d1, rangoMes(isoADias("2026-12-15"))).totalFacturado).toBe(0);
  });

  it("al terminar el semestre ampliado se evalúa como UN solo ciclo de 24 semanas", () => {
    const d0 = docConPrueba();
    const d1 = resolverPrueba(d0, d0.clientes[0].id, {
      opcion: "6 meses", restante: 548, fechaPago: "2026-11-24", fraccionado: false, primeraCobrada: true,
    });
    d1.clientes[0].estado = "Finalizado";
    // 2026-10-27 + 24 semanas = 2027-04-13
    const r = tasaRenovacion(d1, isoADias("2027-05-01"));
    expect(r).toMatchObject({ renovaron: 0, noRenovaron: 1 });
    expect(r.noRenovaronLista[0].finCiclo).toBe("2027-04-13");
  });

  it("resumenPruebas calcula la conversión de las ya decididas", () => {
    const base = { clientes: [], cobros: [] };
    const mk = (estado) => ({ id: estado + Math.random(), prueba: { estado } });
    base.clientes = [mk("convertida"), mk("convertida"), mk("no_convertida"), mk("en_curso")];
    expect(resumenPruebas(base)).toMatchObject({ convertidas: 2, noConvertidas: 1, enCurso: 1, resueltas: 3, tasa: 66.7, hay: true });
    expect(resumenPruebas({ clientes: [{ id: "x" }] }).hay).toBe(false);
  });

  it("Semana avisa de la decisión la semana en que toca y mientras no se resuelva", () => {
    const doc = docConPrueba();
    const a = agendaSemanal(doc, isoADias("2026-11-23")); // semana del 24
    expect(a.pruebas.map((x) => x.cliente.nombre)).toEqual(["Prueba"]);
    expect(agendaSemanal(doc, isoADias("2026-11-02")).pruebas).toHaveLength(0);
    expect(agendaSemanal(doc, isoADias("2026-12-10")).pruebas).toHaveLength(1); // retrasada
  });
});

describe("cobros vencidos (panel de Inicio)", () => {
  it("separa vencidos de próximos y ordena por retraso", () => {
    const hoy = isoADias("2026-11-14");
    const doc = {
      clientes: [{ id: "a", nombre: "A" }],
      cobros: [
        { id: "1", clienteId: "a", fechaPago: "2026-11-10", importe: 100, estado: "Pendiente", concepto: "Cuota 2/3" },
        { id: "2", clienteId: "a", fechaPago: "2026-10-01", importe: 50, estado: "Pendiente", concepto: "Cuota 2/3" },
        { id: "3", clienteId: "a", fechaPago: "2026-11-20", importe: 70, estado: "Pendiente", concepto: "Cuota 3/3" },
        { id: "4", clienteId: "a", fechaPago: "2026-11-01", importe: 30, estado: "Cobrado", concepto: "Cuota 1/3" },
      ],
    };
    const p = panelInicio(doc, hoy);
    expect(p.cobrosVencidos.map((c) => [c.id, c.diasRetraso])).toEqual([["2", 44], ["1", 4]]);
    expect(p.totalVencido).toBe(150);
    expect(p.proximosCobros.map((c) => c.id)).toEqual(["3"]);
    expect(p.totalProximos).toBe(70);
  });

  it("un cobro que vence hoy no está vencido todavía", () => {
    const hoy = isoADias("2026-11-14");
    const doc = { clientes: [{ id: "a", nombre: "A" }], cobros: [{ id: "1", clienteId: "a", fechaPago: "2026-11-14", importe: 10, estado: "Pendiente" }] };
    const p = panelInicio(doc, hoy);
    expect(p.cobrosVencidos).toHaveLength(0);
    expect(p.proximosCobros).toHaveLength(1);
  });
});
