// ─── TABLERO DE PRODUCCIÓN ────────────────────────
// Una columna por estado (Idear → … → Publicado) para ver qué está parado en
// cada paso. Cada tarjeta avanza al siguiente estado con un botón. La columna
// de lo ya terminado va plegada para no hacer ruido.

import { useState } from "react";
import { Boton } from "./ui.jsx";
import { Pastilla } from "./PiezaCard.jsx";
import { fFechaCorta } from "../lib/fechas.js";
import { guardarItem, estadosDe, siguienteEstado, estaListo, colorDe, sumarDias } from "../lib/contenido.js";

const MAX_TERMINADAS = 8;
const DIAS_ANTIGUA = 30;

function Tarjeta({ lista, it, hoyIso, actualizar, onEditar }) {
  const clave = lista === "stories" ? "secuencia" : "objetivo";
  const [, , acento] = colorDe(lista, it[clave]);
  const sig = siguienteEstado(lista, it.estado);
  const atrasada = it.fecha && it.fecha < hoyIso && !estaListo(it);
  return (
    <div className={`tb-tarjeta ${atrasada ? "atrasada" : ""}`} style={{ borderLeftColor: acento }}>
      <button className="tb-titulo" onClick={onEditar}>
        {it.tema || it[clave] || "Sin título"}
      </button>
      <div className="cont-fila-meta">
        <span className={`pista ${atrasada ? "t-atraso" : ""}`}>{fFechaCorta(it.fecha)}</span>
        <Pastilla lista={lista} valor={it[clave]} />
        {lista === "posts" && it.formato && <span className="pill pill-plano">{it.formato}</span>}
      </div>
      {sig && (
        <Boton onClick={() => actualizar((d) => guardarItem(d, lista, { id: it.id, estado: sig }))}>
          → {sig}
        </Boton>
      )}
    </div>
  );
}

export default function Tablero({ doc, actualizar, hoyIso, onEditar }) {
  const [lista, setLista] = useState("posts");
  const [verTerminadas, setVerTerminadas] = useState(false);
  const [verAntiguas, setVerAntiguas] = useState(false);
  const items = doc.contenido?.[lista] || [];
  const estados = estadosDe(lista);
  const final = estados[estados.length - 1];
  const activos = estados.slice(0, -1);

  const limite = sumarDias(hoyIso, -DIAS_ANTIGUA);
  const esAntigua = (x) => x.fecha && x.fecha < limite && !estaListo(x);
  const nAntiguas = items.filter(esAntigua).length;

  const enColumna = (e) =>
    items.filter((x) => x.estado === e && (verAntiguas || !esAntigua(x))).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const terminadas = enColumna(final).reverse(); // las más recientes primero

  return (
    <div>
      <div className="barra-superior">
        <div className="chips">
          {[["posts", "Posts"], ["stories", "Stories"]].map(([id, t]) => (
            <button key={id} className={`chip ${lista === id ? "activo" : ""}`} onClick={() => setLista(id)}>
              {t}
            </button>
          ))}
        </div>
        <span className="pista" style={{ marginLeft: "auto" }}>Pasa cada pieza al siguiente paso con el botón de la tarjeta.</span>
        {nAntiguas > 0 && (
          <Boton onClick={() => setVerAntiguas((v) => !v)}>
            {verAntiguas ? "Ocultar las de hace más de 30 días" : `Hay ${nAntiguas} de hace más de 30 días sin cerrar · Mostrar`}
          </Boton>
        )}
      </div>

      <div className="tb-tablero">
        {activos.map((e) => {
          const col = enColumna(e);
          return (
            <section key={e} className="tb-col">
              <h4 className="tb-col-cab">
                {e} <span className="cuenta">{col.length}</span>
              </h4>
              {col.length === 0 ? (
                <div className="tb-vacio">Nada aquí</div>
              ) : (
                col.map((it) => (
                  <Tarjeta key={it.id} lista={lista} it={it} hoyIso={hoyIso} actualizar={actualizar} onEditar={() => onEditar({ ...it, _lista: lista })} />
                ))
              )}
            </section>
          );
        })}
      </div>

      <section className="bloque" style={{ marginTop: 14 }}>
        <h3 className="bloque-titulo">
          {final} <span className="cuenta">{terminadas.length}</span>
          <Boton style={{ marginLeft: "auto" }} onClick={() => setVerTerminadas((v) => !v)}>
            {verTerminadas ? "Ocultar" : "Mostrar las últimas"}
          </Boton>
        </h3>
        {verTerminadas ? (
          <div className="tb-terminadas">
            {terminadas.slice(0, MAX_TERMINADAS).map((it) => (
              <Tarjeta key={it.id} lista={lista} it={it} hoyIso={hoyIso} actualizar={actualizar} onEditar={() => onEditar({ ...it, _lista: lista })} />
            ))}
            {terminadas.length > MAX_TERMINADAS && <div className="pista">Hay {terminadas.length - MAX_TERMINADAS} más; verlas en la vista Lista de Planificar.</div>}
          </div>
        ) : (
          <div className="pista">Plegado para no hacer ruido.</div>
        )}
      </section>
    </div>
  );
}
