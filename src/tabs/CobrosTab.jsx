// ─── PESTAÑA COBROS ───────────────────────────────
import { useMemo, useState } from "react";
import { cobrosPorMes, serieIngresos } from "../lib/consultas.js";
import { fFecha, fMesAnyo, claveMes } from "../lib/fechas.js";
import { Boton, EtiquetaMetodo, EtiquetaPago } from "../components/ui.jsx";
import Icono from "../components/Icono.jsx";
import { METODOS_PAGO } from "../lib/clientes.js";
import GraficaIngresos from "../components/GraficaIngresos.jsx";
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
  const serie = useMemo(() => serieIngresos(doc), [doc]);

  const totalHistorico = suma(conNombre.filter((c) => c.estado === "Cobrado"));
  const mesActual = new Date().toISOString().slice(0, 7);
  const totalEsteMes = suma(
    conNombre.filter((c) => c.estado === "Cobrado" && claveMes(c.fechaPago) === mesActual)
  );
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
      <div className="stats-grid">
        <Stat etiqueta="Total cobrado" valor={`${totalHistorico} €`} tono="azul" />
        <Stat etiqueta={`Este mes · ${fMesAnyo(`${mesActual}-01`)}`} valor={`${totalEsteMes} €`} tono="verde" />
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
          tono="ambar"
        />
      </div>

      <div className="bloque">
        <h3 className="bloque-titulo">Ingresos cobrados por mes</h3>
        <GraficaIngresos datos={serie} />
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
