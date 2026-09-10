// ─── PESTAÑA CLIENTES ─────────────────────────────
import { useMemo, useState } from "react";
import { EtiquetaEstado, Semaforo, Progreso, Boton } from "../components/ui.jsx";
import { esActivo, COLOR_ESTADO, COLOR_SEMAFORO } from "../lib/estado.js";
import { calcularCliente } from "../lib/logica.js";
import NuevoClienteForm from "../forms/NuevoClienteForm.jsx";

const FILTROS = [
  { id: "activos", label: "Activos", test: (c) => esActivo(c), color: "#5ba5c0" },
  { id: "Activo", label: "Activo", test: (c) => c.estado === "Activo", color: COLOR_ESTADO.Activo[2] },
  { id: "Renovado", label: "Renovado", test: (c) => c.estado === "Renovado", color: COLOR_ESTADO.Renovado[2] },
  { id: "Finalizado", label: "Finalizado", test: (c) => c.estado === "Finalizado", color: COLOR_ESTADO.Finalizado[2] },
  { id: "Baja", label: "Baja", test: (c) => c.estado === "Baja", color: COLOR_ESTADO.Baja[2] },
  { id: "todos", label: "Todos", test: () => true, color: "#6b7280" },
];

function ClienteCard({ c, d, onClick }) {
  const acento = (COLOR_SEMAFORO[d.semaforo] || COLOR_SEMAFORO["⚫"])[2];
  const carreraCerca = d.proximaCarrera && d.diasProximaCarrera != null && d.diasProximaCarrera <= 40;
  return (
    <button className="cliente-card" style={{ borderLeftColor: acento }} onClick={onClick}>
      <div className="cc-top">
        <span className="cc-nombre">{c.nombre}</span>
        <EtiquetaEstado estado={c.estado} />
      </div>
      <div className="cc-sub">
        {c.modalidad}
        {c.numRenovaciones ? ` · ${c.numRenovaciones}ª renovación` : ""}
      </div>
      <div className="cc-progreso">
        <Progreso pct={d.pct} semaforo={d.semaforo} />
        <span className="cc-semana">
          sem {d.semanaPrograma}/{c.semanasTotal}
        </span>
      </div>
      <div className="cc-pie">
        <Semaforo semaforo={d.semaforo} diasRestantes={d.diasRestantes} />
        {carreraCerca && <span className="cc-carrera">🏁 {d.diasProximaCarrera} d</span>}
        <span className="cc-importe">{c.importe} €</span>
      </div>
    </button>
  );
}

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

      <div className="chips" style={{ marginBottom: 16 }}>
        {FILTROS.map((f) => {
          const activo = filtro === f.id;
          return (
            <button
              key={f.id}
              className={`chip ${activo ? "activo" : ""}`}
              style={activo ? { background: f.color, borderColor: f.color } : { borderColor: f.color }}
              onClick={() => setFiltro(f.id)}
            >
              {f.label} <span className="chip-n">{conteos[f.id]}</span>
            </button>
          );
        })}
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
        <div className="clientes-grid">
          {lista.map(({ c, d }) => (
            <ClienteCard key={c.id} c={c} d={d} onClick={() => abrirFicha(c.id)} />
          ))}
        </div>
      )}

      {alta && <NuevoClienteForm actualizar={actualizar} onCerrar={() => setAlta(false)} />}
    </div>
  );
}
