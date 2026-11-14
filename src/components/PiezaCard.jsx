// ─── TARJETA DE UNA PIEZA DE CONTENIDO ────────────
// Una fila con barra de color (objetivo o secuencia), título completo, datos y
// el estado como desplegable para avanzarlo sin abrir nada. Sirve para posts y
// stories: `it._lista` dice de cuál viene.

import Icono from "./Icono.jsx";
import { fFecha } from "../lib/fechas.js";
import { guardarItem, colorDe, estadosDe, estaListo } from "../lib/contenido.js";

export function Pastilla({ lista, valor }) {
  if (!valor) return null;
  const [bg, fg] = colorDe(lista, valor);
  return (
    <span className="pill" style={{ background: bg, color: fg }}>
      {valor}
    </span>
  );
}

export function Nota({ texto }) {
  if (!texto) return null;
  if (/^https?:\/\//.test(texto.trim()))
    return (
      <a className="enlace" href={texto.trim()} target="_blank" rel="noreferrer">
        Ver enlace
      </a>
    );
  return <span className="pista">{texto}</span>;
}

export default function PiezaCard({ it, actualizar, onEditar, hoyIso, mostrarFecha = false }) {
  const lista = it._lista;
  const esStory = lista === "stories";
  const clave = esStory ? "secuencia" : "objetivo";
  const [, , acento] = colorDe(lista, it[clave]);
  const atrasada = hoyIso && it.fecha && it.fecha < hoyIso && !estaListo(it);
  const cambiarEstado = (estado) => actualizar((d) => guardarItem(d, lista, { id: it.id, estado }));

  return (
    <div className={`cont-fila ${estaListo(it) ? "pub" : ""} ${atrasada ? "atrasada" : ""}`} style={{ borderLeftColor: acento }}>
      <div className="cont-fila-main">
        <div className="cont-fila-top">
          {esStory && <span className="cont-tipo">Story</span>}
          <strong>{it.tema || it[clave] || "Sin título"}</strong>
        </div>
        <div className="cont-fila-meta">
          {mostrarFecha && <span className="pista">{fFecha(it.fecha)}</span>}
          {atrasada && <span className="pill pill-atraso">Atrasada</span>}
          <Pastilla lista={lista} valor={it[clave]} />
          {!esStory && it.formato && <span className="pill pill-plano">{it.formato}</span>}
          {it.cta && it.cta !== "Ninguna" && <span className="pill pill-plano">CTA: {it.cta}</span>}
          <Nota texto={it.nota} />
        </div>
      </div>
      <select className="campo-input cont-estado" value={it.estado} onChange={(e) => cambiarEstado(e.target.value)}>
        {estadosDe(lista).map((e) => (
          <option key={e}>{e}</option>
        ))}
      </select>
      <button className="mini" onClick={onEditar} title="Editar">
        <Icono nombre="editar" size={15} />
      </button>
    </div>
  );
}
