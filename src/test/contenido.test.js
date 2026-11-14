import { describe, it, expect } from "vitest";
import {
  normalizaContenido, guardarItem, borrarItem, pasarIdeaAlCalendario, importarContenido, semanasDelMes, itemsPorDia, resumenContenido,
  siguienteEstado, antiguasSinCerrar, semanaDe, sumarDias, itemPorDefecto, unirCalendarios, limpio, huecosSinPost, equilibrio, atrasadas, estaListo, OBJETIVOS,
} from "../lib/contenido.js";

const vacio = () => ({ clientes: [], cobros: [], contenido: normalizaContenido(undefined) });

describe("contenido: altas, ediciones y borrados", () => {
  it("normalizaContenido siempre devuelve las 4 listas", () => {
    expect(normalizaContenido(undefined)).toEqual({ posts: [], stories: [], ideasFeed: [], ideasStories: [] });
    expect(normalizaContenido({ posts: [{ a: 1 }, null, 3] }).posts).toEqual([{ a: 1 }]);
  });

  it("guardarItem crea con id y luego edita sin duplicar", () => {
    let d = guardarItem(vacio(), "posts", { fecha: "2026-11-20", tema: "Reel prueba", estado: "Idear" });
    const id = d.contenido.posts[0].id;
    expect(id).toBeTruthy();
    d = guardarItem(d, "posts", { id, estado: "Publicado" });
    expect(d.contenido.posts).toHaveLength(1);
    expect(d.contenido.posts[0]).toMatchObject({ tema: "Reel prueba", estado: "Publicado" });
  });

  it("borrarItem quita solo ese elemento", () => {
    let d = guardarItem(vacio(), "stories", { fecha: "2026-11-20", tema: "A" });
    d = guardarItem(d, "stories", { fecha: "2026-11-21", tema: "B" });
    d = borrarItem(d, "stories", d.contenido.stories[0].id);
    expect(d.contenido.stories.map((s) => s.tema)).toEqual(["B"]);
  });

  it("no toca clientes ni cobros", () => {
    const base = { ...vacio(), clientes: [{ id: "c" }], cobros: [{ id: "x" }] };
    const d = guardarItem(base, "posts", { fecha: "2026-11-20", tema: "T" });
    expect(d.clientes).toEqual([{ id: "c" }]);
    expect(d.cobros).toEqual([{ id: "x" }]);
  });
});

describe("contenido: pasar una idea al calendario", () => {
  it("idea de feed → post con su objetivo/formato, y la idea queda usada", () => {
    let d = guardarItem(vacio(), "ideasFeed", { objetivo: "Educar", tema: "Hidratos", formato: "Carrusel", nota: "https://x", usada: false });
    const id = d.contenido.ideasFeed[0].id;
    d = pasarIdeaAlCalendario(d, "ideasFeed", id, { fecha: "2026-12-01" });
    expect(d.contenido.ideasFeed[0].usada).toBe(true);
    expect(d.contenido.posts[0]).toMatchObject({ fecha: "2026-12-01", objetivo: "Educar", formato: "Carrusel", tema: "Hidratos", estado: "Idear", ideaId: id });
  });

  it("idea de stories → story con su secuencia", () => {
    let d = guardarItem(vacio(), "ideasStories", { secuencia: "Autoridad", tema: "Caso", nota: "", usada: false });
    const id = d.contenido.ideasStories[0].id;
    d = pasarIdeaAlCalendario(d, "ideasStories", id, { fecha: "2026-12-02" });
    expect(d.contenido.stories[0]).toMatchObject({ fecha: "2026-12-02", secuencia: "Autoridad", tema: "Caso", cta: "Ninguna" });
    expect(d.contenido.ideasStories[0].usada).toBe(true);
  });
});

describe("contenido: importar el Excel antiguo", () => {
  const datos = {
    posts: [{ fecha: "2026-06-02", objetivo: "Atraer", formato: "Reel", estado: "Publicado", tema: "Día 14/30: Nitratos", cta: "", nota: "" }],
    stories: [{ fecha: "2026-08-17", secuencia: "Conexión", tema: "Consulta", cta: "Ninguna", estado: "Publicado", nota: "" }],
    ideasFeed: [{ objetivo: "Atraer", tema: "Alternativas a los geles", formato: "Reel", nota: "", usada: true }],
    ideasStories: [{ secuencia: "Valor + CTA", tema: "Hidratos en el día", nota: "", usada: false }],
  };

  it("añade todo con ids nuevos y conserva el estado 'usada'", () => {
    const { doc, resumen } = importarContenido(vacio(), datos);
    expect(resumen.posts).toEqual({ nuevos: 1, ya: 0 });
    expect(doc.contenido.posts[0].id).toBeTruthy();
    expect(doc.contenido.ideasFeed[0].usada).toBe(true);
  });

  it("repetir la importación no duplica nada", () => {
    const una = importarContenido(vacio(), datos).doc;
    const { doc, resumen } = importarContenido(una, datos);
    expect(doc.contenido.posts).toHaveLength(1);
    expect(doc.contenido.ideasStories).toHaveLength(1);
    expect(resumen.posts).toEqual({ nuevos: 0, ya: 1 });
  });

  it("ignora basura sin romper", () => {
    const { doc } = importarContenido(vacio(), { posts: [null, 5], stories: "x" });
    expect(doc.contenido.posts).toEqual([]);
  });
});

