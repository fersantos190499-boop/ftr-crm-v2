// ─── PESTAÑA INICIO (panel) ───────────────────────
// El negocio de un vistazo: KPIs, alertas y próximas carreras.

import { panelInicio, tasaRenovacion, serieTasaRenovacion, ltvMedio } from "../lib/consultas.js";
import { fMesAnyo, fFecha } from "../lib/fechas.js";
import { COLOR_SEMAFORO, urgenciaPorDias } from "../lib/estado.js";
import Icono from "../components/Icono.jsx";
import GraficaRetencion from "../components/GraficaRetencion.jsx";
import { resumenPruebas } from "../lib/prueba.js";

function Kpi({ icono, etiqueta, valor, sub, tono }) {
  return (
    <div className={`kpi kpi-${tono}`}>
      <div className="kpi-icono">
        <Icono nombre={icono} size={20} />
      </div>
      <div className="kpi-cuerpo">
        <div className="kpi-valor">{valor}</div>
        <div className="kpi-etiqueta">{etiqueta}</div>
        {sub && <div className="pista">{sub}</div>}
      </div>
    </div>
  );
}

function Alerta({ icono, texto, num, extra, tono, onClick }) {
  return (
    <button className={`alerta ${tono}`} onClick={onClick}>
      <span className="alerta-icono">
        <Icono nombre={icono} size={17} />
      </span>
      <span className="alerta-texto">{texto}</span>
      <span className="alerta-cifra">
        {num}
        {extra ? <span className="alerta-extra"> {extra}</span> : null}
      </span>
    </button>
  );
}

function Titulo({ icono, children, n }) {
  return (
    <h3 className="bloque-titulo">
      <Icono nombre={icono} size={17} className="ico" /> {children}
      {n != null && <span className="cuenta">{n}</span>}
    </h3>
  );
}

