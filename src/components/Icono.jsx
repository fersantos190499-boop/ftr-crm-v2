// ─── ICONOS ───────────────────────────────────────
// Set propio de iconos de línea (sin librerías, sin emojis).
// Uso: <Icono nombre="telefono" /> · tamaño y color heredados o por prop.

const P = {
  semana: "M8 2v3M16 2v3M3.5 9h17M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z M8 13h3v3H8z",
  inicio: "M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5",
  clientes: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11",
  telefono: "M15.5 13.5c-1 1-1 2-2 2s-3-1-5-3-3-4-3-5 1-1 2-2 .5-2-.5-3-2-2-3-2-2 1-2 3c0 3 2 7 5 10s7 5 10 5c2 0 3-1 3-2s-1-2-2-3-2-.5-3 .5Z",
  optimizar: "M12 20v-6M12 14a4 4 0 0 0 4-4V4M12 14a4 4 0 0 1-4-4V4M4 4h4M16 4h4M9 20h6",
  renovar: "M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5",
  bandera: "M5 21V4M5 4c3-2 6 2 9 0s6-2 9 0v10c-3 2-6-2-9 0s-6 2-9 0",
  euro: "M17 8a5.5 5.5 0 0 0-4.5-2.5C9 5.5 7 8.4 7 12s2 6.5 5.5 6.5A5.5 5.5 0 0 0 17 16M5 10.5h7M5 13.5h6",
  grafica: "M4 4v15a1 1 0 0 0 1 1h15M8 16v-4M13 16V8M18 16v-6",
  revision: "M9 4h6a1 1 0 0 1 1 1v0a1 1 0 0 0 1 1h1a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1a1 1 0 0 1 1-1ZM9 13l2 2 4-4",
  reloj: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  campana: "M18 9a6 6 0 0 0-12 0c0 6-2 8-2 8h16s-2-2-2-8M10 21a2 2 0 0 0 4 0",
  buscar: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4",
  mas: "M12 5v14M5 12h14",
  check: "M5 13l4 4L19 7",
  x: "M6 6l12 12M18 6 6 18",
  papelera: "M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6",
  editar: "M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3ZM14.5 6.5l3 3",
  flecha: "M9 6l6 6-6 6",
  aviso: "M12 9v4M12 17h.01M10.3 4l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z",
  descargar: "M12 4v11M8 11l4 4 4-4M5 19h14",
  importar: "M12 15V4M8 8l4-4 4 4M5 19h14",
  datos: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  ok: "M9 12l2 2 4-4M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  sync: "M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16",
};

export default function Icono({ nombre, size = 20, stroke = 1.75, className, style }) {
  const d = P[nombre];
  if (!d) return null;
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d.split(" M").map((seg, i) => (
        <path key={i} d={(i ? "M" : "") + seg} />
      ))}
    </svg>
  );
}
