// ─── GRÁFICA: % DE RENOVACIÓN POR MES ──────────────
// Una barra por mes con el % de ciclos que renovaron, de los que ya se
// resolvieron ese mes. Los meses sin ningún ciclo resuelto se muestran vacíos
// (no hay nada que decidir ese mes, no es un 0%).

import { useState } from "react";

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const COLOR_BARRA = "#6b3fc0";

function etiquetaMes(clave) {
  const [y, m] = clave.split("-").map(Number);
  return MESES_CORTOS[m - 1] + (m === 1 ? ` ${String(y).slice(2)}` : "");
}

function barra(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

export default function GraficaRetencion({ datos }) {
  const [hover, setHover] = useState(null);
  if (!datos || datos.length === 0) return null;

  const W = 520;
  const H = 150;
  const padY = 10;
  const baseY = H - 24;
  const plotH = baseY - padY;
  const paso = W / datos.length;
  const anchoBarra = Math.min(38, paso * 0.56);

  return (
    <div className="grafica-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="grafica" preserveAspectRatio="xMidYMid meet">
        <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="#e5e7eb" strokeWidth="1.5" />
        {datos.map((d, i) => {
          const x = i * paso + (paso - anchoBarra) / 2;
          const activo = hover === i;
          const op = activo ? 1 : 0.9;
          const sinDatos = d.total === 0;
          const h = sinDatos ? 2 : Math.max((d.tasa / 100) * plotH, 2);
          return (
            <g key={d.mes} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * paso} y={padY} width={paso} height={baseY - padY} fill="transparent" />
              <path d={barra(x, baseY - h, anchoBarra, h, 4)} fill={sinDatos ? "#e5e7eb" : COLOR_BARRA} opacity={op} />
              <text x={i * paso + paso / 2} y={H - 7} textAnchor="middle" className="grafica-eje">
                {etiquetaMes(d.mes)}
              </text>
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="grafica-tip" style={{ left: `${((hover + 0.5) / datos.length) * 100}%` }}>
          {datos[hover].total === 0 ? (
            <span>Sin ciclos resueltos ese mes</span>
          ) : (
            <>
              <strong>{datos[hover].tasa}% de renovación</strong>
              <span>
                {datos[hover].renovaron} renovaron · {datos[hover].noRenovaron} no renovaron
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
