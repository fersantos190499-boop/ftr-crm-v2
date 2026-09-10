import { describe, it, expect } from "vitest";
import {
  calcularCliente,
  semanasDeModalidad,
  semanaDeRenovacion,
  semanasDeOptimizacion,
  MODALIDADES,
} from "../lib/logica.js";
import { isoADias, diasAIso, ddmmaaaaAIso, claveMes } from "../lib/fechas.js";
import { esActivo, esCerrado, ESTADOS } from "../lib/estado.js";
import * as legacy from "./legacy-calc.reference.js";

// ─── GOLDEN MASTER: lógica nueva == lógica del CRM anterior ──────────
describe("golden master vs calc() del CRM anterior", () => {
  // Barrido: cada modalidad × muchos desfases de fecha de inicio × varias
  // semanas previas. Para cada combinación, la lógica nueva debe dar el
  // mismo resultado que la referencia congelada.
  const modalidades = Object.keys(MODALIDADES);
  const desfases = []; // días entre inicio y "hoy": de -40 a +380
  for (let d = -40; d <= 380; d += 1) desfases.push(d);
  const semanasPreviasCasos = [0, 11, 12, 24, 27, 28];

  const HOY_DIAS = isoADias("2026-09-10"); // fijo → test determinista

  let comparaciones = 0;
  for (const mod of modalidades) {
    const st = MODALIDADES[mod];
    for (const sp of semanasPreviasCasos) {
      for (const desfase of desfases) {
        const fiDias = HOY_DIAS - desfase;
        const ref = legacy.calc(
          { fi: fiDias + legacy.OFFSET_SERIE, st, sp, mod },
          HOY_DIAS + legacy.OFFSET_SERIE
        );
        const nuevo = calcularCliente(
          { fechaInicio: diasAIso(fiDias), semanasTotal: st, semanasPrevias: sp, modalidad: mod },
          HOY_DIAS
        );

        it(`mod=${mod} sp=${sp} desfase=${desfase}d`, () => {
          expect(nuevo.diasRestantes).toBe(ref.dr);
          expect(nuevo.pct).toBeCloseTo(ref.pct, 12);
          expect(nuevo.semanaPrograma).toBe(ref.sc);
          expect(nuevo.semanaGlobal).toBe(ref.sg);
          expect(nuevo.semaforo).toBe(ref.sem);
          expect(nuevo.semanaRenovacion).toBe(ref.rw);
          expect(nuevo.semanasOptimizacion).toEqual(ref.ow);
          expect(nuevo.esRenovacionAhora).toBe(ref.isRenNow);
          expect(nuevo.esRenovacionPronto).toBe(ref.isRenSoon);
          expect(nuevo.esOptimizacionAhora).toBe(ref.isOptNow);
          expect(nuevo.proximaOptimizacion).toBe(ref.nextOpt);
          expect(nuevo.esMensual).toBe(ref.isMensual);
        });
        comparaciones++;
      }
    }
  }

  it(`ha comparado un número razonable de combinaciones (${comparaciones})`, () => {
    expect(comparaciones).toBeGreaterThan(10000);
  });
});

// ─── Los 27 clientes reales del CRM anterior ────────────────────────
describe("golden master sobre los clientes semilla reales", () => {
  const HOY = isoADias("2026-09-10");
  legacy.CLIENTES_LEGACY.forEach((c, i) => {
    it(`cliente semilla #${i + 1}`, () => {
      const ref = legacy.calc(c, HOY + legacy.OFFSET_SERIE);
      const nuevo = calcularCliente(
        {
          fechaInicio: diasAIso(c.fi - legacy.OFFSET_SERIE),
          semanasTotal: c.st,
          semanasPrevias: c.sp,
          modalidad: c.mod,
        },
        HOY
      );
      expect({
        dr: nuevo.diasRestantes,
        sc: nuevo.semanaPrograma,
        sg: nuevo.semanaGlobal,
        sem: nuevo.semaforo,
        rw: nuevo.semanaRenovacion,
        ow: nuevo.semanasOptimizacion,
        isRenNow: nuevo.esRenovacionAhora,
        isOptNow: nuevo.esOptimizacionAhora,
        nextOpt: nuevo.proximaOptimizacion,
        isMensual: nuevo.esMensual,
      }).toEqual({
        dr: ref.dr,
        sc: ref.sc,
        sg: ref.sg,
        sem: ref.sem,
        rw: ref.rw,
        ow: ref.ow,
        isRenNow: ref.isRenNow,
        isOptNow: ref.isOptNow,
        nextOpt: ref.nextOpt,
        isMensual: ref.isMensual,
      });
    });
  });
});

