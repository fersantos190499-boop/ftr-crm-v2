// ─── REFERENCIA CONGELADA ─────────────────────────
// Copia VERBATIM (solo comportamiento) de la lógica del CRM anterior
// (index.html, función calc() y auxiliares). NO se toca: sirve como
// "golden master" contra el que se compara la lógica nueva en los tests.
// Única adaptación: TODAY pasa como argumento en vez de ser global.

export const MOD_ST = { "3 meses": 12, "6 meses": 24, "6+1 meses": 28, "12 meses": 52 };

export const getRW = (m) =>
  m === "6 meses" ? 23 : m === "6+1 meses" ? 27 : m === "12 meses" ? 50 : 11;

export const getOW = (m, sp, st) => {
  const iv = m === "6+1 meses" ? 7 : 6;
  const r = [];
  for (let w = iv; w <= 400; w += iv) if (w > sp && w <= sp + st - 1) r.push(w);
  return r;
};

// c = { fi (serie Excel), st, sp, mod }
export const calc = (c, TODAY) => {
  const ff = c.fi + c.st * 7,
    dr = ff - TODAY;
  const el = Math.max(0, TODAY - c.fi),
    tot = c.st * 7;
  const pct = Math.max(0, Math.min(el / tot, 1));
  const sc = Math.max(1, Math.min(Math.floor(el / 7) + 1, c.st));
  const sg = (c.sp || 0) + sc;
  const sem = dr <= 0 ? "⚫" : dr <= 7 ? "🔴" : dr <= 21 ? "🟡" : "🟢";
  const rw = getRW(c.mod),
    ow = getOW(c.mod, c.sp || 0, c.st);
  const isRenNow = sc === rw,
    isRenSoon = sc === rw - 1,
    isOptNow = ow.includes(sg);
  const nextOpt = ow.find((w) => w > sg) || null,
    isMensual = sc % 4 === 0;
  return { ff, dr, pct, sc, sg, sem, rw, ow, isRenNow, isRenSoon, isOptNow, nextOpt, isMensual };
};

// Los 27 clientes semilla del CRM anterior (campos relevantes al cálculo).
// Sirven como casos reales dentro del barrido del golden master.
export const CLIENTES_LEGACY = [
  { fi: 46104, st: 12, sp: 0, mod: "3 meses" },
  { fi: 46111, st: 12, sp: 0, mod: "3 meses" },
  { fi: 46118, st: 12, sp: 0, mod: "3 meses" },
  { fi: 46104, st: 12, sp: 0, mod: "3 meses" },
  { fi: 46125, st: 12, sp: 0, mod: "3 meses" },
  { fi: 46139, st: 12, sp: 0, mod: "3 meses" },
  { fi: 46139, st: 12, sp: 0, mod: "3 meses" },
  { fi: 46139, st: 12, sp: 0, mod: "3 meses" },
  { fi: 46146, st: 24, sp: 0, mod: "6 meses" },
  { fi: 46153, st: 24, sp: 0, mod: "6 meses" },
  { fi: 46153, st: 12, sp: 0, mod: "3 meses" },
  { fi: 46153, st: 24, sp: 0, mod: "6 meses" },
  { fi: 46160, st: 12, sp: 0, mod: "3 meses" },
  { fi: 46160, st: 24, sp: 0, mod: "6 meses" },
  { fi: 46167, st: 12, sp: 0, mod: "3 meses" },
  { fi: 46167, st: 24, sp: 0, mod: "6 meses" },
  { fi: 46167, st: 24, sp: 0, mod: "6 meses" },
  { fi: 46167, st: 24, sp: 0, mod: "6 meses" },
  { fi: 46167, st: 12, sp: 0, mod: "3 meses" },
  { fi: 46188, st: 24, sp: 0, mod: "6 meses" },
  { fi: 46188, st: 24, sp: 0, mod: "6 meses" },
  { fi: 46188, st: 12, sp: 12, mod: "3 meses" },
  { fi: 46195, st: 12, sp: 12, mod: "3 meses" },
  { fi: 46202, st: 12, sp: 12, mod: "3 meses" },
  { fi: 46202, st: 24, sp: 0, mod: "6 meses" },
  { fi: 46209, st: 28, sp: 0, mod: "6+1 meses" },
  { fi: 46209, st: 28, sp: 0, mod: "6+1 meses" },
];

// Desfase entre "serie Excel" (día 0 = 1899-12-30) y "días desde epoch" (1970-01-01).
export const OFFSET_SERIE = 25569;
