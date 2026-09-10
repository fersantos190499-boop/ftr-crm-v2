// ─── PESTAÑA LLAMADAS ─────────────────────────────
// Todas las llamadas de renovación y optimización pendientes (y las próximas),
// de todos los clientes activos. Botón para marcarlas hechas.

import { llamadas } from "../lib/consultas.js";
import { marcarLlamadaRenovacion, marcarLlamadaOptimizacion } from "../lib/clientes.js";
import { Boton } from "../components/ui.jsx";

function Fila({ item, abrirFicha, onHecha }) {
  const esRen = item.tipo === "renovacion";
  return (
    <div className="fila-llamada">
      <button className="enlace" onClick={() => abrirFicha(item.cliente.id)}>
        {esRen ? "🔔" : "📞"} <strong>{item.cliente.nombre}</strong>
        <span className="pista">
          {" "}
          · {esRen ? `renovación (semana ${item.semana})` : `optimización (semana global ${item.semana})`}
          {item.faltan != null ? ` · en ${item.faltan} sem.` : ""}
        </span>
      </button>
      {onHecha && (
        <Boton variante="primario" onClick={onHecha}>
          Marcar hecha
        </Boton>
      )}
    </div>
  );
}

export default function LlamadasTab({ doc, actualizar, abrirFicha }) {
  const { pendientesRenov, pendientesOptim, proximas } = llamadas(doc);
  const nada = !pendientesRenov.length && !pendientesOptim.length && !proximas.length;

  const marcarRen = (id) => actualizar((d) => marcarLlamadaRenovacion(d, id, true));
  const marcarOpt = (id, semana) => actualizar((d) => marcarLlamadaOptimizacion(d, id, semana, true));

  if (nada) {
    return (
      <div className="vacio">
        <div className="emoji">✅</div>
        <p>No hay llamadas pendientes ni próximas.</p>
      </div>
    );
  }

  return (
    <div>
      {pendientesRenov.length > 0 && (
        <section className="bloque">
          <h3 className="bloque-titulo">🔔 Renovación · pendientes ({pendientesRenov.length})</h3>
          <div className="lista-simple">
            {pendientesRenov.map((it) => (
              <Fila key={it.cliente.id} item={it} abrirFicha={abrirFicha} onHecha={() => marcarRen(it.cliente.id)} />
            ))}
          </div>
        </section>
      )}

      {pendientesOptim.length > 0 && (
        <section className="bloque">
          <h3 className="bloque-titulo">📞 Optimización · pendientes ({pendientesOptim.length})</h3>
          <div className="lista-simple">
            {pendientesOptim.map((it) => (
              <Fila
                key={`${it.cliente.id}-${it.semana}`}
                item={it}
                abrirFicha={abrirFicha}
                onHecha={() => marcarOpt(it.cliente.id, it.semana)}
              />
            ))}
          </div>
        </section>
      )}

      {proximas.length > 0 && (
        <section className="bloque">
          <h3 className="bloque-titulo">🗓️ Próximas (en 3 semanas o menos)</h3>
          <div className="lista-simple">
            {proximas.map((it) => (
              <Fila key={`${it.cliente.id}-${it.tipo}-${it.semana}`} item={it} abrirFicha={abrirFicha} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
