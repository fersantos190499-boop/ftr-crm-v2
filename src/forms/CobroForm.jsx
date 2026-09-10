// ─── ALTA / EDICIÓN DE UN COBRO ───────────────────
import { useState } from "react";
import { Modal, Campo, Selector, Boton, Aviso } from "../components/ui.jsx";
import { nuevoCobro, METODOS_PAGO, ESTADOS_COBRO } from "../lib/clientes.js";

const hoyIso = () => new Date().toISOString().slice(0, 10);

// clienteId: fijo si viene de una ficha; si no, se muestra un selector con `clientes`.
export default function CobroForm({ clienteId, clientes, cobro, onCerrar, actualizar }) {
  const edicion = !!cobro;
  const [cliSel, setCliSel] = useState(clienteId || cobro?.clienteId || "");
  const [fechaPago, setFechaPago] = useState(cobro?.fechaPago || hoyIso());
  const [concepto, setConcepto] = useState(cobro?.concepto || "Programa completo");
  const [importe, setImporte] = useState(cobro ? String(cobro.importe) : "");
  const [metodo, setMetodo] = useState(cobro?.metodo || "Stripe");
  const [estado, setEstado] = useState(cobro?.estado || "Cobrado");
  const [nota, setNota] = useState(cobro?.nota || "");
  const [error, setError] = useState("");

  const necesitaSelector = !clienteId && Array.isArray(clientes);

  const guardar = () => {
    const imp = parseFloat(importe);
    const idFinal = clienteId || cliSel;
    if (!idFinal) return setError("Elige un cliente.");
    if (!fechaPago) return setError("La fecha de pago es obligatoria.");
    if (!(imp > 0)) return setError("El importe debe ser mayor que 0.");

    actualizar((d) => {
      if (edicion) {
        return {
          ...d,
          cobros: d.cobros.map((c) =>
            c.id === cobro.id
              ? { ...c, clienteId: idFinal, fechaPago, concepto, importe: imp, metodo, estado, nota }
              : c
          ),
        };
      }
      return {
        ...d,
        cobros: [...d.cobros, nuevoCobro({ clienteId: idFinal, fechaPago, concepto, importe: imp, metodo, estado, nota })],
      };
    });
    onCerrar();
  };

  return (
    <Modal titulo={edicion ? "Editar cobro" : "Nuevo cobro"} onCerrar={onCerrar} ancho={480}>
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
        <Campo label="Fecha de pago *" type="date" value={fechaPago} onChange={setFechaPago} />
        <Campo label="Importe (€) *" type="number" value={importe} onChange={setImporte} />
        <Campo label="Concepto" value={concepto} onChange={setConcepto} ancho={2} />
        <Selector label="Método" value={metodo} onChange={setMetodo} opciones={METODOS_PAGO} />
        <Selector label="Estado" value={estado} onChange={setEstado} opciones={ESTADOS_COBRO} />
        <Campo label="Nota" value={nota} onChange={setNota} ancho={2} />
      </div>
      {error && (
        <div style={{ marginTop: 12 }}>
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}
      <div className="modal-acciones">
        <Boton variante="primario" onClick={guardar}>
          {edicion ? "Guardar" : "Añadir cobro"}
        </Boton>
        <Boton onClick={onCerrar}>Cancelar</Boton>
      </div>
    </Modal>
  );
}
