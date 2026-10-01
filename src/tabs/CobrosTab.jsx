// ─── PESTAÑA COBROS ───────────────────────────────
import { useMemo, useState } from "react";
import { cobrosPorMes, resumenPeriodo, serieComparativa } from "../lib/consultas.js";
import { fFecha, fMesAnyo, claveMes, hoyDias, diasAIso, rangoPeriodo, PERIODOS } from "../lib/fechas.js";
import { Boton, EtiquetaMetodo, EtiquetaPago } from "../components/ui.jsx";
import Icono from "../components/Icono.jsx";
import { METODOS_PAGO } from "../lib/clientes.js";
import GraficaComparativa from "../components/GraficaComparativa.jsx";
import CobroForm from "../forms/CobroForm.jsx";

const suma = (arr) => arr.reduce((s, c) => s + (Number(c.importe) || 0), 0);

function Stat({ etiqueta, valor, sub, tono }) {
  return (
    <div className={`stat stat-${tono}`}>
      <div className="stat-valor">{valor}</div>
      <div className="stat-etiqueta">{etiqueta}</div>
      {sub && <div className="pista">{sub}</div>}
    </div>
  );
}

export default function CobrosTab({ doc, actualizar, abrirFicha }) {
  const [busqueda, setBusqueda] = useState("");
  const [mes, setMes] = useState("todos");
  const [metodo, setMetodo] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [form, setForm] = useState(null);
  const [periodoTipo, setPeriodoTipo] = useState("todo");
  const [rangoDesde, setRangoDesde] = useState("");
  const [rangoHasta, setRangoHasta] = useState("");

  const nombres = useMemo(
    () => Object.fromEntries(doc.clientes.map((c) => [c.id, c.nombre])),
    [doc.clientes]
  );
  const conNombre = useMemo(
    () => doc.cobros.map((c) => ({ ...c, clienteNombre: nombres[c.clienteId] || "—" })),
    [doc.cobros, nombres]
  );

  const mesesDisponibles = useMemo(() => {
    const set = new Set(doc.cobros.map((c) => claveMes(c.fechaPago)).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [doc.cobros]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return conNombre.filter(
      (c) =>
        (!q || c.clienteNombre.toLowerCase().includes(q)) &&
        (mes === "todos" || claveMes(c.fechaPago) === mes) &&
        (metodo === "todos" || c.metodo === metodo) &&
        (estado === "todos" || c.estado === estado)
    );
  }, [conNombre, busqueda, mes, metodo, estado]);

  const grupos = useMemo(() => cobrosPorMes({ ...doc, cobros: filtrados }), [doc, filtrados]);
  const rango = useMemo(
    () => rangoPeriodo(periodoTipo, hoyDias(), { desde: rangoDesde, hasta: rangoHasta }),
    [periodoTipo, rangoDesde, rangoHasta]
  );
  const resumen = useMemo(() => resumenPeriodo(doc, rango), [doc, rango]);
  const serieComp = useMemo(() => serieComparativa(doc), [doc]);

  const totalFiltrado = suma(filtrados);
  const pendientes = conNombre.filter((c) => c.estado !== "Cobrado");
  const totalPendiente = suma(pendientes);
  const hayFiltro = busqueda || mes !== "todos" || metodo !== "todos" || estado !== "todos";

  const borrar = (co) => {
    if (!window.confirm(`¿Eliminar el cobro de ${co.clienteNombre} (${co.importe} €)?`)) return;
    actualizar((d) => ({ ...d, cobros: d.cobros.filter((c) => c.id !== co.id) }));
  };

  return (
    <div>
      <div className="stats-grupo-titulo">Periodo</div>
      <div className="chips" style={{ marginBottom: 10 }}>
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            className={`chip ${periodoTipo === p.id ? "activo" : ""}`}
            onClick={() => setPeriodoTipo(p.id)}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>
      {periodoTipo === "personalizado" && (
        <div className="tarjeta" style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: 14, marginBottom: 10 }}>
          <label className="campo" style={{ flex: "1 1 160px" }}>
            <span className="campo-label">Desde</span>
            <input
              className="campo-input"
              type="date"
              value={rangoDesde}
              onChange={(e) => setRangoDesde(e.target.value)}
            />
          </label>
          <label className="campo" style={{ flex: "1 1 160px" }}>
            <span className="campo-label">Hasta</span>
            <input
              className="campo-input"
              type="date"
              value={rangoHasta}
              onChange={(e) => setRangoHasta(e.target.value)}
            />
          </label>
        </div>
      )}
      {rango.desde != null && rango.hasta != null && (
        <p className="pista" style={{ marginTop: -4, marginBottom: 12 }}>
          Del {fFecha(diasAIso(rango.desde))} al {fFecha(diasAIso(rango.hasta))}
        </p>
      )}

      <div className="stats-grupo-titulo">Facturación · total contratado (se haya cobrado ya o no)</div>
      <div className="stats-grid stats-grid-3">
        <Stat etiqueta="De nuevas altas" valor={`${resumen.totalAltas} €`} tono="azul" sub="Corredores que empiezan" />
        <Stat etiqueta="De renovaciones" valor={`${resumen.totalRenovaciones} €`} tono="violeta" sub="Corredores que renuevan" />
        <Stat etiqueta="Facturación total" valor={`${resumen.totalFacturado} €`} tono="verde" />
      </div>

      <div className="stats-grupo-titulo" style={{ marginTop: 18 }}>
        Caja · dinero que entra de verdad
      </div>
      <div className="stats-grid stats-grid-3">
        <Stat
          etiqueta="Cash collected total"
          valor={`${resumen.totalCobrado} €`}
          tono="ambar"
          sub="Altas, renovaciones y cuotas, cobrado ya"
        />
        <Stat
          etiqueta="Filtrado"
          valor={`${totalFiltrado} €`}
          sub={`${filtrados.length} cobro${filtrados.length === 1 ? "" : "s"}`}
          tono="violeta"
        />
        <Stat
          etiqueta="Por cobrar"
          valor={`${totalPendiente} €`}
          sub={`${pendientes.length} cuota${pendientes.length === 1 ? "" : "s"} pendiente${pendientes.length === 1 ? "" : "s"}`}
          tono="azul"
        />
      </div>

      <div className="bloque">
        <h3 className="bloque-titulo">Facturación vs. cobrado por mes</h3>
        <p className="pista" style={{ marginTop: -8, marginBottom: 10 }}>
          A la izquierda, lo contratado en cada ciclo (alta o renovación). A la derecha, lo que
          realmente entró en caja ese mes.
        </p>
        <GraficaComparativa datos={serieComp} />
      </div>

      <div className="tarjeta filtros-cobros">
        <input
          className="campo-input"
          style={{ maxWidth: 240 }}
          placeholder="Buscar cliente…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select className="campo-input" style={{ maxWidth: 190 }} value={mes} onChange={(e) => setMes(e.target.value)}>
          <option value="todos">Todos los meses</option>
          {mesesDisponibles.map((m) => (
            <option key={m} value={m}>
              {fMesAnyo(`${m}-01`)}
            </option>
          ))}
        </select>
        <div className="chips">
          {["todos", ...METODOS_PAGO].map((m) => (
            <button key={m} className={`chip ${metodo === m ? "activo" : ""}`} onClick={() => setMetodo(m)}>
              {m === "todos" ? "Todos" : m}
            </button>
          ))}
        </div>
        <div className="chips">
          {["todos", "Cobrado", "Pendiente"].map((e) => (
            <button key={e} className={`chip ${estado === e ? "activo" : ""}`} onClick={() => setEstado(e)}>
              {e === "todos" ? "Estado" : e}
            </button>
          ))}
        </div>
        <Boton variante="primario" style={{ marginLeft: "auto" }} onClick={() => setForm({})}>
          + Nuevo cobro
        </Boton>
      </div>

      {grupos.length === 0 ? (
        <div className="vacio">
          <Icono nombre="euro" size={42} className="ico-vacio" />
          <p>No hay cobros con este filtro.</p>
        </div>
      ) : (
        grupos.map((g) => (
          <section key={g.mes} className="bloque">
            <h3 className="bloque-titulo">
              {g.mes === "0000-00" ? "Sin fecha" : fMesAnyo(`${g.mes}-01`)}
              <span style={{ marginLeft: "auto", fontWeight: 400 }} className="pista">
                {g.totalCobrado} € cobrado
                {g.totalPendiente > 0 ? ` · ${g.totalPendiente} € pendiente` : ""}
              </span>
            </h3>
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Concepto</th>
                    <th>Método</th>
                    <th style={{ textAlign: "right" }}>Importe</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {g.cobros.map((co) => (
                    <tr key={co.id}>
                      <td>{fFecha(co.fechaPago)}</td>
                      <td>
                        <button className="enlace" onClick={() => abrirFicha(co.clienteId)}>
                          {co.clienteNombre}
                        </button>
                      </td>
                      <td>{co.concepto}</td>
                      <td>
                        <EtiquetaMetodo metodo={co.metodo} />
                      </td>
                      <td style={{ textAlign: "right" }} className="td-importe">
                        {co.importe} €
                      </td>
                      <td>
                        <EtiquetaPago estado={co.estado} />
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="mini" onClick={() => setForm({ cobro: co })}><Icono nombre="editar" size={15} /></button>
                        <button className="mini" onClick={() => borrar(co)}><Icono nombre="papelera" size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      {form && (
        <CobroForm
          clienteId={undefined}
          clientes={doc.clientes}
          cobro={form.cobro}
          actualizar={actualizar}
          onCerrar={() => setForm(null)}
        />
      )}
    </div>
  );
}
