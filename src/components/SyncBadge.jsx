import { SYNC } from "../lib/store.jsx";

const CFG = {
  [SYNC.INICIAL]: ["🔵", "Iniciando…"],
  [SYNC.CARGANDO]: ["🔄", "Cargando…"],
  [SYNC.GUARDANDO]: ["🟡", "Guardando…"],
  [SYNC.SINCRONIZADO]: ["🟢", "Sincronizado"],
  [SYNC.ERROR]: ["🔴", "Sin conexión"],
};

export default function SyncBadge({ sync, ultimaSync, onSincronizar }) {
  const [icono, texto] = CFG[sync] || CFG[SYNC.ERROR];
  return (
    <button className="badge" onClick={onSincronizar} title="Sincronizar ahora">
      <span>{icono}</span>
      <span>{texto}</span>
      {ultimaSync && sync === SYNC.SINCRONIZADO && (
        <span style={{ opacity: 0.6 }}>
          {ultimaSync.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </button>
  );
}
