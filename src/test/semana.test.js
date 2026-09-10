import { describe, it, expect } from "vitest";
import { agendaSemanal } from "../lib/semana.js";
import { marcarTarea, registrarContacto, nuevoCliente, nuevoCobro } from "../lib/clientes.js";
import { isoADias, diasAIso } from "../lib/fechas.js";

// Miércoles 2026-09-09 (dow 3) → fin de semana = domingo 2026-09-13.
const HOY = isoADias("2026-09-09");

const cli = (n, extra = {}) => ({
  ...nuevoCliente({ nombre: n, modalidad: "3 meses", fechaInicio: diasAIso(HOY - 80), importe: 347, ...extra }),
  ...extra,
});

describe("agendaSemanal()", () => {
  it("llamadas a hacer: renovación/optimización que ya tocaban", () => {
    const doc = { clientes: [cli("Maduro")], cobros: [], tareas: {} };
    const a = agendaSemanal(doc, HOY);
    expect(a.llamadasHacer.some((x) => x.tipo === "renovacion")).toBe(true);
    expect(a.llamadasHacer.some((x) => x.tipo === "optimizacion" && x.semana === 6)).toBe(true);
  });

  it("llamadas a agendar: toca justo la semana que viene, y se puede marcar", () => {
    // 3 meses, optim global 6. Inicio hace 4*7+2=30 días → semana 5 → la 6 es la que viene.
    const c = nuevoCliente({ nombre: "Casi", modalidad: "3 meses", fechaInicio: diasAIso(HOY - 30), importe: 347 });
    let doc = { clientes: [c], cobros: [], tareas: {} };
    let a = agendaSemanal(doc, HOY);
    const item = a.llamadasAgendar.find((x) => x.tipo === "optimizacion");
    expect(item).toBeTruthy();
    doc = marcarTarea(doc, item.clave, true);
    a = agendaSemanal(doc, HOY);
    expect(a.llamadasAgendar.find((x) => x.clave === item.clave)).toBeUndefined();
  });

  it("revisiones mensuales: semana múltiplo de 4, y desaparece al marcarla", () => {
    const c = nuevoCliente({ nombre: "Rev", modalidad: "6 meses", fechaInicio: diasAIso(HOY - 53), importe: 597 }); // semana 8
    let doc = { clientes: [c], cobros: [], tareas: {} };
    let a = agendaSemanal(doc, HOY);
    expect(a.revisiones).toHaveLength(1);
    doc = marcarTarea(doc, a.revisiones[0].clave, true);
    expect(agendaSemanal(doc, HOY).revisiones).toHaveLength(0);
  });

  it("tablas de competición: carreras a 8–30 días", () => {
    const c = cli("ConCarreras");
    c.carreras = [
      { id: "r-cerca", nombre: "en 5 días", fecha: diasAIso(HOY + 5) }, // demasiado cerca
      { id: "r-media", nombre: "en 20 días", fecha: diasAIso(HOY + 20) }, // sí
      { id: "r-lejos", nombre: "en 40 días", fecha: diasAIso(HOY + 40) }, // demasiado lejos
    ];
    const a = agendaSemanal({ clientes: [c], cobros: [], tareas: {} }, HOY);
    expect(a.tablasCarrera.map((t) => t.carrera.nombre)).toEqual(["en 20 días"]);
  });

  it("cobros que vencen: pendientes con fecha ≤ fin de semana (incluye vencidos)", () => {
    const c = cli("Pagador");
    const cobros = [
      nuevoCobro({ clienteId: c.id, fechaPago: diasAIso(HOY - 3), importe: 100, estado: "Pendiente" }), // vencido
      nuevoCobro({ clienteId: c.id, fechaPago: diasAIso(HOY + 2), importe: 100, estado: "Pendiente" }), // esta semana
      nuevoCobro({ clienteId: c.id, fechaPago: diasAIso(HOY + 20), importe: 100, estado: "Pendiente" }), // futuro
      nuevoCobro({ clienteId: c.id, fechaPago: diasAIso(HOY - 1), importe: 100, estado: "Cobrado" }), // ya cobrado
    ];
    const a = agendaSemanal({ clientes: [c], cobros, tareas: {} }, HOY);
    expect(a.cobrosVencen).toHaveLength(2);
    expect(a.cobrosVencen[0].dias).toBeLessThan(0); // el vencido primero
  });

  it("preparar renovación: ciclo que acaba en ≤ 28 días", () => {
    // 3 meses = 84 días. Inicio hace 70 → quedan 14 días.
    const c = nuevoCliente({ nombre: "Acaba", modalidad: "3 meses", fechaInicio: diasAIso(HOY - 70), importe: 347 });
    const a = agendaSemanal({ clientes: [c], cobros: [], tareas: {} }, HOY);
    expect(a.renovaciones).toHaveLength(1);
    expect(a.renovaciones[0].diasRestantes).toBe(14);
  });

  it("ignora clientes no activos y cuenta el total", () => {
    const doc = { clientes: [cli("Baja", { estado: "Baja" })], cobros: [], tareas: {} };
    const a = agendaSemanal(doc, HOY);
    expect(a.total).toBe(0);
  });
});

describe("marcarTarea / registrarContacto (puras)", () => {
  it("marcarTarea añade y quita sin mutar", () => {
    const doc = { clientes: [], cobros: [], tareas: {} };
    const a = marcarTarea(doc, "x", true);
    expect(a.tareas.x.hecha).toBe(true);
    expect(doc.tareas.x).toBeUndefined();
    const b = marcarTarea(a, "x", false);
    expect(b.tareas.x).toBeUndefined();
  });

  it("registrarContacto añade nota con fecha; ignora texto vacío", () => {
    const doc = { clientes: [{ id: "1", nombre: "A", contactos: [] }], cobros: [] };
    const a = registrarContacto(doc, "1", { tipo: "Renovación", texto: "  " });
    expect(a).toBe(doc);
    const b = registrarContacto(doc, "1", { tipo: "Renovación", texto: "Acordamos 6 meses" });
    expect(b.clientes[0].contactos).toHaveLength(1);
    expect(b.clientes[0].contactos[0]).toMatchObject({ tipo: "Renovación", texto: "Acordamos 6 meses" });
    expect(doc.clientes[0].contactos).toHaveLength(0);
  });
});
