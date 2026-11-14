// ─── CALENDARIO MENSUAL ───────────────────────────
// Vista de conjunto del mes: rejilla lunes → domingo con posts y stories. Cada
// pieza es una pastilla con el color de su objetivo/secuencia (las stories
// llevan una "S"), ✓ si está lista, y los días futuros sin ningún post llevan
// un punto ámbar. En móvil las pastillas se reducen a puntos de color; el
// detalle del día sale debajo, al pulsarlo.

import { semanasDelMes, itemsPorDia, colorDe, estaListo, sumarDias, VENTANA_HUECOS } from "../lib/contenido.js";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MAX_VISIBLES = 3;

export default function CalendarioMes({ anio, mes, items, capas, seleccionado, hoyIso, onSeleccionar }) {
  const semanas = semanasDelMes(anio, mes);
  const porDia = itemsPorDia(items);
  const limiteHuecos = sumarDias(hoyIso, VENTANA_HUECOS - 1);

  return (
    <div className="cal-mes">
      <div className="cal-cabecera">
        {DIAS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      {semanas.map((sem, i) => (
        <div className="cal-semana" key={i}>
          {sem.map((c) => {
            const delDia = porDia.get(c.iso) || [];
            const hueco =
              capas !== "stories" && c.delMes && c.iso >= hoyIso && c.iso <= limiteHuecos && !delDia.some((x) => x._lista === "posts");
            return (
              <button
                key={c.iso}
                className={`cal-dia ${c.delMes ? "" : "fuera"} ${c.iso === hoyIso ? "hoy" : ""} ${c.iso === seleccionado ? "sel" : ""}`}
                onClick={() => onSeleccionar(c.iso)}
              >
                <span className="cal-num">
                  {c.dia}
                  {hueco && <i className="cal-hueco" title="Sin post planificado" />}
                </span>
                <span className="cal-items">
                  {delDia.slice(0, MAX_VISIBLES).map((it) => {
                    const esStory = it._lista === "stories";
                    const [bg, fg, acento] = colorDe(it._lista, it[esStory ? "secuencia" : "objetivo"]);
                    const titulo = it.tema || it.objetivo || it.secuencia || "Sin título";
                    return (
                      <span
                        key={it.id}
                        className={`cal-pastilla ${estaListo(it) ? "pub" : ""} ${esStory ? "story" : ""}`}
                        style={{ background: bg, color: fg, borderLeftColor: acento }}
                        title={`${esStory ? "Story" : "Post"} · ${titulo} · ${it.estado}`}
                      >
                        <i className="cal-punto" style={{ background: acento }} />
                        <span className="cal-txt">
                          {estaListo(it) ? "✓ " : ""}
                          {esStory ? "S · " : ""}
                          {titulo}
                        </span>
                      </span>
                    );
                  })}
                  {delDia.length > MAX_VISIBLES && <span className="cal-mas">+{delDia.length - MAX_VISIBLES}</span>}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
