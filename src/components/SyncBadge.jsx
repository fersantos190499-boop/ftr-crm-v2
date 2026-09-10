import { SYNC } from "../lib/store.jsx";
import Icono from "./Icono.jsx";

const CFG = {
  [SYNC.INICIAL]: { txt: "Iniciando", color: "#9aa4af", spin: false },
  [SYNC.CARGANDO]: { txt: "Cargando", color: "#f0b429", spin: true },
  [SYNC.GUARDANDO]: { txt: "Guardando", color: "#f0b429", spin: true },
  [SYNC.SINCRONIZADO]: { txt: "Sincronizado", color: "#46d38a", spin: false },
  [SYNC.ERROR]: { txt: "Sin conexión", color: "#f06565", spin: false },
};

export default function SyncBadge({ sync, ultimaSync, onSincronizar }) {
  const c = CFG[sync] || CFG[SYNC.ERROR];
  return (
    <button className="badge" onClick={onSincronizar} title="Sincronizar ahora">
      {c.spin ? (
        <Icono nombre="sync" size={13} />
      ) : (
        <span className="punto" style={{ background: c.color }} />
      )}
      <span>{c.txt}</span>
      {ultimaSync && sync === SYNC.SINCRONIZADO && (
        <span style={{ opacity: 0.6 }}>
          {ultimaSync.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </button>
  );
}