describe("contenido: calendario mensual", () => {
  it("noviembre de 2026 (empieza en domingo) ocupa 6 semanas lunes→domingo", () => {
    const s = semanasDelMes(2026, 11);
    expect(s).toHaveLength(6);
    expect(s[0][0]).toMatchObject({ iso: "2026-10-26", delMes: false });
    expect(s[0][6]).toMatchObject({ iso: "2026-11-01", dia: 1, delMes: true });
    expect(s[5][0]).toMatchObject({ iso: "2026-11-30", delMes: true });
    expect(s[5][6]).toMatchObject({ iso: "2026-12-06", delMes: false });
  });

  it("febrero de 2027 (empieza en lunes) ocupa 4 semanas exactas", () => {
    const s = semanasDelMes(2027, 2);
    expect(s).toHaveLength(4);
    expect(s[0][0]).toMatchObject({ iso: "2027-02-01", delMes: true });
    expect(s[3][6]).toMatchObject({ iso: "2027-02-28", delMes: true });
  });

  it("diciembre enlaza bien con enero del año siguiente", () => {
    const s = semanasDelMes(2026, 12);
    expect(s.at(-1).at(-1).iso).toBe("2027-01-03");
  });

  it("itemsPorDia agrupa por fecha", () => {
    const m = itemsPorDia([{ fecha: "2026-11-02", id: 1 }, { fecha: "2026-11-02", id: 2 }, { fecha: "2026-11-03", id: 3 }, { id: 4 }]);
    expect(m.get("2026-11-02")).toHaveLength(2);
    expect(m.size).toBe(2);
  });
});

describe("contenido: resumen", () => {
  it("cuenta publicados del mes, pendientes futuros e ideas libres", () => {
    const doc = {
      contenido: {
        posts: [
          { fecha: "2026-11-03", estado: "Publicado" },
          { fecha: "2026-11-10", estado: "Publicado" },
          { fecha: "2026-10-30", estado: "Publicado" },
          { fecha: "2026-11-20", estado: "Guion" },
          { fecha: "2026-11-05", estado: "Idear" }, // pasada y sin publicar: no cuenta como "por publicar"
        ],
        stories: [{ fecha: "2026-11-16", estado: "Grabar" }, { fecha: "2026-11-17", estado: "Hecha" }],
        ideasFeed: [{ usada: false }, { usada: true }],
        ideasStories: [{ usada: false }, { usada: false }],
      },
    };
    expect(resumenContenido(doc, "2026-11-14")).toEqual({
      publicadosMes: 2,
      pendientesPosts: 1,
      pendientesStories: 1,
      ideasLibresFeed: 1,
      ideasLibresStories: 2,
    });
  });
});

