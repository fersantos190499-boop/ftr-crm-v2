// ─── APP ──────────────────────────────────────────
import { useState } from "react";
import { useStore } from "./lib/store.jsx";
import { esActivo } from "./lib/estado.js";
import SyncBadge from "./components/SyncBadge.jsx";
import InicioTab from "./tabs/InicioTab.jsx";
import ClientesTab from "./tabs/ClientesTab.jsx";
import LlamadasTab from "./tabs/LlamadasTab.jsx";
import CarrerasTab from "./tabs/CarrerasTab.jsx";
import CobrosTab from "./tabs/CobrosTab.jsx";
import DatosTab from "./tabs/DatosTab.jsx";
import FichaCliente from "./fichas/FichaCliente.jsx";

const TABS = [
  { id: "inicio", label: "Inicio" },
  { id: "clientes", label: "Clientes" },
  { id: "llamadas", label: "Llamadas" },
  { id: "carreras", label: "Carreras" },
  { id: "cobros", label: "Cobros" },
  { id: "datos", label: "Datos" },
];

export default function App() {
  const { data, actualizar, listo, sync, ultimaSync, sincronizarAhora, exportar, importar } = useStore();
  const [tab, setTab] = useState("inicio");
  const [fichaId, setFichaId] = useState(null);

  if (!listo) {
    return (
      <div className="vacio" style={{ marginTop: 80 }}>
        <div className="emoji">🏃</div>
        <p>Cargando Fuel to Run…</p>
      </div>
    );
  }

  const activos = data.clientes.filter(esActivo).length;
  const fichaCliente = fichaId ? data.clientes.find((c) => c.id === fichaId) : null;
  const abrirFicha = (id) => setFichaId(id);

  return (
    <div>
      <header className="cabecera">
        <div className="contenedor cab-fila">
          <div className="marca">
            <span className="logo" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="21" height="21">
                <path
                  d="M5 21 L12 13 L17 17 L27 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="27" cy="6" r="3" fill="currentColor" />
                <path d="M5 26 H27" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
              </svg>
            </span>
            <div className="marca-txt">
              <div className="marca-nombre">
                Fuel to Run <span className="marca-crm">CRM</span>
              </div>
              <div className="marca-sub">{activos} clientes activos</div>
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
        {tab === "inicio" && <InicioTab doc={data} irATab={setTab} abrirFicha={abrirFicha} />}
        {tab === "clientes" && <ClientesTab doc={data} actualizar={actualizar} abrirFicha={abrirFicha} />}
        {tab === "llamadas" && <LlamadasTab doc={data} actualizar={actualizar} abrirFicha={abrirFicha} />}
        {tab === "carreras" && <CarrerasTab doc={data} actualizar={actualizar} abrirFicha={abrirFicha} />}
        {tab === "cobros" && <CobrosTab doc={data} actualizar={actualizar} abrirFicha={abrirFicha} />}
        {tab === "datos" && (
          <DatosTab doc={data} exportar={exportar} importar={importar} sincronizarAhora={sincronizarAhora} />
        )}
      </main>

      {fichaCliente && (
        <FichaCliente
          cliente={fichaCliente}
          doc={data}
          actualizar={actualizar}
          onCerrar={() => setFichaId(null)}
        />
      )}
    </div>
  );
}
