// ─── ALTA RÁPIDA ──────────────────────────────────
// Para un día concreto: se escribe el tema y se pulsa Enter. Lo demás son
// valores por defecto que se pueden cambiar después (o desde "Más opciones").

import { useState } from "react";
import { Boton } from "./ui.jsx";
import { guardarItem, itemPorDefecto, OBJETIVOS, FORMATOS, SECUENCIAS } from "../lib/contenido.js";

export default function AnadirRapido({ lista, fecha, actualizar, onMasOpciones, onCerrar }) {
  const esStory = lista === "stories";
  const [tema, setTema] = useState("");
  const [tipo, setTipo] = useState(esStory ? "Valor + CTA" : "Atraer");
  const [formato, setFormato] = useState("Reel");

  const base = () => ({
    ...itemPorDefecto(lista, fecha),
    tema: tema.trim(),
    ...(esStory ? { secuencia: tipo } : { objetivo: tipo, formato }),
  });
  const guardar = () => {
    if (!tema.trim()) return;
    actualizar((d) => guardarItem(d, lista, base()));
    onCerrar();
  };

  return (
    <div className="rapido">
      <input
        className="campo-input"
        autoFocus
        placeholder={esStory ? "Tema / ángulo de la story…" : "Tema o idea del post…"}
        value={tema}
        onChange={(e) => setTema(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") guardar();
          if (e.key === "Escape") onCerrar();
        }}
      />
      <select className="campo-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        {(esStory ? SECUENCIAS : OBJETIVOS).map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      {!esStory && (
        <select className="campo-input" value={formato} onChange={(e) => setFormato(e.target.value)}>
          {FORMATOS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      )}
      <Boton variante="primario" onClick={guardar} disabled={!tema.trim()}>
        Añadir
      </Boton>
      <Boton onClick={() => onMasOpciones({ ...base() })}>Más opciones</Boton>
      <Boton onClick={onCerrar}>✕</Boton>
    </div>
  );
}
