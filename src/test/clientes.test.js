import { describe, it, expect } from "vitest";
import {
  nuevoCliente,
  nuevoCobro,
  cobrosParaCiclo,
  nuevaCarrera,
  cobrosDeCliente,
  clientePorId,
} from "../lib/clientes.js";

describe("nuevoCliente", () => {
  const c = nuevoCliente({
    nombre: "  Ana Pérez  ",
    modalidad: "6 meses",
    fechaInicio: "2026-09-01",
    importe: "597",
    metodoPago: "Bizum",
    objetivoCorto: "bajar 3kg",
  });

  it("tiene id estable y campos base", () => {
    expect(typeof c.id).toBe("string");
    expect(c.id.length).toBeGreaterThan(8);
    expect(c.nombre).toBe("Ana Pérez");
    expect(c.estado).toBe("Activo");
    expect(c.semanasTotal).toBe(24);
    expect(c.semanasPrevias).toBe(0);
    expect(c.numRenovaciones).toBe(0);
    expect(c.importe).toBe(597);
    expect(c.carreras).toEqual([]);
    expect(c.llamadaRenovacion).toEqual({ hecha: false, fecha: null });
  });

  it("registra el ciclo inicial en el historial", () => {
    expect(c.historialCiclos).toHaveLength(1);
    expect(c.historialCiclos[0]).toMatchObject({ motivo: "alta", modalidad: "6 meses", importe: 597, semanasTotal: 24 });
  });

  it("no confunde fecha de inicio con fecha de pago", () => {
    // el alta no fija fecha de pago en el cliente; eso vive en los cobros
    expect(c.fechaInicio).toBe("2026-09-01");
    expect(c).not.toHaveProperty("fechaPago");
  });

  it("ids distintos en altas consecutivas", () => {
    const a = nuevoCliente({ nombre: "A", modalidad: "3 meses", fechaInicio: "2026-01-01", importe: 1 });
    const b = nuevoCliente({ nombre: "B", modalidad: "3 meses", fechaInicio: "2026-01-01", importe: 1 });
    expect(a.id).not.toBe(b.id);
  });
});

describe("cobrosParaCiclo", () => {
  it("pago único: 1 cobro con la FECHA DE PAGO (no la de inicio)", () => {
    const cobros = cobrosParaCiclo({
      clienteId: "cli-1",
      fechaPago: "2026-08-15", // dinero entra en agosto
      importeTotal: 347,
      fraccionado: false,
    });
    expect(cobros).toHaveLength(1);
    expect(cobros[0]).toMatchObject({
      clienteId: "cli-1",
      fechaPago: "2026-08-15",
      concepto: "Programa completo",
      importe: 347,
      estado: "Cobrado",
    });
  });

  it("fraccionado 3 cuotas: importes suman EXACTO y fechas a +30 días", () => {
    const cobros = cobrosParaCiclo({
      clienteId: "cli-2",
      fechaPago: "2026-09-01",
      importeTotal: 590,
      fraccionado: true,
      numCuotas: 3,
      metodo: "Stripe",
    });
    expect(cobros).toHaveLength(3);
    expect(cobros.reduce((s, c) => s + c.importe, 0)).toBe(590);
    expect(cobros.map((c) => c.concepto)).toEqual(["Cuota 1/3", "Cuota 2/3", "Cuota 3/3"]);
    expect(cobros.map((c) => c.estado)).toEqual(["Cobrado", "Pendiente", "Pendiente"]);
    expect(cobros.map((c) => c.fechaPago)).toEqual(["2026-09-01", "2026-10-01", "2026-10-31"]);
    expect(cobros.every((c) => c.clienteId === "cli-2")).toBe(true);
  });

  it("estadoPrimera 'Pendiente' → el primer cobro queda pendiente", () => {
    const [primero] = cobrosParaCiclo({
      clienteId: "x",
      fechaPago: "2026-09-01",
      importeTotal: 100,
      fraccionado: false,
      estadoPrimera: "Pendiente",
    });
    expect(primero.estado).toBe("Pendiente");
  });
});

describe("vínculos por id", () => {
  it("nuevoCobro guarda clienteId, no nombre", () => {
    const co = nuevoCobro({ clienteId: "abc", fechaPago: "2026-09-01", importe: 50 });
    expect(co.clienteId).toBe("abc");
    expect(co).not.toHaveProperty("cliente");
    expect(co).not.toHaveProperty("nombre");
  });

  it("cobrosDeCliente / clientePorId filtran por id", () => {
    const doc = {
      clientes: [
        { id: "1", nombre: "Uno" },
        { id: "2", nombre: "Dos" },
      ],
      cobros: [
        { id: "a", clienteId: "1" },
        { id: "b", clienteId: "2" },
        { id: "c", clienteId: "1" },
      ],
    };
    expect(cobrosDeCliente(doc, "1").map((c) => c.id)).toEqual(["a", "c"]);
    expect(clientePorId(doc, "2").nombre).toBe("Dos");
    expect(clientePorId(doc, "9")).toBe(null);
  });
});

describe("nuevaCarrera", () => {
  it("crea carrera con id y recorta el nombre", () => {
    const r = nuevaCarrera({ nombre: "  10k Valencia ", fecha: "2026-10-05" });
    expect(typeof r.id).toBe("string");
    expect(r.nombre).toBe("10k Valencia");
    expect(r.fecha).toBe("2026-10-05");
  });
});
