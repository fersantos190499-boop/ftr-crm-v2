// ─── GRÁFICA DE FACTURACIÓN POR MES ───────────────
// Barras apiladas: altas (color marca) + renovaciones (violeta, igual que la
// etiqueta de estado "Renovado"). Dos series → leyenda fija, nunca solo color.

import { useState } from "react";

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const COLOR_ALTA = "#2f8ba8";
const COLOR_RENOV = "#8256d0";

function etiquetaMes(clave) {
  const [y, m] = clave.split("-").map(Number);
  return MESES_CORTOS[m - 1] + (m === 1 ? ` ${String(y).slice(2)}` : "");
}

function barra(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

export default function GraficaFacturacion({ datos }) {
  const [hover, setHover] = useState(null);
  if (!datos || datos.length === 0) return null;

  const W = 520;
  const H = 160;
  const padY = 10;
  const baseY = H - 24;
  const plotH = baseY - padY;
  const max = Math.max(1, ...datos.map((d) => d.altas + d.renovaciones));
  const paso = W / datos.length;
  const anchoBarra = Math.min(38, paso * 0.62);
  const GAP = 2;

  return (
    <div className="grafica-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="grafica" preserveAspectRatio="xMidYMid meet">
        <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="#e5e7eb" strokeWidth="1.5" />
        {datos.map((d, i) => {
          const hAltas = (d.altas / max) * plotH;
          const hRenov = (d.renovaciones / max) * plotH;
          const x = i * paso + (paso - anchoBarra) / 2;
          const activo = hover === i;
          const op = activo ? 1 : 0.92;
          return (
            <g key={d.mes} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * paso} y={padY} width={paso} height={baseY - padY} fill="transparent" />
              {d.renovaciones > 0 && (
                <path
                  d={barra(x, baseY - hRenov - (hAltas > 0 ? hAltas + GAP : 0), anchoBarra, Math.max(hRenov, 2), 4)}
                  fill={COLOR_RENOV}
                  opacity={op}
                />
              )}
              {d.altas > 0 && (
                <path d={barra(x, baseY - hAltas, anchoBarra, Math.max(hAltas, 2), 4)} fill={COLOR_ALTA} opacity={op} />
              )}
              {d.altas === 0 && d.renovaciones === 0 && (
                <path d={barra(x, baseY - 2, anchoBarra, 2, 1)} fill="#e5e7eb" />
              )}
              <text x={i * paso + paso / 2} y={H - 7} textAnchor="middle" className="grafica-eje">
                {etiquetaMes(d.mes)}
              </text>
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="grafica-tip" style={{ left: `${((hover + 0.5) / datos.length) * 100}%` }}>
          <strong>{datos[hover].altas + datos[hover].renovaciones} €</strong>
          <span>
            {datos[hover].altas} € altas · {datos[hover].renovaciones} € renov.
          </span>
        </div>
      )}
      <div className="grafica-leyenda">
        <span>
          <i style={{ background: COLOR_ALTA }} /> Altas
        </span>
        <span>
          <i style={{ background: COLOR_RENOV }} /> Renovaciones
        </span>
      </div>
    </div>
  );
}
