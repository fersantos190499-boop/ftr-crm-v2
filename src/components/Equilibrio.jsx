// ─── EQUILIBRIO DEL CONTENIDO ─────────────────────
// Reparto por objetivo (posts) y por secuencia (stories): los últimos 30 días
// como barra apilada y lo que lleva la semana que estás mirando. Avisa de lo
// que casi no aparece.

import { equilibrio, colorDe, OBJETIVOS, SECUENCIAS, sumarDias } from "../lib/contenido.js";

const VENTANA = 30;
const POCO = 10; // por debajo de este % (con algo de actividad) se avisa

function Fila({ titulo, lista, items, clave, categorias, hoyIso, semana }) {
  const mes = equilibrio(items, clave, categorias, sumarDias(hoyIso, -(VENTANA - 1)), hoyIso);
  const sem = equilibrio(items, clave, categorias, semana[0], semana[6]);
  const faltan = mes.total >= 8 ? mes.categorias.filter((c) => c.pct < POCO) : [];

  return (
    <div className="eq-fila">
      <div className="eq-cab">
        <strong>{titulo}</strong>
        <span className="pista">últimos {VENTANA} días · {mes.total} pieza{mes.total === 1 ? "" : "s"}</span>
      </div>
      {mes.total === 0 ? (
        <div className="pista">Aún no hay piezas en este periodo.</div>
      ) : (
        <div className="eq-barra" role="img" aria-label={`Reparto de ${titulo}`}>
          {mes.categorias
            .filter((c) => c.n > 0)
            .map((c) => (
              <div key={c.nombre} className="eq-seg" style={{ flexGrow: c.n, background: colorDe(lista, c.nombre)[2] }} title={`${c.nombre}: ${c.n} (${c.pct}%)`}>
                {c.pct >= 12 ? `${c.pct}%` : ""}
              </div>
            ))}
        </div>
      )}
      <div className="eq-leyenda">
        {mes.categorias.map((c) => {
          const [bg, fg, acento] = colorDe(lista, c.nombre);
          const s = sem.categorias.find((x) => x.nombre === c.nombre);
          return (
            <span key={c.nombre} className="eq-item" style={{ background: bg, color: fg }}>
              <i style={{ background: acento }} />
              {c.nombre} <b>{c.n}</b>
              <small> · esta semana {s.n}</small>
            </span>
          );
        })}
      </div>
      {faltan.length > 0 && (
        <div className="eq-aviso">
          Casi no aparece: {faltan.map((c) => `${c.nombre} (${c.pct}%)`).join(", ")}.
        </div>
      )}
    </div>
  );
}

export default function Equilibrio({ posts, stories, hoyIso, semana, capas }) {
  return (
    <section className="bloque">
      <h3 className="bloque-titulo">Equilibrio del contenido</h3>
      {capas !== "stories" && (
        <Fila titulo="Posts por objetivo" lista="posts" items={posts} clave="objetivo" categorias={OBJETIVOS} hoyIso={hoyIso} semana={semana} />
      )}
      {capas !== "posts" && (
        <Fila titulo="Stories por secuencia" lista="stories" items={stories} clave="secuencia" categorias={SECUENCIAS} hoyIso={hoyIso} semana={semana} />
      )}
    </section>
  );
}
