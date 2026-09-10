// ─── COMPONENTES DE INTERFAZ REUTILIZABLES ────────
import { useEffect } from "react";
import { COLOR_ESTADO, COLOR_SEMAFORO } from "../lib/estado.js";

export function Boton({ children, onClick, variante = "normal", type = "button", disabled, style }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variante === "primario" ? "primario" : ""} ${variante === "peligro" ? "peligro" : ""}`}
      style={style}
    >
      {children}
    </button>
  );
}

export function Etiqueta({ children, bg = "#f3f4f6", fg = "#374151" }) {
  return (
    <span
      style={{
        background: bg,
        color: fg,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 9px",
        borderRadius: 20,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function EtiquetaEstado({ estado }) {
  const [bg, fg] = COLOR_ESTADO[estado] || ["#f3f4f6", "#6b7280"];
  return (
    <span className="pill" style={{ background: bg, color: fg }}>
      <span className="pill-punto" style={{ background: (COLOR_ESTADO[estado] || [])[2] || fg }} />
      {estado}
    </span>
  );
}

export function Semaforo({ semaforo, diasRestantes }) {
  const [bg, fg] = COLOR_SEMAFORO[semaforo] || COLOR_SEMAFORO["⚫"];
  return (
    <span className="pill pill-fuerte" style={{ background: bg, color: fg }}>
      {semaforo}{" "}
      {diasRestantes != null && diasRestantes > 0
        ? `${diasRestantes} d`
        : diasRestantes != null
          ? "Fin"
          : "—"}
    </span>
  );
}

// Etiqueta de estado de un cobro: Cobrado (verde) / Pendiente (ámbar).
export function EtiquetaPago({ estado }) {
  const cobrado = estado === "Cobrado";
  return (
    <span
      className="pill"
      style={cobrado ? { background: "#e9f9ee", color: "#15803d" } : { background: "#fdf4e3", color: "#b45309" }}
    >
      <span className="pill-punto" style={{ background: cobrado ? "#22c55e" : "#f59e0b" }} />
      {estado}
    </span>
  );
}

// Barra de progreso del ciclo, con color por urgencia (semáforo).
export function Progreso({ pct, semaforo }) {
  const color = (COLOR_SEMAFORO[semaforo] || COLOR_SEMAFORO["⚫"])[2];
  return (
    <div className="progreso">
      <div
        className="progreso-fill"
        style={{ width: `${Math.min((pct || 0) * 100, 100)}%`, background: color }}
      />
    </div>
  );
}

export function Campo({ label, value, onChange, onBlur, placeholder, type = "text", ancho }) {
  return (
    <label className="campo" style={ancho ? { gridColumn: `span ${ancho}` } : undefined}>
      {label && <span className="campo-label">{label}</span>}
      <input
        className="campo-input"
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
      />
    </label>
  );
}

export function Selector({ label, value, onChange, opciones, ancho }) {
  return (
    <label className="campo" style={ancho ? { gridColumn: `span ${ancho}` } : undefined}>
      {label && <span className="campo-label">{label}</span>}
      <select className="campo-input" value={value ?? ""} onChange={(e) => onChange?.(e.target.value)}>
        {opciones.map((o) => {
          const v = typeof o === "object" ? o.v : o;
          const l = typeof o === "object" ? o.l : o;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function Interruptor({ label, checked, onChange }) {
  return (
    <label className="campo" style={{ flexDirection: "row", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange?.(e.target.checked)} />
      <span className="campo-label" style={{ marginBottom: 0 }}>
        {label}
      </span>
    </label>
  );
}

export function TextArea({ label, value, onChange, onBlur, filas = 3, placeholder }) {
  return (
    <label className="campo">
      {label && <span className="campo-label">{label}</span>}
      <textarea
        className="campo-input"
        rows={filas}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        style={{ resize: "vertical", fontFamily: "inherit" }}
      />
    </label>
  );
}

export function Barra({ pct, color }) {
  return (
    <div style={{ height: 6, background: "#eef2f5", borderRadius: 3, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.min((pct || 0) * 100, 100)}%`,
          background: color || "var(--azul)",
          borderRadius: 3,
          transition: "width .4s",
        }}
      />
    </div>
  );
}

export function Modal({ titulo, subtitulo, onCerrar, children, ancho = 560 }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCerrar?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onCerrar]);

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-caja" style={{ maxWidth: ancho }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div>
            <div className="modal-titulo">{titulo}</div>
            {subtitulo && <div className="modal-subtitulo">{subtitulo}</div>}
          </div>
          <button className="modal-x" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Aviso({ tono = "info", children }) {
  const tonos = {
    info: ["var(--azul-claro)", "#1e5f75"],
    error: ["#fee2e2", "#dc2626"],
    ok: ["#dcfce7", "#15803d"],
  };
  const [bg, fg] = tonos[tono] || tonos.info;
  return (
    <div style={{ background: bg, color: fg, padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
      {children}
    </div>
  );
}
