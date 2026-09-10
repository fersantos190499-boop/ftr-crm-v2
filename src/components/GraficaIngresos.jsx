// ─── GRÁFICA DE INGRESOS POR MES ──────────────────
// Barras, una serie (ingresos cobrados). SVG propio, sin librerías.
// Tooltip por barra al pasar el ratón.

import { useState } from "react";

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function etiquetaMes(clave) {
  const [y, m] = clave.split("-").map(Number);
  return MESES_CORTOS[m - 1] + (m === 1 ? ` ${String(y).slice(2)}` : "");
}

function barra(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

export default function GraficaIngresos({ datos }) {
  const [hover, setHover] = useState(null);
  if (!datos || datos.length === 0) return null;

  const W = 520;
  const H = 150;
  const padY = 10;
  const baseY = H - 24;
  const plotH = baseY - padY;
  const max = Math.max(1, ...datos.map((d) => d.total));
  const paso = W / datos.length;
  const anchoBarra = Math.min(38, paso * 0.62);

  return (
    <div className="grafica-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="grafica" preserveAspectRatio="xMidYMid meet">
        {/* línea base */}
        <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="#e5e7eb" strokeWidth="1.5" />
        {datos.map((d, i) => {
          const h = (d.total / max) * plotH;
          const x = i * paso + (paso - anchoBarra) / 2;
          const y = baseY - h;
          const activo = hover === i;
          return (
            <g
              key={d.mes}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "default" }}
            >
              {/* zona de hover ancha */}
              <rect x={i * paso} y={padY} width={paso} height={baseY - padY} fill="transparent" />
              <path d={barra(x, y, anchoBarra, Math.max(h, 2), 4)} fill={activo ? "#3d8aa5" : "#5ba5c0"} />
              <text x={i * paso + paso / 2} y={H - 7} textAnchor="middle" className="grafica-eje">
                {etiquetaMes(d.mes)}
              </text>
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div
          className="grafica-tip"
          style={{ left: `${((hover + 0.5) / datos.length) * 100}%` }}
        >
          <strong>{datos[hover].total} €</strong>
          <span>{etiquetaMes(datos[hover].mes)}</span>
        </div>
      )}
    </div>
  );
}
