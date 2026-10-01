import { describe, it, expect } from "vitest";
import { isoADias, diasAIso, rangoSemana, rangoMes, rangoTrimestre, rangoAnio, rangoPeriodo, dentroDeRango } from "../lib/fechas.js";

// 2026-09-10 es jueves.
const HOY = isoADias("2026-09-10");

describe("rangoSemana()", () => {
  it("lunes a domingo de la semana que contiene 'hoy'", () => {
    const { desde, hasta } = rangoSemana(HOY);
    expect(diasAIso(desde)).toBe("2026-09-07"); // lunes
    expect(diasAIso(hasta)).toBe("2026-09-13"); // domingo
  });
});

describe("rangoMes()", () => {
  it("primer y último día del mes natural", () => {
    const { desde, hasta } = rangoMes(HOY);
    expect(diasAIso(desde)).toBe("2026-09-01");
    expect(diasAIso(hasta)).toBe("2026-09-30");
  });
});

describe("rangoTrimestre()", () => {
  it("trimestre jul-ago-sep para una fecha de septiembre", () => {
    const { desde, hasta } = rangoTrimestre(HOY);
    expect(diasAIso(desde)).toBe("2026-07-01");
    expect(diasAIso(hasta)).toBe("2026-09-30");
  });
});

describe("rangoAnio()", () => {
  it("1 de enero a 31 de diciembre del año de 'hoy'", () => {
    const { desde, hasta } = rangoAnio(HOY);
    expect(diasAIso(desde)).toBe("2026-01-01");
    expect(diasAIso(hasta)).toBe("2026-12-31");
  });
});

describe("rangoPeriodo()", () => {
  it("'todo' no filtra (desde/hasta null)", () => {
    expect(rangoPeriodo("todo", HOY)).toEqual({ desde: null, hasta: null });
  });
  it("'personalizado' usa las fechas dadas", () => {
    const r = rangoPeriodo("personalizado", HOY, { desde: "2026-01-01", hasta: "2026-01-31" });
    expect(diasAIso(r.desde)).toBe("2026-01-01");
    expect(diasAIso(r.hasta)).toBe("2026-01-31");
  });
});

describe("dentroDeRango()", () => {
  it("sin rango (null/null) siempre es true", () => {
    expect(dentroDeRango("2020-01-01", null, null)).toBe(true);
  });
  it("respeta los límites inclusive", () => {
    const { desde, hasta } = rangoMes(HOY);
    expect(dentroDeRango("2026-09-01", desde, hasta)).toBe(true);
    expect(dentroDeRango("2026-09-30", desde, hasta)).toBe(true);
    expect(dentroDeRango("2026-08-31", desde, hasta)).toBe(false);
    expect(dentroDeRango("2026-10-01", desde, hasta)).toBe(false);
  });
});
