// ─── PANEL "HOY" ──────────────────────────────────
// Lo que toca hoy y lo que se quedó atrás sin terminar.

import PiezaCard from "./PiezaCard.jsx";
import { Boton } from "./ui.jsx";
import { fFecha } from "../lib/fechas.js";
import { atrasadas, antiguasSinCerrar } from "../lib/contenido.js";

const MAX_ATRASADAS = 4;

export default function PanelHoy({ items, hoyIso, actualizar, onEditar, onNuevo }) {
  const deHoy = items.filter((x) => x.fecha === hoyIso);
  const tarde = atrasadas(items, hoyIso);
  const antiguas = antiguasSinCerrar(items, hoyIso);

  return (
    <section className="bloque pl-hoy-panel">
      <h3 className="bloque-titulo">
        Hoy · {fFecha(hoyIso)}
        {tarde.length > 0 && <span className="cuenta cuenta-alerta">{tarde.length} atrasada{tarde.length === 1 ? "" : "s"}</span>}
        <Boton style={{ marginLeft: "auto" }} onClick={() => onNuevo(hoyIso)}>+ Añadir hoy</Boton>
      </h3>

      {deHoy.length === 0 ? (
        <div className="pista">Nada planificado para hoy.</div>
      ) : (
        <div className="cont-lista">
          {deHoy.map((it) => (
            <PiezaCard key={it.id} it={it} hoyIso={hoyIso} actualizar={actualizar} onEditar={() => onEditar(it)} />
          ))}
        </div>
      )}

      {antiguas > 0 && (
        <div className="pista" style={{ marginTop: 10 }}>
          Hay {antiguas} pieza{antiguas === 1 ? "" : "s"} más antigua{antiguas === 1 ? "" : "s"} sin cerrar (de hace más de 2 semanas). Límpialas en el Tablero.
        </div>
      )}

      {tarde.length > 0 && (
        <>
          <div className="pl-sub">Se quedó atrás</div>
          <div className="cont-lista">
            {tarde.slice(0, MAX_ATRASADAS).map((it) => (
              <PiezaCard key={it.id} it={it} hoyIso={hoyIso} mostrarFecha actualizar={actualizar} onEditar={() => onEditar(it)} />
            ))}
          </div>
          {tarde.length > MAX_ATRASADAS && <div className="pista" style={{ marginTop: 6 }}>y {tarde.length - MAX_ATRASADAS} más (míralas en el Tablero)…</div>}
        </>
      )}
    </section>
  );
}
