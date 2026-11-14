// ─── CONTENIDO (planificación de posts y stories) ──
// Lo que antes vivía en el Excel de contenido: calendario de posts (feed),
// calendario de stories y un banco de ideas para cada uno. Todo cuelga de
// `doc.contenido` y se guarda junto al resto del CRM. No hay métricas a
// propósito (nunca se medían).

import { idNuevo } from "./clientes.js";
import { isoADias, diasAIso } from "./fechas.js";

// ── Catálogos (mismos valores que usaba el Excel) ──
export const OBJETIVOS = ["Atraer", "Educar", "Convertir", "Conectar"];
export const FORMATOS = ["Reel", "Carrusel", "Post", "Directo"];
export const FORMATOS_IDEA = ["Reel", "Carrusel", "Post"];
export const ESTADOS_POST = ["Idear", "Guion", "Grabar", "Editar", "Programar", "Publicado"];
export const CTA_POST = ["Venta", "LM", "Comentar", "Seguirme"];

export const SECUENCIAS = ["Valor + CTA", "Educar", "Romper Objeción", "Autoridad", "Conexión", "Venta"];
export const SECUENCIAS_IDEA = ["Valor + CTA", "Romper Objeción", "Autoridad", "Conexión"];
export const ESTADOS_STORY = ["Idear", "Guion", "Grabar", "Hecha", "Publicado"];
export const CTA_STORY = ["Venta", "Lead Magnet", "Ninguna"];

// Color por objetivo / secuencia: [fondo, texto, acento]
export const COLOR_OBJETIVO = {
  Atraer: ["#e3f1f6", "#1f6f88", "#2f8ba8"],
  Educar: ["#f1ecfb", "#6b3fc0", "#8256d0"],
  Convertir: ["#e7f6ef", "#12855f", "#17a275"],
  Conectar: ["#fbf1e0", "#9a6208", "#d99a3a"],
};
export const COLOR_SECUENCIA = {
  "Valor + CTA": COLOR_OBJETIVO.Atraer,
  Educar: COLOR_OBJETIVO.Educar,
  "Romper Objeción": ["#fdecee", "#b81d30", "#d8253a"],
  Autoridad: COLOR_OBJETIVO.Convertir,
  Conexión: COLOR_OBJETIVO.Conectar,
  Venta: ["#e6ebef", "#1c3b46", "#1c3b46"],
};
const GRIS = ["#eef1f4", "#4a5563", "#9aa4af"];
export const colorDe = (lista, valor) =>
  (lista === "stories" || lista === "ideasStories" ? COLOR_SECUENCIA : COLOR_OBJETIVO)[valor] || GRIS;

export const LISTAS = ["posts", "stories", "ideasFeed", "ideasStories"];
export const CONTENIDO_VACIO = { posts: [], stories: [], ideasFeed: [], ideasStories: [] };

export function normalizaContenido(c) {
  const out = {};
  for (const k of LISTAS) out[k] = Array.isArray(c?.[k]) ? c[k].filter((x) => x && typeof x === "object") : [];
  return out;
}

const contenidoDe = (doc) => normalizaContenido(doc.contenido);

// ── Altas / ediciones / borrados ──
export function guardarItem(doc, lista, item) {
  const c = contenidoDe(doc);
  const actuales = c[lista];
  const existe = item.id && actuales.some((x) => x.id === item.id);
  const nuevos = existe
    ? actuales.map((x) => (x.id === item.id ? { ...x, ...item } : x))
    : [...actuales, { ...item, id: item.id || idNuevo() }];
  return { ...doc, contenido: { ...c, [lista]: nuevos } };
}

export function borrarItem(doc, lista, id) {
  const c = contenidoDe(doc);
  return { ...doc, contenido: { ...c, [lista]: c[lista].filter((x) => x.id !== id) } };
}

