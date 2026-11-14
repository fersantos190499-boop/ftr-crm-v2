// ─── FORMULARIO DE CONTENIDO ──────────────────────
// Un mismo modal para un post, una story o una idea de cualquiera de los dos
// bancos. `lista` decide qué campos salen.

import { useState } from "react";
import { Modal, Campo, Selector, Interruptor, TextArea, Boton, Aviso } from "../components/ui.jsx";
import { guardarItem, borrarItem, itemPorDefecto, OBJETIVOS, FORMATOS, FORMATOS_IDEA, ESTADOS_POST, CTA_POST, SECUENCIAS, SECUENCIAS_IDEA, ESTADOS_STORY, CTA_STORY } from "../lib/contenido.js";

const hoyIso = () => new Date().toISOString().slice(0, 10);
const sinValor = (txt) => [{ v: "", l: txt }];

const TITULOS = { posts: "post", stories: "story", ideasFeed: "idea de feed", ideasStories: "idea de stories" };

function inicial(lista, item, fecha) {
  if (item) return { ...item };
  switch (lista) {
    case "posts":
    case "stories":
      return itemPorDefecto(lista, fecha || hoyIso());
    case "ideasFeed":
      return { objetivo: fecha || "Atraer", formato: "Reel", tema: "", nota: "", usada: false };
    default:
      return { secuencia: fecha || "Valor + CTA", tema: "", nota: "", usada: false };
  }
}

// `fecha` sirve de valor inicial: fecha del día en los calendarios y
// objetivo/secuencia en los bancos de ideas (se abre ya en su sección).
export default function ContenidoForm({ lista, item, fecha, actualizar, onCerrar }) {
  const [f, setF] = useState(() => inicial(lista, item, fecha));
  const [error, setError] = useState("");
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const esCalendario = lista === "posts" || lista === "stories";
  const nuevo = !item?.id;

  const guardar = () => {
    if (esCalendario && !f.fecha) return setError("La fecha es obligatoria.");
    if (!esCalendario && !String(f.tema || "").trim()) return setError("Escribe la idea.");
    if (lista === "posts" && !String(f.tema || "").trim() && !f.objetivo) return setError("Pon al menos un tema o un objetivo.");
    actualizar((d) => guardarItem(d, lista, { ...f, tema: String(f.tema || "").trim() }));
    onCerrar();
  };

  const eliminar = () => {
    if (!window.confirm("¿Eliminar esto? No se puede deshacer.")) return;
    actualizar((d) => borrarItem(d, lista, item.id));
    onCerrar();
  };

  return (
    <Modal titulo={`${nuevo ? "Nueva" : "Editar"} ${TITULOS[lista]}`} onCerrar={onCerrar} ancho={520}>
      <div className="form-grid">
        {esCalendario && <Campo label="Fecha *" type="date" value={f.fecha} onChange={set("fecha")} />}
        {lista === "posts" && (
          <>
            <Selector label="Estado" value={f.estado} onChange={set("estado")} opciones={ESTADOS_POST} />
            <Selector label="Objetivo" value={f.objetivo} onChange={set("objetivo")} opciones={OBJETIVOS} />
            <Selector label="Formato" value={f.formato} onChange={set("formato")} opciones={[...sinValor("—"), ...FORMATOS]} />
            <Campo label="Tema / Idea" value={f.tema} onChange={set("tema")} ancho={2} />
            <Selector label="CTA" value={f.cta} onChange={set("cta")} opciones={[...sinValor("Sin CTA"), ...CTA_POST]} />
          </>
        )}
        {lista === "stories" && (
          <>
            <Selector label="Estado" value={f.estado} onChange={set("estado")} opciones={ESTADOS_STORY} />
            <Selector label="Secuencia" value={f.secuencia} onChange={set("secuencia")} opciones={SECUENCIAS} />
            <Selector label="CTA" value={f.cta} onChange={set("cta")} opciones={CTA_STORY} />
            <Campo label="Tema / Ángulo" value={f.tema} onChange={set("tema")} ancho={2} />
          </>
        )}
        {lista === "ideasFeed" && (
          <>
            <Selector label="Objetivo" value={f.objetivo} onChange={set("objetivo")} opciones={OBJETIVOS} />
            <Selector label="Formato sugerido" value={f.formato} onChange={set("formato")} opciones={[...sinValor("—"), ...FORMATOS_IDEA]} />
            <Campo label="Idea / Tema *" value={f.tema} onChange={set("tema")} ancho={2} />
          </>
        )}
        {lista === "ideasStories" && (
          <>
            <Selector label="Secuencia" value={f.secuencia} onChange={set("secuencia")} opciones={SECUENCIAS_IDEA} ancho={2} />
            <Campo label="Idea / Objeción *" value={f.tema} onChange={set("tema")} ancho={2} />
          </>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <TextArea
            label={esCalendario ? "Nota" : "Notas / ángulo / enlace"}
            value={f.nota}
            onChange={set("nota")}
            filas={3}
          />
        </div>
        {!esCalendario && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Interruptor label="Ya usada" checked={f.usada} onChange={set("usada")} />
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 12 }}>
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      <div className="modal-acciones">
        <Boton variante="primario" onClick={guardar}>
          Guardar
        </Boton>
        <Boton onClick={onCerrar}>Cancelar</Boton>
        {!nuevo && (
          <Boton variante="peligro" style={{ marginLeft: "auto" }} onClick={eliminar}>
            Eliminar
          </Boton>
        )}
      </div>
    </Modal>
  );
}
