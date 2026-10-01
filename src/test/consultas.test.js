import { describe, it, expect } from "vitest";
import { llamadas, carreras, cobrosPorMes, mapaNombres, serieIngresos, ventas, resumenFacturacion, serieFacturacion, serieComparativa, resumenPeriodo, tasaRenovacion, serieTasaRenovacion, ltvPorCliente, ltvCliente, ltvMedio } from "../lib/consultas.js";
import { rangoMes } from "../lib/fechas.js";
import { marcarLlamadaRenovacion, marcarLlamadaOptimizacion, nuevoCliente } from "../lib/clientes.js";
import { isoADias, diasAIso, claveMes } from "../lib/fechas.js";

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

  it("'agendar para la semana que viene' = la llamada toca justo la semana siguiente", () => {
    // 3 meses, optimización en la semana global 6. Arranca hace 4*7+3=31 días → semana 5 → la 6 es la que viene.
    const c = nuevoCliente({ nombre: "Isabel", modalidad: "3 meses", fechaInicio: diasAIso(HOY - 31), importe: 347 });
    const r = llamadas({ clientes: [c], cobros: [] }, HOY);
    expect(r.semanaQueViene.some((x) => x.tipo === "optimizacion" && x.semana === 6)).toBe(true);
    expect(r.pendientes.some((x) => x.semana === 6)).toBe(false);
  });

  it("revisión mensual = clientes cuya semana de programa es múltiplo de 4", () => {
    // semana 8 (8*7 - 3 días para asegurar semana 8): floor(53/7)+1 = 8
    const c8 = nuevoCliente({ nombre: "Mult8", modalidad: "6 meses", fechaInicio: diasAIso(HOY - 53), importe: 597 });
    // semana 5 → NO
    const c5 = nuevoCliente({ nombre: "Sem5", modalidad: "6 meses", fechaInicio: diasAIso(HOY - 31), importe: 597 });
    const r = llamadas({ clientes: [c8, c5], cobros: [] }, HOY);
    expect(r.revisionMensual.map((x) => x.cliente.nombre)).toEqual(["Mult8"]);
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

describe("serieIngresos()", () => {
  const doc = {
    clientes: [],
    cobros: [
      { id: "a", fechaPago: "2026-09-05", importe: 300, estado: "Cobrado" },
      { id: "b", fechaPago: "2026-09-20", importe: 200, estado: "Cobrado" },
      { id: "c", fechaPago: "2026-08-10", importe: 100, estado: "Cobrado" },
      { id: "d", fechaPago: "2026-09-25", importe: 999, estado: "Pendiente" }, // no cuenta
    ],
  };
  it("últimos n meses, solo cobros 'Cobrado', sumados por mes", () => {
    const s = serieIngresos(doc, HOY, 3);
    expect(s.map((x) => x.mes)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(s.find((x) => x.mes === "2026-09").total).toBe(500);
    expect(s.find((x) => x.mes === "2026-08").total).toBe(100);
    expect(s.find((x) => x.mes === "2026-07").total).toBe(0);
  });
});

describe("ventas() / resumenFacturacion() / serieFacturacion()", () => {
  const doc = {
    clientes: [
      {
        id: "c1",
        nombre: "Ana",
        historialCiclos: [
          { fecha: "2026-08-05", modalidad: "3 meses", importe: 347, semanasTotal: 12, motivo: "alta" },
          { fecha: "2026-09-10", modalidad: "3 meses", importe: 360, semanasTotal: 12, motivo: "renovacion" },
        ],
      },
      {
        id: "c2",
        nombre: "Bea",
        historialCiclos: [{ fecha: "2026-09-02", modalidad: "6 meses", importe: 597, semanasTotal: 24, motivo: "alta" }],
      },
    ],
    // los cobros reales NO deben usarse para la facturación: a propósito, muy
    // distintos de los importes contratados, para detectar si se mezclan.
    cobros: [
      { id: "x", clienteId: "c1", fechaPago: "2026-09-10", importe: 1, estado: "Pendiente" },
      { id: "y", clienteId: "c2", fechaPago: "2026-09-15", importe: 597, estado: "Cobrado" },
    ],
  };

  it("ventas() lee de historialCiclos, no de cobros", () => {
    const v = ventas(doc);
    expect(v).toHaveLength(3);
    expect(v.every((x) => x.importe !== 1)).toBe(true);
  });

  it("ventas() reconstruye la alta si historialCiclos está vacío pero el cliente tiene datos de ciclo", () => {
    // Caso real: clientes traspasados a mano desde el CRM antiguo sin
    // historialCiclos, pero con fechaInicio/modalidad/importe propios.
    const docSinHistorial = {
      clientes: [
        {
          id: "c3",
          nombre: "Huérfano",
          historialCiclos: [],
          fechaInicio: "2026-03-17",
          modalidad: "3 meses",
          importe: 150,
          semanasTotal: 12,
        },
      ],
      cobros: [],
    };
    const v = ventas(docSinHistorial);
    expect(v).toEqual([
      { clienteId: "c3", clienteNombre: "Huérfano", fecha: "2026-03-17", importe: 150, modalidad: "3 meses", motivo: "alta" },
    ]);
  });

  it("ventas() no inventa nada para un cliente sin ciclo ni importe", () => {
    const v = ventas({ clientes: [{ id: "c4", nombre: "Vacío", historialCiclos: [] }], cobros: [] });
    expect(v).toEqual([]);
  });

  it("resumenFacturacion separa altas de renovaciones y sigue siendo correcto con el total", () => {
    const r = resumenFacturacion(doc, isoADias("2026-09-10"));
    expect(r.totalAltas).toBe(347 + 597);
    expect(r.totalRenovaciones).toBe(360);
    expect(r.totalFacturado).toBe(347 + 597 + 360);
    expect(r.facturadoEsteMes).toBe(597 + 360); // ambas de septiembre
  });

  it("serieFacturacion agrupa por mes con altas y renovaciones por separado", () => {
    const s = serieFacturacion(doc, isoADias("2026-09-10"), 2);
    expect(s.map((x) => x.mes)).toEqual(["2026-08", "2026-09"]);
    expect(s.find((x) => x.mes === "2026-08")).toMatchObject({ altas: 347, renovaciones: 0 });
    expect(s.find((x) => x.mes === "2026-09")).toMatchObject({ altas: 597, renovaciones: 360 });
  });

  it("serieComparativa añade el cobrado real del mes junto a la facturación", () => {
    const s = serieComparativa(doc, isoADias("2026-09-10"), 2);
    expect(s.find((x) => x.mes === "2026-08")).toMatchObject({ altas: 347, renovaciones: 0, cobrado: 0 });
    // en septiembre: altas 597 + renov 360 facturados, pero solo 597 cobrados de verdad
    // (el otro cobro de ese mes está Pendiente y no debe sumar)
    expect(s.find((x) => x.mes === "2026-09")).toMatchObject({ altas: 597, renovaciones: 360, cobrado: 597 });
  });

  it("resumenPeriodo('todo') coincide con los totales sin filtrar", () => {
    const r = resumenPeriodo(doc, { desde: null, hasta: null });
    expect(r).toEqual({ totalAltas: 347 + 597, totalRenovaciones: 360, totalFacturado: 347 + 597 + 360, totalCobrado: 597 });
  });

  it("resumenPeriodo acota facturación y caja a un rango de fechas", () => {
    // Solo agosto: la alta de Ana (347) entra, el resto de septiembre no.
    const r = resumenPeriodo(doc, rangoMes(isoADias("2026-08-15")));
    expect(r).toEqual({ totalAltas: 347, totalRenovaciones: 0, totalFacturado: 347, totalCobrado: 0 });
  });
});

describe("ventas(): la fecha de facturación es la del cobro disparador, no fechaInicio", () => {
  const doc = {
    clientes: [
      {
        id: "jen",
        nombre: "Jennifer",
        fechaInicio: "2026-10-05", // el programa "empieza" en octubre...
        historialCiclos: [{ fecha: "2026-10-05", modalidad: "6 meses", importe: 696, semanasTotal: 24, motivo: "alta" }],
      },
    ],
    cobros: [
      // ...pero contrata y paga la cuota 1 en septiembre, antes de esa fecha
      { id: "j1", clienteId: "jen", fechaPago: "2026-09-30", concepto: "Cuota 1/6", importe: 116, estado: "Cobrado" },
      { id: "j2", clienteId: "jen", fechaPago: "2026-10-30", concepto: "Cuota 2/6", importe: 116, estado: "Pendiente" },
    ],
  };

  it("usa la fecha de la cuota 1 (el disparador) y el importe TOTAL del ciclo, no el de la cuota ni el de fechaInicio", () => {
    const v = ventas(doc);
    expect(v).toEqual([
      { clienteId: "jen", clienteNombre: "Jennifer", fecha: "2026-09-30", importe: 696, modalidad: "6 meses", motivo: "alta" },
    ]);
  });

  it("las cuotas siguientes del mismo ciclo (Cuota 2/N...) no generan una venta nueva", () => {
    // en octubre solo cae la cuota 2, pero la venta ya se reconoció entera en septiembre
    const r = resumenPeriodo(doc, rangoMes(isoADias("2026-10-15")));
    expect(r.totalFacturado).toBe(0);
  });

  it("si el ciclo aún no tiene ningún cobro, se usa fechaInicio como reserva", () => {
    const sinCobros = { ...doc, cobros: [] };
    expect(ventas(sinCobros)[0].fecha).toBe("2026-10-05");
  });

  it("caso real: la cuota 2 también cae antes de fechaInicio y NO debe convertirse en el disparador", () => {
    // Patrón real detectado en producción: Fer cobra la cuota 1 varios días
    // antes de fechaInicio, así que la cuota 2 (~30 días después) a veces
    // también cae antes de la fecha "oficial" de inicio. Un filtro que exija
    // fechaPago >= fechaInicio excluiría la cuota 1 y usaría la cuota 2 como
    // si fuera la venta — justo el bug real que esto corrige.
    const docReal = {
      clientes: [
        {
          id: "txus",
          nombre: "Txus",
          fechaInicio: "2026-09-14",
          historialCiclos: [{ fecha: "2026-09-14", modalidad: "6 meses", importe: 697, semanasTotal: 24, motivo: "alta" }],
        },
      ],
      cobros: [
        { id: "t1", clienteId: "txus", fechaPago: "2026-08-27", concepto: "Cuota 1/3", importe: 232, estado: "Cobrado" },
        { id: "t2", clienteId: "txus", fechaPago: "2026-09-26", concepto: "Cuota 2/3", importe: 232, estado: "Cobrado" },
      ],
    };
    const v = ventas(docReal);
    expect(v).toEqual([
      { clienteId: "txus", clienteNombre: "Txus", fecha: "2026-08-27", importe: 697, modalidad: "6 meses", motivo: "alta" },
    ]);
    // en septiembre (cuando cae la cuota 2) no debe facturar nada: ya se
    // reconoció entero en agosto.
    expect(resumenPeriodo(docReal, rangoMes(isoADias("2026-09-10"))).totalFacturado).toBe(0);
  });
});

describe("ventas(): separa los cobros de un ciclo antiguo de los del ciclo renovado", () => {
  const doc = {
    clientes: [
      {
        id: "ang",
        nombre: "Angelica",
        historialCiclos: [
          { fecha: "2026-06-01", modalidad: "3 meses", importe: 347, semanasTotal: 12, motivo: "alta" },
          { fecha: "2026-09-24", modalidad: "3 meses", importe: 347, semanasTotal: 12, motivo: "renovacion" },
        ],
      },
    ],
    cobros: [
      { id: "a1", clienteId: "ang", fechaPago: "2026-06-01", concepto: "Programa completo", importe: 347, estado: "Cobrado" },
      { id: "a2", clienteId: "ang", fechaPago: "2026-09-24", concepto: "Renovación", importe: 347, estado: "Cobrado" },
    ],
  };

  it("cada ciclo reconoce su propia venta en la fecha de su propio disparador", () => {
    const v = ventas(doc);
    expect(v).toEqual([
      { clienteId: "ang", clienteNombre: "Angelica", fecha: "2026-09-24", importe: 347, modalidad: "3 meses", motivo: "renovacion" },
      { clienteId: "ang", clienteNombre: "Angelica", fecha: "2026-06-01", importe: 347, modalidad: "3 meses", motivo: "alta" },
    ]);
  });

  it("caso real con 3 ciclos: ningún disparador se cuenta dos veces ni se cuela en el ciclo equivocado", () => {
    // Patrón real detectado en producción: CADA pago (alta y las 2 renovaciones)
    // cae unos días ANTES de la fecha de su propio ciclo. Con un filtro por
    // ventana de fechas esto hacía que el pago de la 2ª renovación se colara
    // en la ventana de la 1ª renovación (porque también cae antes de su
    // "fecha"), y la 1ª renovación acababa facturándose DOS veces: una con su
    // propio pago (mal emparejado) y otra por reserva (fechaInicio). El
    // emparejamiento en orden cronológico evita esto.
    const docReal = {
      clientes: [
        {
          id: "jlr",
          nombre: "José Luís",
          historialCiclos: [
            { fecha: "2026-03-30", modalidad: "3 meses", importe: 390, semanasTotal: 12, motivo: "alta" },
            { fecha: "2026-06-22", modalidad: "3 meses", importe: 360, semanasTotal: 12, motivo: "renovacion" },
            { fecha: "2026-09-14", modalidad: "3 meses", importe: 360, semanasTotal: 12, motivo: "renovacion" },
          ],
        },
      ],
      cobros: [
        { id: "c1", clienteId: "jlr", fechaPago: "2026-03-23", concepto: "Cuota 1/3", importe: 130, estado: "Cobrado" },
        { id: "c2", clienteId: "jlr", fechaPago: "2026-06-16", concepto: "Cuota 1/3", importe: 120, estado: "Cobrado" },
        { id: "c3", clienteId: "jlr", fechaPago: "2026-09-16", concepto: "Cuota 1/3", importe: 120, estado: "Cobrado" },
      ],
    };
    const v = ventas(docReal);
    expect(v).toHaveLength(3); // una venta por ciclo, nunca más
    expect(v).toEqual([
      { clienteId: "jlr", clienteNombre: "José Luís", fecha: "2026-09-16", importe: 360, modalidad: "3 meses", motivo: "renovacion" },
      { clienteId: "jlr", clienteNombre: "José Luís", fecha: "2026-06-16", importe: 360, modalidad: "3 meses", motivo: "renovacion" },
      { clienteId: "jlr", clienteNombre: "José Luís", fecha: "2026-03-23", importe: 390, modalidad: "3 meses", motivo: "alta" },
    ]);
    expect(v.reduce((s, x) => s + x.importe, 0)).toBe(390 + 360 + 360);
  });
});

describe("tasaRenovacion()", () => {
  const HOY2 = isoADias("2026-10-01");

  it("un ciclo con otro ciclo detrás ya cuenta como renovado, pase lo que pase con el último", () => {
    const doc = {
      clientes: [
        {
          id: "a",
          nombre: "Activo con renovación en curso",
          estado: "Activo",
          historialCiclos: [
            { fecha: "2026-01-01", semanasTotal: 12, motivo: "alta" },
            { fecha: "2026-09-01", semanasTotal: 12, motivo: "renovacion" }, // aún en curso
          ],
        },
      ],
    };
    const r = tasaRenovacion(doc, HOY2);
    // el alta ya renovó (hecho consumado); el ciclo actual sigue en curso -> no se evalúa
    expect(r).toEqual({ renovaron: 1, noRenovaron: 0, total: 1, tasa: 100, noRenovaronLista: [] });
  });

  it("Finalizado/Baja en el último ciclo siempre cuenta como 'no renovó', pase lo que pase con la fecha", () => {
    const doc = {
      clientes: [
        {
          id: "b",
          nombre: "Se dio de baja",
          estado: "Finalizado",
          historialCiclos: [
            { fecha: "2026-01-01", semanasTotal: 12, motivo: "alta" },
            { fecha: "2026-04-01", semanasTotal: 12, motivo: "renovacion" },
          ],
        },
      ],
    };
    const r = tasaRenovacion(doc, HOY2);
    expect(r.renovaron).toBe(1); // el alta
    expect(r.noRenovaron).toBe(1); // la renovación, que no tuvo una siguiente
    expect(r.tasa).toBe(50);
    // finCiclo es cuando ESE ciclo debería haber terminado (fecha + semanasTotal), no cuando empezó
    expect(r.noRenovaronLista).toEqual([
      { clienteId: "b", clienteNombre: "Se dio de baja", estado: "Finalizado", finCiclo: diasAIso(isoADias("2026-04-01") + 12 * 7) },
    ]);
  });

  it("un único ciclo Activo cuyo plazo ya pasó cuenta como renovado (sin señal de baja)", () => {
    const doc = {
      clientes: [{ id: "c", nombre: "Sigue activo", estado: "Activo", historialCiclos: [{ fecha: "2026-01-01", semanasTotal: 12, motivo: "alta" }] }],
    };
    expect(tasaRenovacion(doc, HOY2)).toMatchObject({ renovaron: 1, noRenovaron: 0 });
  });

  it("un único ciclo Activo que todavía no ha terminado no se evalúa", () => {
    const doc = {
      clientes: [{ id: "d", nombre: "Recién empezado", estado: "Activo", historialCiclos: [{ fecha: "2026-09-25", semanasTotal: 12, motivo: "alta" }] }],
    };
    expect(tasaRenovacion(doc, HOY2)).toEqual({ renovaron: 0, noRenovaron: 0, total: 0, tasa: null, noRenovaronLista: [] });
  });

  it("un cliente sin historialCiclos no cuenta para nada", () => {
    const doc = { clientes: [{ id: "e", nombre: "Sin ciclos", estado: "Finalizado", historialCiclos: [] }] };
    expect(tasaRenovacion(doc, HOY2)).toEqual({ renovaron: 0, noRenovaron: 0, total: 0, tasa: null, noRenovaronLista: [] });
  });
});

describe("serieTasaRenovacion()", () => {
  const HOY3 = isoADias("2026-10-01");
  const doc = {
    clientes: [
      {
        id: "r1",
        nombre: "Renovó en agosto",
        estado: "Renovado",
        historialCiclos: [
          { fecha: "2026-07-01", semanasTotal: 8, motivo: "alta" },
          { fecha: "2026-08-26", semanasTotal: 8, motivo: "renovacion" }, // sigue en curso, no se evalúa
        ],
      },
      {
        id: "r2",
        nombre: "Se dio de baja",
        estado: "Baja",
        historialCiclos: [{ fecha: "2026-04-01", semanasTotal: 12, motivo: "alta" }],
      },
    ],
  };

  it("agrupa cada resolución en el mes en que se decidió, no en el que empezó el ciclo", () => {
    const s = serieTasaRenovacion(doc, HOY3, 6);
    expect(s.find((x) => x.mes === "2026-08")).toMatchObject({ renovaron: 1, noRenovaron: 0, total: 1, tasa: 100 });

    const mesBaja = claveMes(diasAIso(isoADias("2026-04-01") + 12 * 7));
    expect(mesBaja).not.toBe("2026-08"); // confirma que no colisiona con el evento de arriba
    expect(s.find((x) => x.mes === mesBaja)).toMatchObject({ renovaron: 0, noRenovaron: 1, total: 1, tasa: 0 });
  });

  it("los meses sin ciclos resueltos tienen tasa null", () => {
    const s = serieTasaRenovacion(doc, HOY3, 6);
    expect(s.find((x) => x.mes === "2026-07")).toMatchObject({ total: 0, tasa: null });
  });

  it("la suma de la serie coincide con el total agregado de tasaRenovacion()", () => {
    const agregado = tasaRenovacion(doc, HOY3);
    const s = serieTasaRenovacion(doc, HOY3, 12);
    expect(s.reduce((acc, x) => acc + x.renovaron, 0)).toBe(agregado.renovaron);
    expect(s.reduce((acc, x) => acc + x.noRenovaron, 0)).toBe(agregado.noRenovaron);
  });
});

describe("ltvPorCliente() / ltvCliente() / ltvMedio()", () => {
  const doc = {
    clientes: [
      {
        id: "x",
        nombre: "Con dos ciclos",
        historialCiclos: [
          { fecha: "2026-01-01", importe: 300, motivo: "alta" },
          { fecha: "2026-04-01", importe: 320, motivo: "renovacion" },
        ],
      },
      { id: "y", nombre: "Con un ciclo", historialCiclos: [{ fecha: "2026-02-01", importe: 500, motivo: "alta" }] },
    ],
    cobros: [],
  };

  it("ltvPorCliente suma TODOS los ciclos de cada cliente, no solo el actual", () => {
    const mapa = ltvPorCliente(doc);
    expect(mapa.get("x")).toBe(300 + 320);
    expect(mapa.get("y")).toBe(500);
  });

  it("ltvCliente devuelve el LTV de un cliente concreto (0 si no existe)", () => {
    expect(ltvCliente(doc, "x")).toBe(620);
    expect(ltvCliente(doc, "no-existe")).toBe(0);
  });

  it("ltvMedio es el promedio entre todos los clientes con ventas", () => {
    expect(ltvMedio(doc)).toBe(Math.round((620 + 500) / 2));
  });

  it("ltvMedio es 0 si no hay ventas", () => {
    expect(ltvMedio({ clientes: [], cobros: [] })).toBe(0);
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
