import { describe, it, expect } from "vitest";
import { calcularCliente } from "../lib/logica.js";
import { renovarCliente } from "../lib/renovacion.js";
import { llamadas } from "../lib/consultas.js";
import { agendaSemanal } from "../lib/semana.js";
import { isoADias } from "../lib/fechas.js";

// Cliente 6+1 meses (28 sem) que empezó el 2026-07-26 y renueva por adelantado
// otro 6+1 con inicio el día que acaba el actual (2027-02-07 + 1 = 2027-02-08).
const base = {
  id: "lou",
  nombre: "Lourdes",
  estado: "Activo",
  modalidad: "6+1 meses",
  semanasTotal: 28,
  semanasPrevias: 0,
  importe: 697,
  fechaInicio: "2026-07-26",
  numRenovaciones: 0,
  carreras: [],
  llamadaRenovacion: { hecha: false, fecha: null },
  llamadasOptimizacion: { 7: { hecha: true, fecha: null } },
  historialCiclos: [{ fecha: "2026-07-26", modalidad: "6+1 meses", importe: 697, semanasTotal: 28, motivo: "alta" }],
};

function conRenovacionAnticipada() {
  const doc = { clientes: [base], cobros: [], tareas: {} };
  const r = renovarCliente(doc, "lou", {
    modalidad: "6+1 meses",
    importe: 697,
    fechaInicio: "2027-02-08",
    fechaPago: "2026-11-13",
    fraccionado: false,
    primeraCobrada: true,
  });
  return r;
}

describe("renovación anticipada (ciclo nuevo con inicio futuro)", () => {
  const HOY = isoADias("2026-11-13"); // semana 16 del ciclo actual

  it("mientras el nuevo no empiece, sigue calculando con el ciclo anterior", () => {
    const c = conRenovacionAnticipada().clientes[0];
    const d = calcularCliente(c, HOY);
    expect(d.renovacionAnticipada).toBe(true);
    expect(d.semanaPrograma).toBe(16);
    expect(d.semanaGlobal).toBe(16);
    expect(d.proximoInicio).toBe("2027-02-08");
    expect(d.diasRestantes).toBe(isoADias("2027-02-07") - HOY + 0);
    expect(d.semanasOptimizacion).toEqual([7, 14, 21]);
    expect(d.esRenovacionAhora).toBe(false);
  });

  it("el día que arranca el ciclo nuevo pasa solo a él (semana 1 / global 29)", () => {
    const c = conRenovacionAnticipada().clientes[0];
    const d = calcularCliente(c, isoADias("2027-02-08"));
    expect(d.renovacionAnticipada).toBe(false);
    expect(d.semanaPrograma).toBe(1);
    expect(d.semanaGlobal).toBe(29);
  });

  it("no pide llamada de renovación ni 'preparar renovación' del ciclo que ya renovó", () => {
    const doc = conRenovacionAnticipada();
    const hoy = isoADias("2027-01-26"); // semana 27 del ciclo viejo
    expect(llamadas(doc, hoy).pendientes.some((x) => x.tipo === "renovacion")).toBe(false);
    const a = agendaSemanal(doc, hoy);
    expect(a.renovaciones).toHaveLength(0);
    expect(a.llamadasHacer.some((x) => x.tipo === "renovacion")).toBe(false);
  });

  it("sí sigue pidiendo las optimizaciones del ciclo actual", () => {
    const doc = conRenovacionAnticipada();
    const l = llamadas(doc, HOY);
    expect(l.pendientes.some((x) => x.tipo === "optimizacion" && x.semana === 14)).toBe(true);
  });

  it("un cliente normal (sin ciclo futuro) no cambia", () => {
    const d = calcularCliente(base, HOY);
    expect(d.renovacionAnticipada).toBe(false);
    expect(d.semanaPrograma).toBe(16);
  });
});
