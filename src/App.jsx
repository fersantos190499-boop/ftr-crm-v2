// ─── APP ──────────────────────────────────────────
import { useState } from "react";
import { useStore } from "./lib/store.jsx";
import { esActivo } from "./lib/estado.js";
import SyncBadge from "./components/SyncBadge.jsx";
import ClientesTab from "./tabs/ClientesTab.jsx";
import DatosTab from "./tabs/DatosTab.jsx";
import PlaceholderTab from "./tabs/PlaceholderTab.jsx";

const TABS = [
  { id: "inicio", label: "Inicio" },
  { id: "clientes", label: "Clientes" },
  { id: "llamadas", label: "Llamadas" },
  { id: "carreras", label: "Carreras" },
  { id: "cobros", label: "Cobros" },
  { id: "datos", label: "Datos" },
];

export default function App() {
  const store = useStore();
  const { data, actualizar, listo, sync, ultimaSync, sincronizarAhora, exportar, importar } = store;
  const [tab, setTab] = useState("clientes");

  if (!listo) {
    return (
      <div className="vacio" style={{ marginTop: 80 }}>
        <div className="emoji">🏃</div>
        <p>Cargando Fuel to Run…</p>
      </div>
    );
  }

  const activos = data.clientes.filter(esActivo).length;

  return (
    <div>
      <header className="cabecera">
        <div className="contenedor cab-fila">
          <div className="marca">
            <span className="logo">🏃</span>
            <div>
              <div style={{ fontSize: 15 }}>FUEL TO RUN</div>
              <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 400 }}>
                {activos} activos
              </div>
            </div>
          </div>
          <SyncBadge sync={sync} ultimaSync={ultimaSync} onSincronizar={sincronizarAhora} />
        </div>
        <div className="contenedor">
          <nav className="tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`tab ${tab === t.id ? "activo" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="contenedor" style={{ paddingTop: 20, paddingBottom: 60 }}>
        {tab === "clientes" && <ClientesTab doc={data} actualizar={actualizar} />}
        {tab === "datos" && (
          <DatosTab
            doc={data}
            exportar={exportar}
            importar={importar}
            sincronizarAhora={sincronizarAhora}
          />
        )}
        {tab === "inicio" && <PlaceholderTab nombre="Inicio (panel)" fase={5} />}
        {tab === "llamadas" && <PlaceholderTab nombre="Llamadas" fase={4} />}
        {tab === "carreras" && <PlaceholderTab nombre="Carreras" fase={4} />}
        {tab === "cobros" && <PlaceholderTab nombre="Cobros" fase={4} />}
      </main>
    </div>
  );
}
