// ─── PESTAÑA LLAMADAS ─────────────────────────────
// Qué hay que hacer y qué hay que agendar, por prioridad.

import { llamadas } from "../lib/consultas.js";
import { marcarLlamadaRenovacion, marcarLlamadaOptimizacion } from "../lib/clientes.js";
import { Boton } from "../components/ui.jsx";
import Icono from "../components/Icono.jsx";

function badge(item) {
  return item.ambito === "global" ? `SG${item.semana}` : `S${item.semana}`;
}

function FilaLlamada({ item, abrirFicha, onHecha }) {
  const esRen = item.tipo === "renovacion";
  return (
    <div className={`llamada ${esRen ? "llamada-renov" : "llamada-optim"}`}>
      <span className="llamada-ico"><Icono nombre={esRen ? "renovar" : "telefono"} size={16} /></span>
      <div className="llamada-txt">
        <button className="enlace" onClick={() => abrirFicha(item.cliente.id)}>
          <strong className={esRen ? "t-renov" : "t-optim"}>
            {esRen ? "Renovación" : "Optimización"}
          </strong>{" "}
          · {item.cliente.nombre}
        </button>
        <div className="pista">
          {item.cliente.modalidad} · sem {item.d.semanaPrograma}/{item.cliente.semanasTotal}
        </div>
      </div>
      <span className={`llamada-badge ${esRen ? "b-renov" : "b-optim"}`}>{badge(item)}</span>
      {onHecha && (
        <Boton variante="primario" onClick={onHecha}>
          Marcar hecha
        </Boton>
      )}
    </div>
  );
}

export default function LlamadasTab({ doc, actualizar, abrirFicha }) {
  const { pendientes, semanaQueViene, proximas, revisionMensual } = llamadas(doc);
  const marcar = (item) =>
    actualizar((d) =>
      item.tipo === "renovacion"
        ? marcarLlamadaRenovacion(d, item.cliente.id, true)
        : marcarLlamadaOptimizacion(d, item.cliente.id, item.semana, true)
    );

  const vacio =
    !pendientes.length && !semanaQueViene.length && !proximas.length && !revisionMensual.length;

  if (vacio) {
    return (
      <div className="vacio">
        <Icono nombre="ok" size={42} className="ico-vacio" />
        <p>Nada pendiente ni previsto. Todo al día.</p>
      </div>
    );
  }

  return (
    <div>
      {pendientes.length > 0 && (
        <section className="bloque bloque-alerta">
          <h3 className="bloque-titulo">
            Llamadas pendientes <span className="cuenta">{pendientes.length}</span>
          </h3>
          <div className="llamadas-lista">
            {pendientes.map((it) => (
              <FilaLlamada
                key={`${it.cliente.id}-${it.tipo}-${it.semana}`}
                item={it}
                abrirFicha={abrirFicha}
                onHecha={() => marcar(it)}
              />
            ))}
          </div>
        </section>
      )}

      {semanaQueViene.length > 0 && (
        <section className="bloque bloque-agendar">
          <h3 className="bloque-titulo">
            Agendar para la semana que viene <span className="cuenta">{semanaQueViene.length}</span>
          </h3>
          <p className="pista" style={{ marginTop: -6, marginBottom: 10 }}>
            Estas llamadas tocan la semana que viene: agéndalas ya.
          </p>
          <div className="llamadas-lista">
            {semanaQueViene.map((it) => (
              <FilaLlamada
                key={`${it.cliente.id}-${it.tipo}-${it.semana}`}
                item={it}
                abrirFicha={abrirFicha}
              />
            ))}
          </div>
        </section>
      )}

      {revisionMensual.length > 0 && (
        <section className="bloque">
          <h3 className="bloque-titulo">
            Revisión mensual esta semana <span className="cuenta">{revisionMensual.length}</span>
          </h3>
          <div className="llamadas-lista">
            {revisionMensual.map(({ cliente, d }) => (
              <div className="llamada llamada-plana" key={cliente.id}>
                <div className="llamada-txt">
                  <button className="enlace" onClick={() => abrirFicha(cliente.id)}>
                    <strong>{cliente.nombre}</strong>
                  </button>
                </div>
                <span className="pista">
                  sem {d.semanaPrograma}/{cliente.semanasTotal} · {cliente.modalidad}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {proximas.length > 0 && (
        <section className="bloque">
          <h3 className="bloque-titulo">
            Próximas (2-3 semanas) <span className="cuenta">{proximas.length}</span>
          </h3>
          <div className="llamadas-lista">
            {proximas.map((it) => (
              <div className="llamada llamada-plana" key={`${it.cliente.id}-${it.tipo}-${it.semana}`}>
                <span className="llamada-ico"><Icono nombre={it.tipo === "renovacion" ? "renovar" : "telefono"} size={16} /></span>
                <div className="llamada-txt">
                  <button className="enlace" onClick={() => abrirFicha(it.cliente.id)}>
                    {it.tipo === "renovacion" ? "Renovación" : "Optimización"} · {it.cliente.nombre}
                  </button>
                </div>
                <span className="pista">en {it.faltan} semanas</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