// Pasa una idea del banco al calendario y la marca como usada.
export function pasarIdeaAlCalendario(doc, listaIdea, ideaId, { fecha, estado = "Idear" }) {
  const c = contenidoDe(doc);
  const idea = c[listaIdea].find((x) => x.id === ideaId);
  if (!idea) return doc;
  const esFeed = listaIdea === "ideasFeed";
  const item = esFeed
    ? { id: idNuevo(), fecha, objetivo: idea.objetivo, formato: idea.formato || "", estado, tema: idea.tema, cta: "", nota: idea.nota || "", ideaId }
    : { id: idNuevo(), fecha, secuencia: idea.secuencia, tema: idea.tema, cta: "Ninguna", estado, nota: idea.nota || "", ideaId };
  const destino = esFeed ? "posts" : "stories";
  return {
    ...doc,
    contenido: {
      ...c,
      [destino]: [...c[destino], item],
      [listaIdea]: c[listaIdea].map((x) => (x.id === ideaId ? { ...x, usada: true } : x)),
    },
  };
}

// ── Importación (p. ej. desde el Excel antiguo, ya convertido a JSON) ──
// Solo añade lo que no está ya (misma clave), así que se puede repetir sin duplicar.
const norm = (s) => String(s || "").trim().toLowerCase();
const CLAVES = {
  posts: (x) => `${x.fecha}|${norm(x.tema)}|${norm(x.formato)}`,
  stories: (x) => `${x.fecha}|${norm(x.secuencia)}|${norm(x.tema)}`,
  ideasFeed: (x) => `${norm(x.objetivo)}|${norm(x.tema)}`,
  ideasStories: (x) => `${norm(x.secuencia)}|${norm(x.tema)}`,
};

export function importarContenido(doc, datos) {
  const c = contenidoDe(doc);
  const resumen = {};
  const nuevo = { ...c };
  for (const lista of LISTAS) {
    const entrantes = Array.isArray(datos?.[lista]) ? datos[lista] : [];
    const claves = new Set(c[lista].map(CLAVES[lista]));
    const aniadir = [];
    for (const x of entrantes) {
      if (!x || typeof x !== "object") continue;
      const k = CLAVES[lista](x);
      if (claves.has(k)) continue;
      claves.add(k);
      aniadir.push({ ...x, id: idNuevo() });
    }
    nuevo[lista] = [...c[lista], ...aniadir];
    resumen[lista] = { nuevos: aniadir.length, ya: entrantes.length - aniadir.length };
  }
  return { doc: { ...doc, contenido: nuevo }, resumen };
}