// ─── Valores concretos que Fer confirmó mantener ───────────────────
describe("valores de negocio confirmados", () => {
  it("semanas por modalidad", () => {
    expect(semanasDeModalidad("3 meses")).toBe(12);
    expect(semanasDeModalidad("6 meses")).toBe(24);
    expect(semanasDeModalidad("6+1 meses")).toBe(28);
    expect(semanasDeModalidad("12 meses")).toBe(52);
    expect(semanasDeModalidad("desconocida")).toBe(12);
  });

  it("semana de llamada de renovación", () => {
    expect(semanaDeRenovacion("3 meses")).toBe(11);
    expect(semanaDeRenovacion("6 meses")).toBe(23);
    expect(semanaDeRenovacion("6+1 meses")).toBe(27);
    expect(semanaDeRenovacion("12 meses")).toBe(50);
  });

  it("semanas de optimización: cada 6 (7 en 6+1), dentro del ciclo", () => {
    expect(semanasDeOptimizacion("3 meses", 0, 12)).toEqual([6]);
    expect(semanasDeOptimizacion("6 meses", 0, 24)).toEqual([6, 12, 18]);
    expect(semanasDeOptimizacion("6+1 meses", 0, 28)).toEqual([7, 14, 21]);
    // Segundo ciclo (renovación): sp=12, ciclo de 12 → semana global 18
    expect(semanasDeOptimizacion("3 meses", 12, 12)).toEqual([18]);
  });

  it("semáforo por días restantes", () => {
    const base = { modalidad: "3 meses", semanasTotal: 12, semanasPrevias: 0 };
    const hoy = isoADias("2026-09-10");
    const semaforoConFin = (dias) =>
      calcularCliente({ ...base, fechaInicio: diasAIso(hoy + dias - 12 * 7) }, hoy).semaforo;
    expect(semaforoConFin(-1)).toBe("⚫");
    expect(semaforoConFin(0)).toBe("⚫");
    expect(semaforoConFin(7)).toBe("🔴");
    expect(semaforoConFin(8)).toBe("🟡");
    expect(semaforoConFin(21)).toBe("🟡");
    expect(semaforoConFin(22)).toBe("🟢");
  });
});

// ─── Carreras (modelo nuevo: cliente.carreras[]) ───────────────────
describe("carreras próximas", () => {
  const hoy = isoADias("2026-09-10");
  const cli = {
    fechaInicio: "2026-08-01",
    modalidad: "3 meses",
    semanasTotal: 12,
    semanasPrevias: 0,
    carreras: [
      { id: "a", nombre: "10k pasada", fecha: "2026-09-01" },
      { id: "b", nombre: "21k", fecha: "2026-10-05" },
      { id: "c", nombre: "42k", fecha: "2026-09-25" },
    ],
  };
  it("descarta pasadas, ordena por fecha y calcula días", () => {
    const d = calcularCliente(cli, hoy);
    expect(d.carrerasProximas.map((r) => r.nombre)).toEqual(["42k", "21k"]);
    expect(d.proximaCarrera.nombre).toBe("42k");
    expect(d.diasProximaCarrera).toBe(isoADias("2026-09-25") - hoy);
  });
  it("sin carreras válidas → null", () => {
    const d = calcularCliente({ ...cli, carreras: [] }, hoy);
    expect(d.proximaCarrera).toBe(null);
    expect(d.diasProximaCarrera).toBe(null);
  });
});

// ─── Fechas ───────────────────────────────────────────────────────
describe("fechas", () => {
  it("ISO ↔ días es reversible", () => {
    for (const iso of ["1970-01-01", "2000-02-29", "2026-09-10", "2027-12-31"]) {
      expect(diasAIso(isoADias(iso))).toBe(iso);
    }
  });
  it("rechaza fechas imposibles", () => {
    expect(isoADias("2026-02-31")).toBe(null);
    expect(isoADias("2026-13-01")).toBe(null);
    expect(isoADias("10/09/2026")).toBe(null);
  });
  it("dd/mm/aaaa → ISO", () => {
    expect(ddmmaaaaAIso("10/09/2026")).toBe("2026-09-10");
    expect(ddmmaaaaAIso("1/3/2026")).toBe("2026-03-01");
    expect(ddmmaaaaAIso("31/02/2026")).toBe(null);
    expect(ddmmaaaaAIso("no")).toBe(null);
  });
  it("clave de mes", () => {
    expect(claveMes("2026-09-10")).toBe("2026-09");
    expect(claveMes("nada")).toBe(null);
  });
});

// ─── Estado ───────────────────────────────────────────────────────
describe("regla central esActivo", () => {
  it("Activo y Renovado cuentan como activos; el resto no", () => {
    expect(esActivo({ estado: "Activo" })).toBe(true);
    expect(esActivo({ estado: "Renovado" })).toBe(true);
    expect(esActivo({ estado: "Finalizado" })).toBe(false);
    expect(esActivo({ estado: "Baja" })).toBe(false);
    expect(esActivo(null)).toBe(false);
  });
  it("esCerrado", () => {
    expect(esCerrado({ estado: "Renovado" })).toBe(true);
    expect(esCerrado({ estado: "Finalizado" })).toBe(true);
    expect(esCerrado({ estado: "Baja" })).toBe(true);
    expect(esCerrado({ estado: "Activo" })).toBe(false);
  });
  it("no existe el estado Pendiente", () => {
    expect(ESTADOS).not.toContain("Pendiente");
    expect(ESTADOS).toEqual(["Activo", "Renovado", "Finalizado", "Baja"]);
  });
});
