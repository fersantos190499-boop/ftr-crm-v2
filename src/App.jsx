// ─── APP (Fase 1) ─────────────────────────────────
// Interfaz mínima para verificar la base: conexión con Supabase, guardado,
// cache local, backup/restore y el despliegue automático.
// Las pestañas reales (Inicio, Clientes, Ficha, etc.) llegan en fases siguientes.

import { useRef, useState } from "react";
import { useStore, SYNC } from "./lib/store.jsx";
import { esActivo } from "./lib/estado.js";
import { calcularCliente } from "./lib/logica.js";

const ETIQUETA_SYNC = {
  [SYNC.INICIAL]: ["🔵", "Iniciando…"],
  [SYNC.CARGANDO]: ["🔄", "Cargando datos…"],
  [SYNC.GUARDANDO]: ["🟡", "Guardando…"],
  [SYNC.SINCRONIZADO]: ["🟢", "Sincronizado"],
  [SYNC.ERROR]: ["🔴", "Sin conexión"],
};

function crearClienteDemo(n) {
  const hoy = new Date();
  const inicio = new Date(hoy.getTime() - 20 * 86400000);
  return {
    id: crypto.randomUUID(),
    nombre: `Cliente de prueba ${n}`,
    estado: "Activo",
    modalidad: "3 meses",
    semanasTotal: 12,
    fechaInicio: inicio.toISOString().slice(0, 10),
    importe: 347,
    fraccionado: false,
    metodoPago: "Stripe",
    estadoPago: "Pagado",
    objetivoCorto: "",
    objetivoLargo: "",
    semanasPrevias: 0,
    numRenovaciones: 0,
    notas: "",
    llamadaRenovacion: { hecha: false, fecha: null },
    llamadasOptimizacion: {},
    carreras: [],
    historialCiclos: [
      { fecha: inicio.toISOString().slice(0, 10), modalidad: "3 meses", importe: 347, semanasTotal: 12, motivo: "alta" },
    ],
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  };
}

export default function App() {
  const { data, actualizar, listo, sync, ultimaSync, sincronizarAhora, exportar, importar } = useStore();
  const inputFichero = useRef(null);
  const [aviso, setAviso] = useState("");

  if (!listo) {
    return (
      <div className="vacio" style={{ marginTop: 80 }}>
        <div className="emoji">🏃</div>
        <p>Cargando Fuel to Run…</p>
      </div>
    );
  }

  const [icono, texto] = ETIQUETA_SYNC[sync] || ETIQUETA_SYNC[SYNC.ERROR];
  const activos = data.clientes.filter(esActivo).length;

  const anadirDemo = () =>
    actualizar((d) => ({ ...d, clientes: [...d.clientes, crearClienteDemo(d.clientes.length + 1)] }));
  const vaciarClientes = () => actualizar((d) => ({ ...d, clientes: [], cobros: [] }));

  const alImportar = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const lector = new FileReader();
    lector.onload = (ev) => {
      const r = importar(String(ev.target.result));
      setAviso(r.ok ? `Backup importado: ${r.clientes} clientes, ${r.cobros} cobros.` : r.error);
    };
    lector.readAsText(f);
  };

  return (
    <div>
      <header className="cabecera">
        <div className="contenedor">
          <div className="marca">
            <span className="logo">🏃</span>
            <div>
              <div style={{ fontSize: 15 }}>FUEL TO RUN</div>
              <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 400 }}>CRM · v2 · Fase 1</div>
            </div>
          </div>
          <button className="badge" onClick={sincronizarAhora} title="Sincronizar ahora">
            <span>{icono}</span>
            <span>{texto}</span>
            {ultimaSync && sync === SYNC.SINCRONIZADO && (
              <span style={{ opacity: 0.6 }}>
                {ultimaSync.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="contenedor">
        <div className="tarjeta">
          <h2 style={{ marginTop: 0 }}>Base del CRM · comprobación</h2>
          <p style={{ color: "var(--texto-suave)" }}>
            {data.clientes.length === 0 ? (
              <>Base de datos <strong>vacía</strong>, como debe estar. Los clientes se reintroducen a mano en la Fase 2.</>
            ) : (
              <>
                {data.clientes.length} cliente(s) · <strong>{activos}</strong> cuentan como activos
                (regla central <code>esActivo</code>) · {data.cobros.length} cobro(s).
              </>
            )}
          </p>

          {aviso && (
            <p style={{ background: "var(--azul-claro)", padding: "8px 12px", borderRadius: 8 }}>{aviso}</p>
          )}

          <div className="fila-botones">
            <button className="btn primario" onClick={anadirDemo}>+ Añadir cliente de prueba</button>
            <button className="btn" onClick={vaciarClientes} disabled={data.clientes.length === 0}>
              Vaciar
            </button>
            <button className="btn" onClick={sincronizarAhora}>Sincronizar ahora</button>
            <button className="btn" onClick={exportar}>💾 Descargar backup</button>
            <button className="btn" onClick={() => inputFichero.current?.click()}>📂 Importar backup</button>
            <input ref={inputFichero} type="file" accept=".json" hidden onChange={alImportar} />
          </div>
        </div>

        {data.clientes.length > 0 && (
          <div className="tarjeta">
            <h3 style={{ marginTop: 0 }}>Clientes (cálculo en vivo)</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {data.clientes.map((c) => {
                const d = calcularCliente(c);
                return (
                  <li key={c.id} style={{ marginBottom: 6 }}>
                    <strong>{c.nombre}</strong> — {c.estado} · {c.modalidad} · semana{" "}
                    {d.semanaPrograma}/{c.semanasTotal} {d.semaforo}
                    {d.diasRestantes != null && ` · ${d.diasRestantes}d restantes`}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="tarjeta">
          <h3 style={{ marginTop: 0 }}>Documento en Supabase (fila id=1)</h3>
          <div className="debug">{JSON.stringify(data, null, 2)}</div>
        </div>
      </main>
    </div>
  );
}