// ── Calendario mensual ──
// Semanas (lunes → domingo) que cubren el mes `mes` (1-12) de `anio`.
// Cada celda: { iso, dia, delMes }.
export function semanasDelMes(anio, mes) {
  const primero = isoADias(`${anio}-${String(mes).padStart(2, "0")}-01`);
  const sigMes = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, "0")}-01`;
  const ultimo = isoADias(sigMes) - 1;
  const lunes = primero - ((primero + 3) % 7); // día 0 (1-ene-1970) fue jueves
  const semanas = [];
  for (let d = lunes; d <= ultimo; d += 7) {
    semanas.push(
      Array.from({ length: 7 }, (_, i) => {
        const iso = diasAIso(d + i);
        return { iso, dia: Number(iso.slice(8)), delMes: d + i >= primero && d + i <= ultimo };
      })
    );
  }
  return semanas;
}

export function itemsPorDia(items) {
  const m = new Map();
  for (const it of items) {
    if (!it.fecha) continue;
    if (!m.has(it.fecha)) m.set(it.fecha, []);
    m.get(it.fecha).push(it);
  }
  return m;
}

export const esPublicado = (it) => it.estado === "Publicado";

// Resumen para la cabecera de la pestaña.
export function resumenContenido(doc, hoyIso) {
  const c = contenidoDe(doc);
  const mes = hoyIso.slice(0, 7);
  const pendientes = (lista) => lista.filter((x) => x.fecha && x.fecha >= hoyIso && !esPublicado(x) && x.estado !== "Hecha").length;
  return {
    publicadosMes: c.posts.filter((p) => esPublicado(p) && String(p.fecha).startsWith(mes)).length,
    pendientesPosts: pendientes(c.posts),
    pendientesStories: pendientes(c.stories),
    ideasLibresFeed: c.ideasFeed.filter((i) => !i.usada).length,
    ideasLibresStories: c.ideasStories.filter((i) => !i.usada).length,
  };
}

// ═══ Planificación semanal, tablero y avisos ═════════

// "Listo" = ya no hay nada que producir: publicado, o story ya grabada.
export const estaListo = (it) => it.estado === "Publicado" || it.estado === "Hecha";

export const estadosDe = (lista) => (lista === "stories" ? ESTADOS_STORY : ESTADOS_POST);

// Siguiente paso del proceso de producción (null si ya es el último).
export function siguienteEstado(lista, estado) {
  const e = estadosDe(lista);
  const i = e.indexOf(estado);
  return i >= 0 && i < e.length - 1 ? e[i + 1] : null;
}

export function sumarDias(iso, n) {
  return diasAIso(isoADias(iso) + n);
}

// Los 7 días (lunes → domingo) de la semana que contiene `iso`.
export function semanaDe(iso) {
  const d = isoADias(iso);
  const lunes = d - ((d + 3) % 7);
  return Array.from({ length: 7 }, (_, i) => diasAIso(lunes + i));
}

// Pieza nueva con valores por defecto, para altas rápidas y para el formulario.
export function itemPorDefecto(lista, fecha) {
  return lista === "stories"
    ? { fecha, secuencia: "Valor + CTA", tema: "", cta: "Ninguna", estado: "Idear", nota: "" }
    : { fecha, objetivo: "Atraer", formato: "Reel", estado: "Idear", tema: "", cta: "", nota: "" };
}

// Une posts y stories en una sola lista, marcando de cuál viene cada pieza.
export function unirCalendarios(doc, capas = "ambas") {
  const c = contenidoDe(doc);
  return [
    ...(capas !== "stories" ? c.posts.map((x) => ({ ...x, _lista: "posts" })) : []),
    ...(capas !== "posts" ? c.stories.map((x) => ({ ...x, _lista: "stories" })) : []),
  ];
}

// Quita la marca interna antes de guardar o de abrir el formulario.
export function limpio(it) {
  const { _lista, ...resto } = it; // eslint-disable-line no-unused-vars
  return resto;
}

export const VENTANA_HUECOS = 14;

// Días de [hoy, hoy+dias) sin ningún post planificado (las stories no cuentan).
export function huecosSinPost(posts, hoyIso, dias = VENTANA_HUECOS) {
  const con = new Set(posts.filter((p) => p.fecha).map((p) => p.fecha));
  return Array.from({ length: dias }, (_, i) => sumarDias(hoyIso, i)).filter((d) => !con.has(d));
}

// Reparto por categoría (objetivo o secuencia) entre dos fechas, ambas inclusive.
export function equilibrio(items, clave, categorias, desdeIso, hastaIso) {
  const enRango = items.filter((x) => x.fecha && x.fecha >= desdeIso && x.fecha <= hastaIso);
  const total = enRango.length;
  return {
    total,
    categorias: categorias.map((nombre) => {
      const n = enRango.filter((x) => x[clave] === nombre).length;
      return { nombre, n, pct: total ? Math.round((n / total) * 100) : 0 };
    }),
  };
}

export const VENTANA_ATRASADAS = 14;

// Piezas de los últimos 14 días que siguen sin estar listas, de la más antigua a la
// más reciente. Lo anterior a esa ventana se da por olvidado: no es una urgencia.
export function atrasadas(items, hoyIso, dias = VENTANA_ATRASADAS) {
  const desde = sumarDias(hoyIso, -dias);
  return items
    .filter((x) => x.fecha && x.fecha >= desde && x.fecha < hoyIso && !estaListo(x))
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}

// Cuántas piezas más antiguas que esa ventana quedaron sin cerrar (para limpiarlas en el tablero).
export function antiguasSinCerrar(items, hoyIso, dias = VENTANA_ATRASADAS) {
  const desde = sumarDias(hoyIso, -dias);
  return items.filter((x) => x.fecha && x.fecha < desde && !estaListo(x)).length;
}