export default function InicioTab({ doc, irATab, abrirFicha }) {
  const p = panelInicio(doc);
  const mesTxt = fMesAnyo(`${p.mesActual}-01`);
  const renov = tasaRenovacion(doc);
  const serieRenov = serieTasaRenovacion(doc);
  const ltv = ltvMedio(doc);
  const pruebas = resumenPruebas(doc);

  if (doc.clientes.length === 0) {
    return (
      <div className="vacio">
        <Icono nombre="grafica" size={44} className="ico-vacio" />
        <p>
          Aún no hay datos. Empieza en la pestaña{" "}
          <button className="enlace" onClick={() => irATab("clientes")}>
            Clientes
          </button>
          .
        </p>
      </div>
    );
  }

  const nLlamadas = p.pendientesRenov.length + p.pendientesOptim.length;

  return (
    <div>
      <div className="kpi-grid">
        <Kpi
          icono="clientes"
          tono="brand"
          etiqueta="Clientes activos"
          valor={p.activos}
          sub={`${p.nActivo} activo · ${p.nRenovado} renovado`}
        />
        <Kpi
          icono="euro"
          tono="verde"
          etiqueta={`Ingresos · ${mesTxt}`}
          valor={`${p.ingresosMes} €`}
          sub={p.ingresosMesPendiente > 0 ? `+ ${p.ingresosMesPendiente} € por cobrar` : "todo cobrado"}
        />
        <Kpi
          icono="renovar"
          tono="ambar"
          etiqueta="Renovaciones este mes"
          valor={p.renovacionesMes.length}
          sub={p.renovacionesMes.length ? "ciclos que terminan este mes" : "ninguna prevista"}
        />
        <Kpi
          icono="revision"
          tono="violeta"
          etiqueta="Tasa de renovación"
          valor={renov.tasa != null ? `${renov.tasa}%` : "—"}
          sub={renov.total > 0 ? `${renov.renovaron} de ${renov.total} ciclos resueltos` : "aún sin ciclos resueltos"}
        />
        <Kpi
          icono="grafica"
          tono="brand"
          etiqueta="LTV medio"
          valor={`${ltv} €`}
          sub="facturado de media por cliente, de siempre"
        />
        {pruebas.hay && (
          <Kpi
            icono="ok"
            tono="verde"
            etiqueta="Conversión de pruebas"
            valor={pruebas.tasa != null ? `${pruebas.tasa}%` : "—"}
            sub={
              pruebas.resueltas > 0
                ? `${pruebas.convertidas} de ${pruebas.resueltas} siguen · ${pruebas.enCurso} en curso`
                : `${pruebas.enCurso} en curso, ninguna decidida aún`
            }
          />
        )}
      </div>

      {/* Alertas */}
      <section className="bloque">
        <Titulo icono="campana">Alertas</Titulo>
        <div className="alertas-grid">
          <Alerta
            icono="telefono"
            texto="Llamadas pendientes"
            num={nLlamadas}
            tono={nLlamadas > 0 ? "hay" : ""}
            onClick={() => irATab("semana")}
          />
          <Alerta
            icono="euro"
            texto="Cobros vencidos"
            num={p.cobrosVencidos.length}
            extra={p.totalVencido > 0 ? `· ${p.totalVencido} €` : ""}
            tono={p.cobrosVencidos.length > 0 ? "grave" : ""}
            onClick={() => irATab("cobros")}
          />
          <Alerta
            icono="reloj"
            texto="Próximos cobros"
            num={p.proximosCobros.length}
            extra={p.totalProximos > 0 ? `· ${p.totalProximos} €` : ""}
            onClick={() => irATab("cobros")}
          />
        </div>

        {p.cobrosVencidos.length > 0 && (
          <div className="lista-simple" style={{ marginTop: 10 }}>
            {p.cobrosVencidos.slice(0, 6).map((co) => {
              const grave = co.diasRetraso > 7;
              return (
                <div className="fila-llamada" key={co.id}>
                  <button className="enlace" onClick={() => abrirFicha(co.clienteId)}>
                    {co.clienteNombre}
                    <span className="pista"> · {co.concepto} · {co.importe} €</span>
                  </button>
                  <span
                    className="pill pill-fuerte"
                    style={grave ? { background: "var(--red-bg)", color: "var(--red)" } : { background: "var(--amber-bg)", color: "var(--amber)" }}
                  >
                    {co.diasRetraso} d de retraso
                  </span>
                </div>
              );
            })}
            {p.cobrosVencidos.length > 6 && <div className="pista">y {p.cobrosVencidos.length - 6} más vencidos…</div>}
          </div>
        )}
      </section>

      {/* Retención por mes */}
      {renov.total > 0 && (
        <div className="bloque">
          <h3 className="bloque-titulo">Retención por mes</h3>
          <p className="pista" style={{ marginTop: -8, marginBottom: 10 }}>
            De los ciclos que se resolvieron cada mes (el cliente decidió seguir o no), qué % renovó.
          </p>
          <GraficaRetencion datos={serieRenov} />
        </div>
      )}

      {/* Quién no renovó (diagnóstico de retención) */}
      {renov.noRenovaronLista.length > 0 && (
        <section className="bloque">
          <Titulo icono="renovar" n={renov.noRenovaronLista.length}>
            No renovaron
          </Titulo>
          <div className="lista-simple">
            {renov.noRenovaronLista.slice(0, 5).map((x) => (
              <div className="fila-llamada" key={x.clienteId}>
                <button className="enlace" onClick={() => abrirFicha(x.clienteId)}>
                  <strong>{x.clienteNombre}</strong>
                  <span className="pista"> · {x.estado}</span>
                </button>
                <span className="pista">último ciclo: {fFecha(x.finCiclo)}</span>
              </div>
            ))}
            {renov.noRenovaronLista.length > 5 && (
              <div className="pista">y {renov.noRenovaronLista.length - 5} más…</div>
            )}
          </div>
        </section>
      )}

      {/* Revisión mensual esta semana */}
      {p.revisionMensual.length > 0 && (
        <section className="bloque">
          <Titulo icono="revision" n={p.revisionMensual.length}>
            Revisión mensual esta semana
          </Titulo>
          <div className="lista-simple">
            {p.revisionMensual.map(({ cliente, d }) => (
              <div className="fila-llamada" key={cliente.id}>
                <button className="enlace" onClick={() => abrirFicha(cliente.id)}>
                  <strong>{cliente.nombre}</strong>
                </button>
                <span className="pista">
                  sem {d.semanaPrograma}/{cliente.semanasTotal} · {cliente.modalidad}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Renovaciones del mes */}
      {p.renovacionesMes.length > 0 && (
        <section className="bloque">
          <Titulo icono="renovar" n={p.renovacionesMes.length}>
            Renovaciones previstas de {mesTxt}
          </Titulo>
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

      {/* Próximas carreras */}
      <section className="bloque">
        <Titulo icono="bandera">Próximas carreras (30 días)</Titulo>
        {p.carrerasProximas.length === 0 ? (
          <div className="pista">Ninguna en los próximos 30 días.</div>
        ) : (
          <div className="lista-simple">
            {p.carrerasProximas.map((f) => {
              const [bg, fg] = COLOR_SEMAFORO[urgenciaPorDias(f.diasRestantes)];
              return (
                <div className="fila-llamada" key={f.id}>
                  <button className="enlace" onClick={() => abrirFicha(f.clienteId)}>
                    <strong>{f.nombre}</strong>
                    <span className="pista"> · {f.clienteNombre}</span>
                  </button>
                  <span className="pill pill-fuerte" style={{ background: bg, color: fg }}>
                    {fFecha(f.fecha)} · {f.diasRestantes} d
                  </span>
                </div>
              );
            })}
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
