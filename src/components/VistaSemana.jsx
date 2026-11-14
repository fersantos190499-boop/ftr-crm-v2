// ─── VISTA DE SEMANA ──────────────────────────────
// Una fila por día, con post y stories juntos y los títulos completos. Los
// días futuros sin ningún post se marcan en ámbar para ver los huecos.

import { useState } from "react";
import PiezaCard from "./PiezaCard.jsx";
import AnadirRapido from "./AnadirRapido.jsx";
import { Boton } from "./ui.jsx";
import { sumarDias, VENTANA_HUECOS } from "../lib/contenido.js";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default function VistaSemana({ dias, items, hoyIso, capas, actualizar, onEditar, onFormulario }) {
  const [rapido, setRapido] = useState(null); // { fecha, lista }
  const limiteHuecos = sumarDias(hoyIso, VENTANA_HUECOS - 1);

  return (
    <div className="pl-semana">
      {dias.map((iso, i) => {
        const delDia = items.filter((x) => x.fecha === iso);
        const posts = delDia.filter((x) => x._lista === "posts");
        const stories = delDia.filter((x) => x._lista === "stories");
        const esHoy = iso === hoyIso;
        const hueco = capas !== "stories" && iso >= hoyIso && iso <= limiteHuecos && posts.length === 0;
        return (
          <div key={iso} className={`pl-dia ${esHoy ? "hoy" : ""} ${iso < hoyIso ? "pasado" : ""}`}>
            <div className="pl-fecha">
              <span className="pl-dsem">{DIAS[i]}</span>
              <span className="pl-dnum">{Number(iso.slice(8))}</span>
              <span className="pl-dmes">{MESES[Number(iso.slice(5, 7)) - 1]}</span>
              {esHoy && <span className="pl-hoy">Hoy</span>}
            </div>
            <div className="pl-cuerpo">
              {delDia.map((it) => (
                <PiezaCard key={it.id} it={it} hoyIso={hoyIso} actualizar={actualizar} onEditar={() => onEditar(it)} />
              ))}
              {hueco && <div className="pl-hueco">Sin post planificado</div>}

              {rapido?.fecha === iso ? (
                <AnadirRapido
                  lista={rapido.lista}
                  fecha={iso}
                  actualizar={actualizar}
                  onCerrar={() => setRapido(null)}
                  onMasOpciones={(item) => {
                    setRapido(null);
                    onFormulario(rapido.lista, item);
                  }}
                />
              ) : (
                <div className="pl-acciones">
                  {capas !== "stories" && <Boton onClick={() => setRapido({ fecha: iso, lista: "posts" })}>+ Post</Boton>}
                  {capas !== "posts" && <Boton onClick={() => setRapido({ fecha: iso, lista: "stories" })}>+ Story</Boton>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
