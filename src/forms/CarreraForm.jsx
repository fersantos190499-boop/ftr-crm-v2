// ─── ALTA / EDICIÓN DE UNA CARRERA ────────────────
import { useState } from "react";
import { Modal, Campo, Selector, Boton, Aviso } from "../components/ui.jsx";
import { nuevaCarrera } from "../lib/clientes.js";

// clienteId: fijo si viene de una ficha; si no, selector con `clientes`.
export default function CarreraForm({ clienteId, clientes, carrera, onCerrar, actualizar }) {
  const edicion = !!carrera;
  const [cliSel, setCliSel] = useState(clienteId || carrera?.clienteId || "");
  const [nombre, setNombre] = useState(carrera?.nombre || "");
  const [fecha, setFecha] = useState(carrera?.fecha || "");
  const [error, setError] = useState("");

  const necesitaSelector = !clienteId && Array.isArray(clientes);

  const guardar = () => {
    const idFinal = clienteId || cliSel;
    if (!idFinal) return setError("Elige un cliente.");
    if (!nombre.trim()) return setError("El nombre de la carrera es obligatorio.");
    if (!fecha) return setError("La fecha es obligatoria.");

    actualizar((d) => ({
      ...d,
      clientes: d.clientes.map((c) => {
        const listaC = Array.isArray(c.carreras) ? c.carreras : [];
        if (edicion && c.id === idFinal) {
          return {
            ...c,
            carreras: listaC.map((r) => (r.id === carrera.id ? { ...r, nombre: nombre.trim(), fecha } : r)),
          };
        }
        if (!edicion && c.id === idFinal) {
          return { ...c, carreras: [...listaC, nuevaCarrera({ nombre, fecha })] };
        }
        return c;
      }),
    }));
    onCerrar();
  };

  return (
    <Modal titulo={edicion ? "✏️ Editar carrera" : "🏁 Nueva carrera"} onCerrar={onCerrar} ancho={420}>
      <div className="form-grid">
        {necesitaSelector && (
          <Selector
            label="Cliente *"
            value={cliSel}
            onChange={setCliSel}
            opciones={[{ v: "", l: "— elige —" }, ...clientes.map((c) => ({ v: c.id, l: c.nombre }))]}
            ancho={2}
          />
        )}
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
