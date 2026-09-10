// ─── PESTAÑA CLIENTES ─────────────────────────────
import { useMemo, useState } from "react";
import { EtiquetaEstado, Semaforo, Boton } from "../components/ui.jsx";
import { esActivo } from "../lib/estado.js";
import { calcularCliente } from "../lib/logica.js";
import NuevoClienteForm from "../forms/NuevoClienteForm.jsx";

const FILTROS = [
  { id: "activos", label: "Activos", test: (c) => esActivo(c) },
  { id: "Activo", label: "Activo", test: (c) => c.estado === "Activo" },
  { id: "Renovado", label: "Renovado", test: (c) => c.estado === "Renovado" },
  { id: "Finalizado", label: "Finalizado", test: (c) => c.estado === "Finalizado" },
  { id: "Baja", label: "Baja", test: (c) => c.estado === "Baja" },
  { id: "todos", label: "Todos", test: () => true },
];

export default function ClientesTab({ doc, actualizar, abrirFicha }) {
  const [filtro, setFiltro] = useState("activos");
  const [busqueda, setBusqueda] = useState("");
  const [alta, setAlta] = useState(false);

  const conteos = useMemo(() => {
    const m = {};
    for (const f of FILTROS) m[f.id] = doc.clientes.filter(f.test).length;
    return m;
  }, [doc.clientes]);

  const lista = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro) || FILTROS[0];
    const q = busqueda.trim().toLowerCase();
    return doc.clientes
      .filter(f.test)
      .filter((c) => !q || c.nombre.toLowerCase().includes(q))
      .map((c) => ({ c, d: calcularCliente(c) }))
      .sort((a, b) => (a.d.diasRestantes ?? 1e9) - (b.d.diasRestantes ?? 1e9));
  }, [doc.clientes, filtro, busqueda]);

  return (
    <div>
      <div className="barra-superior">
        <input
          className="campo-input"
          style={{ maxWidth: 260 }}
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Boton variante="primario" style={{ marginLeft: "auto" }} onClick={() => setAlta(true)}>
          + Nuevo cliente
        </Boton>
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        {FILTROS.map((f) => (
          <button
            key={f.id}
            className={`chip ${filtro === f.id ? "activo" : ""}`}
            onClick={() => setFiltro(f.id)}
          >
            {f.label} <span className="chip-n">{conteos[f.id]}</span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="vacio">
          <div className="emoji">🗂️</div>
          <p>
            {doc.clientes.length === 0
              ? "Aún no hay clientes. Pulsa «+ Nuevo cliente» para empezar."
              : "Ningún cliente con este filtro."}
          </p>
        </div>
      ) : (
        <div className="tarjeta" style={{ padding: 0, marginTop: 0 }}>
          {lista.map(({ c, d }) => (
            <button key={c.id} className="fila-cliente" onClick={() => abrirFicha(c.id)}>
              <div className="fc-nombre">
                <strong>{c.nombre}</strong>
                <div className="pista">
                  {c.modalidad} · semana {d.semanaPrograma}/{c.semanasTotal}
                  {c.numRenovaciones ? ` · R${c.numRenovaciones}` : ""}
                </div>
              </div>
              <div className="fc-meta">
                <EtiquetaEstado estado={c.estado} />
                <Semaforo semaforo={d.semaforo} diasRestantes={d.diasRestantes} />
                <span className="fc-importe">{c.importe} €</span>
              </div>
              <div className="fc-flecha">›</div>
            </button>
          ))}
        </div>
      )}

      {alta && <NuevoClienteForm actualizar={actualizar} onCerrar={() => setAlta(false)} />}
    </div>
  );
}
