// ─── GRÁFICA: FACTURACIÓN (contratado) vs. COBRADO (caja) POR MES ──
// Por cada mes, dos barras lado a lado: la de facturación apilada en
// altas + renovaciones, y la de caja (cash collected) en un único color.
// Así se ve de un vistazo cuánto se contrata y cuánto entra de verdad.

import { useState } from "react";

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const COLOR_ALTA = "#2f8ba8";
const COLOR_RENOV = "#8256d0";
const COLOR_COBRADO = "#d99a3a";

function etiquetaMes(clave) {
  const [y, m] = clave.split("-").map(Number);
  return MESES_CORTOS[m - 1] + (m === 1 ? ` ${String(y).slice(2)}` : "");
}

function barra(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

export default function GraficaComparativa({ datos }) {
  const [hover, setHover] = useState(null);
  if (!datos || datos.length === 0) return null;

  const W = 560;
  const H = 170;
  const padY = 10;
  const baseY = H - 24;
  const plotH = baseY - padY;
  const max = Math.max(1, ...datos.map((d) => Math.max(d.altas + d.renovaciones, d.cobrado)));
  const paso = W / datos.length;
  const anchoBarra = Math.min(16, paso * 0.26);
  const GAP_BARRAS = 4;
  const GAP_APILADO = 2;

  return (
    <div className="grafica-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="grafica" preserveAspectRatio="xMidYMid meet">
        <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="#e5e7eb" strokeWidth="1.5" />
        {datos.map((d, i) => {
          const hAltas = (d.altas / max) * plotH;
          const hRenov = (d.renovaciones / max) * plotH;
          const hCobrado = (d.cobrado / max) * plotH;
          const centro = i * paso + paso / 2;
          const xFact = centro - anchoBarra - GAP_BARRAS / 2;
          const xCobrado = centro + GAP_BARRAS / 2;
          const activo = hover === i;
          const op = activo ? 1 : 0.92;
          return (
            <g key={d.mes} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * paso} y={padY} width={paso} height={baseY - padY} fill="transparent" />
              {d.renovaciones > 0 && (
                <path
                  d={barra(
                    xFact,
                    baseY - hRenov - (hAltas > 0 ? hAltas + GAP_APILADO : 0),
                    anchoBarra,
                    Math.max(hRenov, 2),
                    3
                  )}
                  fill={COLOR_RENOV}
                  opacity={op}
                />
              )}
              {d.altas > 0 && (
                <path d={barra(xFact, baseY - hAltas, anchoBarra, Math.max(hAltas, 2), 3)} fill={COLOR_ALTA} opacity={op} />
              )}
              {d.altas === 0 && d.renovaciones === 0 && (
                <path d={barra(xFact, baseY - 2, anchoBarra, 2, 1)} fill="#e5e7eb" />
              )}
              {d.cobrado > 0 ? (
                <path d={barra(xCobrado, baseY - hCobrado, anchoBarra, Math.max(hCobrado, 2), 3)} fill={COLOR_COBRADO} opacity={op} />
              ) : (
                <path d={barra(xCobrado, baseY - 2, anchoBarra, 2, 1)} fill="#e5e7eb" />
              )}
              <text x={centro} y={H - 7} textAnchor="middle" className="grafica-eje">
                {etiquetaMes(d.mes)}
              </text>
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="grafica-tip" style={{ left: `${((hover + 0.5) / datos.length) * 100}%` }}>
          <strong>{datos[hover].altas + datos[hover].renovaciones} € facturados</strong>
          <span>
            {datos[hover].altas} € altas · {datos[hover].renovaciones} € renov. · {datos[hover].cobrado} € cobrados
          </span>
        </div>
      )}
      <div className="grafica-leyenda">
        <span>
          <i style={{ background: COLOR_ALTA }} /> Altas (facturado)
        </span>
        <span>
          <i style={{ background: COLOR_RENOV }} /> Renovaciones (facturado)
        </span>
        <span>
          <i style={{ background: COLOR_COBRADO }} /> Cobrado (caja)
        </span>
      </div>
    </div>
  );
}