describe("contenido: proceso de producción", () => {
  it("siguienteEstado recorre el proceso de cada tipo y termina en null", () => {
    expect(siguienteEstado("posts", "Idear")).toBe("Guion");
    expect(siguienteEstado("posts", "Editar")).toBe("Programar");
    expect(siguienteEstado("posts", "Programar")).toBe("Publicado");
    expect(siguienteEstado("posts", "Publicado")).toBeNull();
    expect(siguienteEstado("stories", "Grabar")).toBe("Hecha");
    expect(siguienteEstado("stories", "Hecha")).toBe("Publicado");
    expect(siguienteEstado("stories", "Inventado")).toBeNull();
  });

  it("estaListo: publicado o story hecha", () => {
    expect(estaListo({ estado: "Publicado" })).toBe(true);
    expect(estaListo({ estado: "Hecha" })).toBe(true);
    expect(estaListo({ estado: "Grabar" })).toBe(false);
  });

  it("atrasadas: pasadas y sin terminar, de la más antigua a la más reciente", () => {
    const items = [
      { id: 1, fecha: "2026-11-10", estado: "Guion" },
      { id: 2, fecha: "2026-11-05", estado: "Idear" },
      { id: 3, fecha: "2026-11-08", estado: "Publicado" },
      { id: 4, fecha: "2026-11-14", estado: "Idear" }, // hoy: aún no está atrasada
      { id: 5, fecha: "2026-11-20", estado: "Idear" },
    ];
    expect(atrasadas(items, "2026-11-14").map((x) => x.id)).toEqual([2, 1]);
  });

  it("lo de hace más de 14 días no es atrasado: se cuenta aparte como antiguo", () => {
    const items = [
      { id: 1, fecha: "2026-08-20", estado: "Grabar" },
      { id: 2, fecha: "2026-10-31", estado: "Idear" }, // justo en el límite: aún cuenta como atrasada
      { id: 3, fecha: "2026-10-30", estado: "Idear" },
      { id: 4, fecha: "2026-08-21", estado: "Hecha" },
    ];
    expect(atrasadas(items, "2026-11-14").map((x) => x.id)).toEqual([2]);
    expect(antiguasSinCerrar(items, "2026-11-14")).toBe(2);
  });
});

describe("contenido: semanas y huecos", () => {
  it("semanaDe devuelve lunes → domingo, también cruzando de mes", () => {
    expect(semanaDe("2026-11-14")).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(semanaDe("2026-11-01")[0]).toBe("2026-10-26"); // domingo 1-nov → semana que empieza el 26-oct
    expect(semanaDe("2026-11-02")[0]).toBe("2026-11-02"); // un lunes es el primer día
  });

  it("sumarDias cruza meses y años", () => {
    expect(sumarDias("2026-12-30", 3)).toBe("2027-01-02");
    expect(sumarDias("2026-11-14", -14)).toBe("2026-10-31");
  });

  it("huecosSinPost: días de los próximos N sin ningún post (las stories no cuentan)", () => {
    const posts = [{ fecha: "2026-11-14" }, { fecha: "2026-11-16" }, { fecha: "2026-12-30" }];
    expect(huecosSinPost(posts, "2026-11-14", 4)).toEqual(["2026-11-15", "2026-11-17"]);
  });
});

describe("contenido: equilibrio", () => {
  const posts = [
    { fecha: "2026-11-01", objetivo: "Atraer" },
    { fecha: "2026-11-05", objetivo: "Atraer" },
    { fecha: "2026-11-09", objetivo: "Educar" },
    { fecha: "2026-11-12", objetivo: "Convertir" },
    { fecha: "2026-10-01", objetivo: "Conectar" }, // fuera de la ventana
  ];
  it("cuenta y calcula el % por categoría dentro del rango", () => {
    const e = equilibrio(posts, "objetivo", OBJETIVOS, "2026-10-16", "2026-11-14");
    expect(e.total).toBe(4);
    expect(e.categorias).toEqual([
      { nombre: "Atraer", n: 2, pct: 50 },
      { nombre: "Educar", n: 1, pct: 25 },
      { nombre: "Convertir", n: 1, pct: 25 },
      { nombre: "Conectar", n: 0, pct: 0 },
    ]);
  });
  it("sin piezas en el rango no divide por cero", () => {
    expect(equilibrio([], "objetivo", OBJETIVOS, "2026-11-01", "2026-11-30").categorias.every((c) => c.pct === 0)).toBe(true);
  });
});

describe("contenido: lista unificada", () => {
  const doc = { contenido: { posts: [{ id: "p", fecha: "2026-11-02" }], stories: [{ id: "s", fecha: "2026-11-02" }], ideasFeed: [], ideasStories: [] } };
  it("unirCalendarios marca el origen y respeta la capa elegida", () => {
    expect(unirCalendarios(doc).map((x) => x._lista).sort()).toEqual(["posts", "stories"]);
    expect(unirCalendarios(doc, "posts").map((x) => x.id)).toEqual(["p"]);
    expect(unirCalendarios(doc, "stories").map((x) => x.id)).toEqual(["s"]);
  });
  it("limpio quita la marca interna y itemPorDefecto da valores válidos", () => {
    expect(limpio({ id: "p", _lista: "posts" })).toEqual({ id: "p" });
    expect(itemPorDefecto("posts", "2026-11-02")).toMatchObject({ fecha: "2026-11-02", objetivo: "Atraer", estado: "Idear" });
    expect(itemPorDefecto("stories", "2026-11-02")).toMatchObject({ secuencia: "Valor + CTA", cta: "Ninguna", estado: "Idear" });
  });
});
