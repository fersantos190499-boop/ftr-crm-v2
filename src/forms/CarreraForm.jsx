// ─── ALTA / EDICIÓN DE UNA CARRERA ────────────────
import { useState } from "react";
import { Modal, Campo, Boton, Aviso } from "../components/ui.jsx";
import { nuevaCarrera } from "../lib/clientes.js";

export default function CarreraForm({ clienteId, carrera, onCerrar, actualizar }) {
  const edicion = !!carrera;
  const [nombre, setNombre] = useState(carrera?.nombre || "");
  const [fecha, setFecha] = useState(carrera?.fecha || "");
  const [error, setError] = useState("");

  const guardar = () => {
    if (!nombre.trim()) return setError("El nombre de la carrera es obligatorio.");
    if (!fecha) return setError("La fecha es obligatoria.");

    actualizar((d) => ({
      ...d,
      clientes: d.clientes.map((c) => {
        if (c.id !== clienteId) return c;
        const carreras = Array.isArray(c.carreras) ? c.carreras : [];
        if (edicion) {
          return {
            ...c,
            carreras: carreras.map((r) => (r.id === carrera.id ? { ...r, nombre: nombre.trim(), fecha } : r)),
          };
        }
        return { ...c, carreras: [...carreras, nuevaCarrera({ nombre, fecha })] };
      }),
    }));
    onCerrar();
  };

  return (
    <Modal titulo={edicion ? "✏️ Editar carrera" : "🏁 Nueva carrera"} onCerrar={onCerrar} ancho={420}>
      <div className="form-grid">
        <Campo label="Nombre *" value={nombre} onChange={setNombre} ancho={2} />
        <Campo label="Fecha *" type="date" value={fecha} onChange={setFecha} ancho={2} />
      </div>
      {error && (
        <div style={{ marginTop: 12 }}>
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}
      <div className="modal-acciones">
        <Boton variante="primario" onClick={guardar}>
          {edicion ? "Guardar" : "Añadir"}
        </Boton>
        <Boton onClick={onCerrar}>Cancelar</Boton>
      </div>
    </Modal>
  );
}
