// ─── PESTAÑA AÚN NO CONSTRUIDA ────────────────────
export default function PlaceholderTab({ nombre, fase }) {
  return (
    <div className="vacio">
      <div className="emoji">🚧</div>
      <p>
        <strong>{nombre}</strong> se construye en la <strong>Fase {fase}</strong>.
      </p>
    </div>
  );
}
