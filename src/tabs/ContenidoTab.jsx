// ─── PESTAÑA CONTENIDO ────────────────────────────
// Planificación de posts (feed) y stories con vista de calendario o lista, y
// un banco de ideas para cada uno. Sustituye al Excel de contenido.

import { useMemo, useRef, useState } from "react";
import { Boton, Aviso } from "../components/ui.jsx";
import Icono from "../components/Icono.jsx";
import CalendarioMes from "../components/CalendarioMes.jsx";
import ContenidoForm from "../forms/ContenidoForm.jsx";
import { fFecha } from "../lib/fechas.js";
import {
  LISTAS, normalizaContenido, guardarItem, pasarIdeaAlCalendario, importarContenido, resumenContenido, colorDe, esPublicado,
  OBJETIVOS, SECUENCIAS_IDEA, ESTADOS_POST, ESTADOS_STORY, SECUENCIAS,
} from "../lib/contenido.js";

const hoyIso = () => new Date().toISOString().slice(0, 10);
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function Pastilla({ lista, valor }) {
  if (!valor) return null;
  const [bg, fg] = colorDe(lista, valor);
  return (
    <span className="pill" style={{ background: bg, color: fg }}>
      {valor}
    </span>
  );
}

function Nota({ texto }) {
  if (!texto) return null;
  if (/^https?:\/\//.test(texto.trim()))
    return (
      <a className="enlace" href={texto.trim()} target="_blank" rel="noreferrer">
        Ver enlace
      </a>
    );
  return <span className="pista">{texto}</span>;
}

// Fila de una pieza del calendario (la del día seleccionado y la de la lista).
function FilaPieza({ lista, it, actualizar, onEditar }) {
  const estados = lista === "posts" ? ESTADOS_POST : ESTADOS_STORY;
  const clave = lista === "posts" ? "objetivo" : "secuencia";
  const [, , acento] = colorDe(lista, it[clave]);
  const cambiarEstado = (estado) => actualizar((d) => guardarItem(d, lista, { ...it, estado }));
  return (
    <div className={`cont-fila ${esPublicado(it) ? "pub" : ""}`} style={{ borderLeftColor: acento }}>
      <div className="cont-fila-main">
        <div className="cont-fila-top">
          <strong>{it.tema || it[clave] || "Sin título"}</strong>
        </div>
        <div className="cont-fila-meta">
          <span className="pista">{fFecha(it.fecha)}</span>
          <Pastilla lista={lista} valor={it[clave]} />
          {lista === "posts" && it.formato && <span className="pill pill-plano">{it.formato}</span>}
          {it.cta && it.cta !== "Ninguna" && <span className="pill pill-plano">CTA: {it.cta}</span>}
          <Nota texto={it.nota} />
        </div>
      </div>
      <select className="campo-input cont-estado" value={it.estado} onChange={(e) => cambiarEstado(e.target.value)}>
        {estados.map((e) => (
          <option key={e}>{e}</option>
        ))}
      </select>
      <button className="mini" onClick={onEditar} title="Editar">
        <Icono nombre="editar" size={15} />
      </button>
    </div>
  );
}

// ── Calendarios (posts / stories) ──────────────────
function Calendarios({ doc, actualizar, lista }) {
  const hoy = hoyIso();
  const [vista, setVista] = useState("calendario");
  const [ym, setYm] = useState({ anio: Number(hoy.slice(0, 4)), mes: Number(hoy.slice(5, 7)) });
  const [sel, setSel] = useState(hoy);
  const [form, setForm] = useState(null);
  const [filtro, setFiltro] = useState("pendientes");
  const [tipo, setTipo] = useState("todos");

  const items = normalizaContenido(doc.contenido)[lista];
  const clave = lista === "posts" ? "objetivo" : "secuencia";
  const tipos = lista === "posts" ? OBJETIVOS : SECUENCIAS;

  const mover = (delta) =>
    setYm(({ anio, mes }) => {
      const t = anio * 12 + (mes - 1) + delta;
      return { anio: Math.floor(t / 12), mes: (t % 12) + 1 };
    });
  const irAHoy = () => {
    setYm({ anio: Number(hoy.slice(0, 4)), mes: Number(hoy.slice(5, 7)) });
    setSel(hoy);
  };

  const delDia = items.filter((x) => x.fecha === sel);
  const lisa = useMemo(() => {
    const f = items.filter(
      (x) =>
        (tipo === "todos" || x[clave] === tipo) &&
        (filtro === "todos" || (filtro === "publicados" ? esPublicado(x) : !esPublicado(x)))
    );
    const asc = filtro !== "publicados";
    return f.slice().sort((a, b) => (asc ? 1 : -1) * String(a.fecha).localeCompare(String(b.fecha)));
  }, [items, filtro, tipo, clave]);

  return (
    <div>
      <div className="barra-superior">
        <div className="chips">
          {[["calendario", "Calendario"], ["lista", "Lista"]].map(([id, t]) => (
            <button key={id} className={`chip ${vista === id ? "activo" : ""}`} onClick={() => setVista(id)}>
              {t}
            </button>
          ))}
        </div>
        <Boton variante="primario" style={{ marginLeft: "auto" }} onClick={() => setForm({ fecha: vista === "calendario" ? sel : hoy })}>
          + {lista === "posts" ? "Nuevo post" : "Nueva story"}
        </Boton>
      </div>

      {vista === "calendario" ? (
        <>
          <div className="cal-nav">
            <button className="mini" onClick={() => mover(-1)} aria-label="Mes anterior">‹</button>
            <strong className="cal-titulo">{MESES[ym.mes - 1]} {ym.anio}</strong>
            <button className="mini" onClick={() => mover(1)} aria-label="Mes siguiente">›</button>
            <Boton style={{ marginLeft: "auto" }} onClick={irAHoy}>Hoy</Boton>
          </div>
          <CalendarioMes lista={lista} anio={ym.anio} mes={ym.mes} items={items} seleccionado={sel} hoyIso={hoy} onSeleccionar={setSel} />

          <section className="bloque" style={{ marginTop: 14 }}>
            <h3 className="bloque-titulo">
              {fFecha(sel)}
              <Boton style={{ marginLeft: "auto" }} onClick={() => setForm({ fecha: sel })}>+ Añadir este día</Boton>
            </h3>
            {delDia.length === 0 ? (
              <div className="pista">Nada planificado este día.</div>
            ) : (
              <div className="cont-lista">
                {delDia.map((it) => (
                  <FilaPieza key={it.id} lista={lista} it={it} actualizar={actualizar} onEditar={() => setForm({ item: it })} />
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="tarjeta filtros-cobros">
            <div className="chips">
              {[["pendientes", "Por hacer"], ["publicados", "Publicado"], ["todos", "Todos"]].map(([id, t]) => (
                <button key={id} className={`chip ${filtro === id ? "activo" : ""}`} onClick={() => setFiltro(id)}>
                  {t}
                </button>
              ))}
            </div>
            <select className="campo-input" style={{ maxWidth: 200 }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="todos">{lista === "posts" ? "Todos los objetivos" : "Todas las secuencias"}</option>
              {tipos.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <span className="pista" style={{ marginLeft: "auto" }}>{lisa.length} pieza{lisa.length === 1 ? "" : "s"}</span>
          </div>
          {lisa.length === 0 ? (
            <div className="vacio">
              <Icono nombre="semana" size={42} className="ico-vacio" />
              <p>No hay nada con este filtro.</p>
            </div>
          ) : (
            <div className="cont-lista">
              {lisa.map((it) => (
                <FilaPieza key={it.id} lista={lista} it={it} actualizar={actualizar} onEditar={() => setForm({ item: it })} />
              ))}
            </div>
          )}
        </>
      )}

      {form && <ContenidoForm lista={lista} item={form.item} fecha={form.fecha} actualizar={actualizar} onCerrar={() => setForm(null)} />}
    </div>
  );
}

// ── Banco de ideas ─────────────────────────────────
function Ideas({ doc, actualizar }) {
  const [tipo, setTipo] = useState("feed");
  const [ocultarUsadas, setOcultarUsadas] = useState(true);
  const [form, setForm] = useState(null); // { item?, fecha? (= sección) }
  const [pasar, setPasar] = useState(null); // idea que se pasa al calendario
  const [fechaPasar, setFechaPasar] = useState(hoyIso());

  const lista = tipo === "feed" ? "ideasFeed" : "ideasStories";
  const clave = tipo === "feed" ? "objetivo" : "secuencia";
  const secciones = tipo === "feed" ? OBJETIVOS : SECUENCIAS_IDEA;
  const ideas = normalizaContenido(doc.contenido)[lista];

  const alternarUsada = (it) => actualizar((d) => guardarItem(d, lista, { ...it, usada: !it.usada }));
  const confirmarPasar = () => {
    actualizar((d) => pasarIdeaAlCalendario(d, lista, pasar.id, { fecha: fechaPasar }));
    setPasar(null);
  };

  return (
    <div>
      <div className="barra-superior">
        <div className="chips">
          {[["feed", "Feed"], ["stories", "Stories"]].map(([id, t]) => (
            <button key={id} className={`chip ${tipo === id ? "activo" : ""}`} onClick={() => setTipo(id)}>
              {t}
            </button>
          ))}
        </div>
        <label className="cont-oculta">
          <input type="checkbox" checked={ocultarUsadas} onChange={(e) => setOcultarUsadas(e.target.checked)} /> Ocultar usadas
        </label>
      </div>

      {secciones.map((sec) => {
        const todas = ideas.filter((i) => i[clave] === sec);
        const libres = todas.filter((i) => !i.usada).length;
        const visibles = ocultarUsadas ? todas.filter((i) => !i.usada) : todas;
        const [bg, fg, acento] = colorDe(lista, sec);
        return (
          <section className="bloque" key={sec}>
            <h3 className="bloque-titulo">
              <span className="cont-sec-punto" style={{ background: acento }} />
              <span style={{ color: fg }}>{sec}</span>
              <span className="cuenta" style={{ background: bg, color: fg }}>{libres} libres</span>
              <Boton style={{ marginLeft: "auto" }} onClick={() => setForm({ fecha: sec })}>+ Idea</Boton>
            </h3>
            {visibles.length === 0 ? (
              <div className="pista">{todas.length ? "Todas las ideas de esta sección están usadas." : "Aún no hay ideas aquí."}</div>
            ) : (
              <div className="cont-lista">
                {visibles.map((it) => (
                  <div className={`cont-fila ${it.usada ? "pub" : ""}`} key={it.id} style={{ borderLeftColor: acento }}>
                    <div className="cont-fila-main">
                      <div className="cont-fila-top">
                        <strong>{it.tema}</strong>
                      </div>
                      <div className="cont-fila-meta">
                        {tipo === "feed" && it.formato && <span className="pill pill-plano">{it.formato}</span>}
                        <Nota texto={it.nota} />
                      </div>
                    </div>
                    {!it.usada && (
                      <Boton onClick={() => { setPasar(it); setFechaPasar(hoyIso()); }}>→ Calendario</Boton>
                    )}
                    <button className="mini" onClick={() => alternarUsada(it)} title={it.usada ? "Marcar como no usada" : "Marcar como usada"}>
                      <Icono nombre="check" size={15} />
                    </button>
                    <button className="mini" onClick={() => setForm({ item: it })} title="Editar">
                      <Icono nombre="editar" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {pasar && (
        <div className="modal-fondo" onClick={() => setPasar(null)}>
          <div className="modal-caja" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-cabecera">
              <div>
                <div className="modal-titulo">Pasar al calendario</div>
                <div className="modal-subtitulo">{pasar.tema}</div>
              </div>
            </div>
            <label className="campo">
              <span className="campo-label">¿Para qué día?</span>
              <input className="campo-input" type="date" value={fechaPasar} onChange={(e) => setFechaPasar(e.target.value)} />
            </label>
            <div className="modal-acciones">
              <Boton variante="primario" onClick={confirmarPasar} disabled={!fechaPasar}>Pasar al calendario</Boton>
              <Boton onClick={() => setPasar(null)}>Cancelar</Boton>
            </div>
          </div>
        </div>
      )}
      {form && <ContenidoForm lista={lista} item={form.item} fecha={form.fecha} actualizar={actualizar} onCerrar={() => setForm(null)} />}
    </div>
  );
}

export default function ContenidoTab({ doc, actualizar }) {
  const [seccion, setSeccion] = useState("posts");
  const [aviso, setAviso] = useState(null);
  const inputFichero = useRef(null);
  const r = resumenContenido(doc, hoyIso());
  const c = normalizaContenido(doc.contenido);
  const vacio = LISTAS.every((k) => c[k].length === 0);

  const alImportar = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const lector = new FileReader();
    lector.onload = (ev) => {
      let datos;
      try {
        datos = JSON.parse(String(ev.target.result));
      } catch {
        return setAviso({ tono: "error", txt: "El archivo no es un JSON válido." });
      }
      const hay = LISTAS.reduce((s, k) => s + (Array.isArray(datos?.[k]) ? datos[k].length : 0), 0);
      if (!hay) return setAviso({ tono: "error", txt: "No he encontrado contenido en ese archivo." });
      if (!window.confirm(`Se van a importar hasta ${hay} elementos (posts, stories e ideas). Lo que ya esté no se duplica. ¿Continuar?`)) return;
      actualizar((d) => importarContenido(d, datos).doc);
      setAviso({ tono: "ok", txt: "Contenido importado. Puedes repetir la importación sin miedo: no duplica." });
    };
    lector.readAsText(f);
  };

  return (
    <div>
      <div className="stats-grid">
        <div className="stat"><div className="stat-valor">{r.publicadosMes}</div><div className="stat-etiqueta">Posts publicados este mes</div></div>
        <div className="stat stat-violeta"><div className="stat-valor">{r.pendientesPosts}</div><div className="stat-etiqueta">Posts por publicar</div></div>
        <div className="stat stat-verde"><div className="stat-valor">{r.pendientesStories}</div><div className="stat-etiqueta">Stories por publicar</div></div>
        <div className="stat stat-ambar"><div className="stat-valor">{r.ideasLibresFeed + r.ideasLibresStories}</div><div className="stat-etiqueta">Ideas sin usar</div></div>
      </div>

      <div className="barra-superior">
        <div className="chips">
          {[["posts", "Posts"], ["stories", "Stories"], ["ideas", "Banco de ideas"]].map(([id, t]) => (
            <button key={id} className={`chip ${seccion === id ? "activo" : ""}`} onClick={() => setSeccion(id)}>
              {t}
            </button>
          ))}
        </div>
        <Boton style={{ marginLeft: "auto" }} onClick={() => inputFichero.current?.click()}>
          <Icono nombre="importar" size={15} /> Importar
        </Boton>
        <input ref={inputFichero} type="file" accept=".json" hidden onChange={alImportar} />
      </div>

      {aviso && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono={aviso.tono}>{aviso.txt}</Aviso>
        </div>
      )}
      {vacio && (
        <div style={{ marginBottom: 12 }}>
          <Aviso tono="info">
            Aún no hay contenido. Añade tu primera pieza o importa tu Excel antiguo (ya convertido) con el botón «Importar».
          </Aviso>
        </div>
      )}

      {seccion === "ideas" ? (
        <Ideas doc={doc} actualizar={actualizar} />
      ) : (
        <Calendarios key={seccion} doc={doc} actualizar={actualizar} lista={seccion} />
      )}
    </div>
  );
}

