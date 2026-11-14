// ─── APP ──────────────────────────────────────────
import { useEffect, useState } from "react";
import { useStore } from "./lib/store.jsx";
import { esActivo } from "./lib/estado.js";
import { tokenValido, cerrarSesion, emailSesion } from "./lib/auth.js";
import Login from "./components/Login.jsx";
import Icono from "./components/Icono.jsx";
import SyncBadge from "./components/SyncBadge.jsx";
import SemanaTab from "./tabs/SemanaTab.jsx";
import InicioTab from "./tabs/InicioTab.jsx";
import ClientesTab from "./tabs/ClientesTab.jsx";
import LlamadasTab from "./tabs/LlamadasTab.jsx";
import CarrerasTab from "./tabs/CarrerasTab.jsx";
import CobrosTab from "./tabs/CobrosTab.jsx";
import ContenidoTab from "./tabs/ContenidoTab.jsx";
import DatosTab from "./tabs/DatosTab.jsx";
import FichaCliente from "./fichas/FichaCliente.jsx";
import logo from "./assets/logo-blanco-recortado.png";

const TABS = [
  { id: "semana", label: "Semana", icono: "semana", sub: "Todo lo accionable de la semana" },
  { id: "inicio", label: "Inicio", icono: "inicio", sub: "El negocio de un vistazo" },
  { id: "clientes", label: "Clientes", icono: "clientes", sub: "Tus corredores y su programa" },
  { id: "llamadas", label: "Llamadas", icono: "telefono", sub: "Renovaciones y optimizaciones" },
  { id: "carreras", label: "Carreras", icono: "bandera", sub: "Próximas carreras de tus clientes" },
  { id: "cobros", label: "Cobros", icono: "euro", sub: "Facturación, caja y cobros" },
  { id: "contenido", label: "Contenido", icono: "contenido", sub: "Posts, stories y banco de ideas" },
  { id: "datos", label: "Datos", icono: "datos", sub: "Copias de seguridad y sincronización" },
];

// ── Puerta de acceso: sin sesión válida no se monta nada del CRM ──
export default function App() {
  const [sesion, setSesion] = useState("comprobando"); // comprobando | fuera | dentro

  useEffect(() => {
    let vivo = true;
    tokenValido().then((token) => {
      if (vivo) setSesion(token ? "dentro" : "fuera");
    });
    return () => {
      vivo = false;
    };
  }, []);

  if (sesion === "comprobando") {
    return (
      <div className="vacio" style={{ marginTop: 80 }}>
        <Icono nombre="candado" size={32} className="ico-vacio" />
        <p>Comprobando sesión…</p>
      </div>
    );
  }
  if (sesion === "fuera") {
    return <Login onEntrar={() => setSesion("dentro")} />;
  }
  return <CRM onSalir={() => setSesion("fuera")} />;
}

function CRM({ onSalir }) {
  const { data, actualizar, listo, sync, ultimaSync, sincronizarAhora, exportar, importar } = useStore();
  const [tab, setTab] = useState("semana");
  const [fichaId, setFichaId] = useState(null);
  const [menu, setMenu] = useState(false);

  if (!listo) {
    return (
      <div className="vacio" style={{ marginTop: 80 }}>
        <Icono nombre="inicio" size={32} className="ico-vacio" />
        <p>Cargando Fuel to Run…</p>
      </div>
    );
  }

  const activos = data.clientes.filter(esActivo).length;
  const fichaCliente = fichaId ? data.clientes.find((c) => c.id === fichaId) : null;
  const abrirFicha = (id) => setFichaId(id);

  const salir = () => {
    if (!window.confirm("¿Cerrar sesión en este dispositivo?")) return;
    cerrarSesion();
    onSalir();
  };

  const actual = TABS.find((t) => t.id === tab) || TABS[0];
  const ir = (id) => {
    setTab(id);
    setMenu(false);
    window.scrollTo(0, 0);
  };
  const principales = TABS.filter((t) => t.id !== "datos");
  const datos = TABS.find((t) => t.id === "datos");
  const email = emailSesion();

  const botonMenu = (t) => (
    <button key={t.id} className={`lat-item ${tab === t.id ? "activo" : ""}`} onClick={() => ir(t.id)}>
      <Icono nombre={t.icono} size={19} />
      <span>{t.label}</span>
    </button>
  );

  return (
    <div className="app-shell">
      {menu && <div className="lat-fondo" onClick={() => setMenu(false)} />}
      <aside className={`lateral ${menu ? "abierto" : ""}`}>
        <div className="lat-marca">
          <img src={logo} alt="Fuel to Run" className="lat-logo" />
          <div className="lat-crm">CRM</div>
        </div>
        <nav className="lat-nav">{principales.map(botonMenu)}</nav>
        <div className="lat-pie">
          {botonMenu(datos)}
          <div className="lat-sync">
            <SyncBadge sync={sync} ultimaSync={ultimaSync} onSincronizar={sincronizarAhora} />
          </div>
          <div className="lat-usuaria">
            <span className="lat-avatar">{(email || "F").charAt(0).toUpperCase()}</span>
            <span className="lat-email" title={email || ""}>
              {email || "Sesión iniciada"}
            </span>
            <button className="salir-boton" onClick={salir} title="Cerrar sesión">
              <Icono nombre="salir" size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <div className="mov-barra">
          <button className="mov-menu" onClick={() => setMenu(true)} aria-label="Abrir menú">
            <Icono nombre="menu" size={22} />
          </button>
          <span className="mov-titulo">{actual.label}</span>
          <SyncBadge sync={sync} ultimaSync={ultimaSync} onSincronizar={sincronizarAhora} />
        </div>

        <main className="app-main-inner">
          <header className="pag-cab">
            <div>
              <h1 className="pag-titulo">{actual.label}</h1>
              <div className="pag-sub">
                {actual.sub} · {activos} clientes activos
              </div>
            </div>
          </header>

          {tab === "semana" && <SemanaTab doc={data} actualizar={actualizar} abrirFicha={abrirFicha} />}
          {tab === "inicio" && <InicioTab doc={data} irATab={ir} abrirFicha={abrirFicha} />}
          {tab === "clientes" && <ClientesTab doc={data} actualizar={actualizar} abrirFicha={abrirFicha} />}
          {tab === "llamadas" && <LlamadasTab doc={data} actualizar={actualizar} abrirFicha={abrirFicha} />}
          {tab === "carreras" && <CarrerasTab doc={data} actualizar={actualizar} abrirFicha={abrirFicha} />}
          {tab === "cobros" && <CobrosTab doc={data} actualizar={actualizar} abrirFicha={abrirFicha} />}
          {tab === "contenido" && <ContenidoTab doc={data} actualizar={actualizar} />}
          {tab === "datos" && (
            <DatosTab doc={data} exportar={exportar} importar={importar} sincronizarAhora={sincronizarAhora} />
          )}
        </main>
      </div>

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
