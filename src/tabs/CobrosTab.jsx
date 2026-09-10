// ─── PESTAÑA COBROS ───────────────────────────────
// Todos los cobros agrupados por MES DE FACTURACIÓN (fecha de pago),
// con total cobrado y pendiente por mes.

import { useMemo, useState } from "react";
import { cobrosPorMes } from "../lib/consultas.js";
import { fFecha, fMesAnyo } from "../lib/fechas.js";
import { Boton, EtiquetaPago } from "../components/ui.jsx";
import CobroForm from "../forms/CobroForm.jsx";

export default function CobrosTab({ doc, actualizar, abrirFicha }) {
  const [filtro, setFiltro] = useState("todos"); // todos | Cobrado | Pendiente
  const [form, setForm] = useState(null); // { cobro? } | null

  const meses = useMemo(() => cobrosPorMes(doc), [doc]);

  const mesesFiltrados = useMemo(
    () =>
      meses
        .map((m) => ({
          ...m,
          cobros: m.cobros.filter((c) => filtro === "todos" || c.estado === filtro),
        }))
        .filter((m) => m.cobros.length > 0),
    [meses, filtro]
  );

  const totalAnual = meses.reduce((s, m) => s + m.totalCobrado, 0);
  const totalPendiente = meses.reduce((s, m) => s + m.totalPendiente, 0);

  const borrar = (co) => {
    if (!window.confirm(`¿Eliminar el cobro de ${co.clienteNombre} (${co.importe} €)?`)) return;
    actualizar((d) => ({ ...d, cobros: d.cobros.filter((c) => c.id !== co.id) }));
  };

  return (
    <div>
      <div className="barra-superior">
        <div className="chips">
          {["todos", "Cobrado", "Pendiente"].map((f) => (
            <button key={f} className={`chip ${filtro === f ? "activo" : ""}`} onClick={() => setFiltro(f)}>
              {f === "todos" ? "Todos" : f}
            </button>
          ))}
        </div>
        <Boton variante="primario" style={{ marginLeft: "auto" }} onClick={() => setForm({})}>
          + Nuevo cobro
        </Boton>
      </div>

      <div className="resumen">
        <div>
          <div className="pista">Cobrado (total)</div>
          <div className="resumen-num">{totalAnual} €</div>
        </div>
        <div>
          <div className="pista">Pendiente</div>
          <div className="resumen-num" style={{ color: "#ca8a04" }}>
            {totalPendiente} €
          </div>
        </div>
      </div>

      {mesesFiltrados.length === 0 ? (
        <div className="vacio">
          <div className="emoji">💸</div>
          <p>No hay cobros con este filtro.</p>
        </div>
      ) : (
        mesesFiltrados.map((m) => (
          <section key={m.mes} className="bloque">
            <h3 className="bloque-titulo">
              {m.mes === "0000-00" ? "Sin fecha" : fMesAnyo(`${m.mes}-01`)}
              <span style={{ marginLeft: "auto", fontWeight: 400 }} className="pista">
                {m.totalCobrado} € cobrado
                {m.totalPendiente > 0 ? ` · ${m.totalPendiente} € pendiente` : ""}
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
                {m.cobros.map((co) => (
                  <tr key={co.id}>
                    <td>{fFecha(co.fechaPago)}</td>
                    <td>
                      <button className="enlace" onClick={() => abrirFicha(co.clienteId)}>
                        {co.clienteNombre}
                      </button>
                    </td>
                    <td>{co.concepto}</td>
                    <td>{co.metodo}</td>
                    <td style={{ textAlign: "right" }}>{co.importe} €</td>
                    <td>
                      <EtiquetaPago estado={co.estado} />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="mini" onClick={() => setForm({ cobro: co })}>
                        ✏️
                      </button>
                      <button className="mini" onClick={() => borrar(co)}>
                        🗑️
                      </button>
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
