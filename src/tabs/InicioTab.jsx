// ─── PESTAÑA INICIO (panel) ───────────────────────
// El negocio de un vistazo: activos, ingresos del mes, renovaciones del mes,
// alertas (llamadas y pagos pendientes) y próximas carreras.

import { panelInicio } from "../lib/consultas.js";
import { fMesAnyo, fFecha } from "../lib/fechas.js";

function Kpi({ etiqueta, valor, sub }) {
  return (
    <div className="kpi">
      <div className="kpi-valor">{valor}</div>
      <div className="kpi-etiqueta">{etiqueta}</div>
      {sub && <div className="pista">{sub}</div>}
    </div>
  );
}

export default function InicioTab({ doc, irATab, abrirFicha }) {
  const p = panelInicio(doc);
  const mesTxt = fMesAnyo(`${p.mesActual}-01`);

  if (doc.clientes.length === 0) {
    return (
      <div className="vacio">
        <div className="emoji">📊</div>
        <p>
          Aún no hay datos. Empieza en la pestaña <button className="enlace" onClick={() => irATab("clientes")}>Clientes</button>.
        </p>
      </div>
    );
  }

  const nLlamadas = p.pendientesRenov.length + p.pendientesOptim.length;

  return (
    <div>
      <div className="kpi-grid">
        <Kpi
          etiqueta="Clientes activos"
          valor={p.activos}
          sub={`${p.nActivo} activo · ${p.nRenovado} renovado`}
        />
        <Kpi
          etiqueta={`Ingresos · ${mesTxt}`}
          valor={`${p.ingresosMes} €`}
          sub={p.ingresosMesPendiente > 0 ? `+ ${p.ingresosMesPendiente} € por cobrar` : "todo cobrado"}
        />
        <Kpi
          etiqueta="Renovaciones este mes"
          valor={p.renovacionesMes.length}
          sub={p.renovacionesMes.length ? "ciclos que terminan este mes" : "ninguna prevista"}
        />
      </div>

      {/* Renovaciones del mes */}
      {p.renovacionesMes.length > 0 && (
        <section className="bloque">
          <h3 className="bloque-titulo">🔁 Renovaciones previstas de {mesTxt}</h3>
          <div className="lista-simple">
            {p.renovacionesMes.map(({ cliente, d }) => (
              <div className="fila-llamada" key={cliente.id}>
                <button className="enlace" onClick={() => abrirFicha(cliente.id)}>
                  <strong>{cliente.nombre}</strong>
                  <span className="pista"> · {cliente.modalidad} · {cliente.importe} €</span>
                </button>
                <span className="pista">termina {fFecha(iso(d.finDias))}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Alertas */}
      <section className="bloque">
        <h3 className="bloque-titulo">🔔 Alertas</h3>
        <div className="lista-simple">
          <button className="fila-llamada enlace-fila" onClick={() => irATab("llamadas")}>
            <span>📞 Llamadas pendientes</span>
            <strong className={nLlamadas ? "alerta-num" : ""}>{nLlamadas}</strong>
          </button>
          <button className="fila-llamada enlace-fila" onClick={() => irATab("cobros")}>
            <span>💸 Pagos pendientes</span>
            <strong className={p.pagosPendientes.length ? "alerta-num" : ""}>
              {p.pagosPendientes.length}
              {p.totalPendiente > 0 ? ` · ${p.totalPendiente} €` : ""}
            </strong>
          </button>
        </div>

        {p.pagosPendientes.length > 0 && (
          <div className="lista-simple" style={{ marginTop: 8 }}>
            {p.pagosPendientes.slice(0, 5).map((co) => (
              <div className="fila-llamada" key={co.id}>
                <button className="enlace" onClick={() => abrirFicha(co.clienteId)}>
                  {co.clienteNombre}
                  <span className="pista"> · {co.concepto}</span>
                </button>
                <span className="pista">
                  {co.importe} € · {fFecha(co.fechaPago)}
                </span>
              </div>
            ))}
            {p.pagosPendientes.length > 5 && (
              <div className="pista">y {p.pagosPendientes.length - 5} más…</div>
            )}
          </div>
        )}
      </section>

      {/* Próximas carreras */}
      <section className="bloque">
        <h3 className="bloque-titulo">🏁 Próximas carreras (30 días)</h3>
        {p.carrerasProximas.length === 0 ? (
          <div className="pista">Ninguna en los próximos 30 días.</div>
        ) : (
          <div className="lista-simple">
            {p.carrerasProximas.map((f) => (
              <div className="fila-llamada" key={f.id}>
                <button className="enlace" onClick={() => abrirFicha(f.clienteId)}>
                  <strong>{f.nombre}</strong>
                  <span className="pista"> · {f.clienteNombre}</span>
                </button>
                <span className={f.diasRestantes <= 21 ? "alerta-num" : "pista"}>
                  {fFecha(f.fecha)} · faltan {f.diasRestantes} d
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// "días desde epoch" → ISO, solo para mostrar la fecha de fin de ciclo
function iso(dias) {
  if (dias == null) return null;
  const d = new Date(dias * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
