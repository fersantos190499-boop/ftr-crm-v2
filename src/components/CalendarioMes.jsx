// ─── CALENDARIO MENSUAL ───────────────────────────
// Rejilla lunes → domingo. En cada día, una pastilla por pieza de contenido,
// con el color de su objetivo/secuencia y un ✓ si ya está publicada. En móvil
// las pastillas se reducen a puntos de color (el detalle sale debajo, al
// pulsar el día).

import { semanasDelMes, itemsPorDia, colorDe, esPublicado } from "../lib/contenido.js";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MAX_VISIBLES = 3;

function etiqueta(lista, it) {
  return it.tema || it.objetivo || it.secuencia || "Sin título";
}

export default function CalendarioMes({ lista, anio, mes, items, seleccionado, hoyIso, onSeleccionar }) {
  const semanas = semanasDelMes(anio, mes);
  const porDia = itemsPorDia(items);
  const clave = lista === "stories" ? "secuencia" : "objetivo";

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
            return (
              <button
                key={c.iso}
                className={`cal-dia ${c.delMes ? "" : "fuera"} ${c.iso === hoyIso ? "hoy" : ""} ${c.iso === seleccionado ? "sel" : ""}`}
                onClick={() => onSeleccionar(c.iso)}
              >
                <span className="cal-num">{c.dia}</span>
                <span className="cal-items">
                  {delDia.slice(0, MAX_VISIBLES).map((it) => {
                    const [bg, fg, acento] = colorDe(lista, it[clave]);
                    return (
                      <span
                        key={it.id}
                        className={`cal-pastilla ${esPublicado(it) ? "pub" : ""}`}
                        style={{ background: bg, color: fg, borderLeftColor: acento }}
                        title={`${etiqueta(lista, it)} · ${it.estado}`}
                      >
                        <i className="cal-punto" style={{ background: acento }} />
                        <span className="cal-txt">
                          {esPublicado(it) ? "✓ " : ""}
                          {etiqueta(lista, it)}
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
