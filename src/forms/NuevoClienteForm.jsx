// ─── ALTA DE CLIENTE ──────────────────────────────
// Distingue FECHA DE INICIO (real, manda en semana de programa y renovaciones)
// de FECHA DE PAGO (cuándo entra el dinero → mes de facturación en Cobros).

import { useState } from "react";
import { Modal, Campo, Selector, Interruptor, Boton, Aviso } from "../components/ui.jsx";
import { LISTA_MODALIDADES } from "../lib/logica.js";
import { nuevoCliente, cobrosParaCiclo, METODOS_PAGO } from "../lib/clientes.js";

const hoyIso = () => new Date().toISOString().slice(0, 10);

export default function NuevoClienteForm({ onCerrar, actualizar }) {
  const [nombre, setNombre] = useState("");
  const [modalidad, setModalidad] = useState("3 meses");
  const [fechaInicio, setFechaInicio] = useState(hoyIso());
  const [fechaPago, setFechaPago] = useState(hoyIso());
  const [importe, setImporte] = useState("");
  const [fraccionado, setFraccionado] = useState(false);
  const [numCuotas, setNumCuotas] = useState("3");
  const [metodo, setMetodo] = useState("Stripe");
  const [primeraCobrada, setPrimeraCobrada] = useState(true);
  const [objetivoCorto, setObjetivoCorto] = useState("");
  const [objetivoLargo, setObjetivoLargo] = useState("");
  const [error, setError] = useState("");

  const total = parseFloat(importe) || 0;
  const n = fraccionado ? Math.max(2, parseInt(numCuotas) || 3) : 1;
  const cuota = n > 1 ? Math.round(total / n) : total;

  const guardar = () => {
    if (!nombre.trim()) return setError("El nombre es obligatorio.");
    if (!fechaInicio) return setError("La fecha de inicio es obligatoria.");
    if (!fechaPago) return setError("La fecha de pago es obligatoria.");
    if (!(total > 0)) return setError("El importe debe ser mayor que 0.");

    const cliente = nuevoCliente({
      nombre,
      modalidad,
      fechaInicio,
      importe: total,
      fraccionado,
      metodoPago: metodo,
      estadoPago: primeraCobrada && !fraccionado ? "Pagado" : "Pendiente",
      objetivoCorto,
      objetivoLargo,
    });

    const cobros = cobrosParaCiclo({
      clienteId: cliente.id,
      fechaPago,
      importeTotal: total,
      fraccionado,
      numCuotas: n,
      metodo,
      conceptoBase: "Programa completo",
      estadoPrimera: primeraCobrada ? "Cobrado" : "Pendiente",
    });

    actualizar((d) => ({
      ...d,
      clientes: [...d.clientes, cliente],
      cobros: [...d.cobros, ...cobros],
    }));
    onCerrar();
  };

  return (
    <Modal titulo="➕ Nuevo cliente" onCerrar={onCerrar}>
      <div className="form-grid">
        <Campo label="Nombre completo *" value={nombre} onChange={setNombre} ancho={2} />

        <Selector
          label="Modalidad *"
          value={modalidad}
          onChange={setModalidad}
          opciones={LISTA_MODALIDADES}
        />
        <Campo label="Importe total (€) *" type="number" value={importe} onChange={setImporte} />

        <Campo
          label="Fecha de inicio real *"
          type="date"
          value={fechaInicio}
          onChange={setFechaInicio}
        />
        <Campo label="Fecha de pago *" type="date" value={fechaPago} onChange={setFechaPago} />
        <div className="pista" style={{ gridColumn: "1 / -1", marginTop: -4 }}>
          <strong>Inicio</strong>: controla la semana de programa y las renovaciones. ·{" "}
          <strong>Pago</strong>: cuándo entra el dinero (mes de facturación). Pueden ser distintas.
        </div>

        <Selector label="Método de pago" value={metodo} onChange={setMetodo} opciones={METODOS_PAGO} />
        <Selector
          label="Primer cobro"
          value={primeraCobrada ? "Cobrado" : "Pendiente"}
          onChange={(v) => setPrimeraCobrada(v === "Cobrado")}
          opciones={["Cobrado", "Pendiente"]}
        />

        <div style={{ gridColumn: "1 / -1" }}>
          <Interruptor label="Pago fraccionado en varias cuotas" checked={fraccionado} onChange={setFraccionado} />
        </div>
        {fraccionado && (
          <>
            <Campo label="Nº de cuotas" type="number" value={numCuotas} onChange={setNumCuotas} />
            <div className="pista" style={{ alignSelf: "end", paddingBottom: 8 }}>
              {n} cuotas de ~{cuota} € · 1ª el {fechaPago}, el resto cada ~30 días.
            </div>
          </>
        )}

        <Campo label="Objetivo a corto plazo" value={objetivoCorto} onChange={setObjetivoCorto} ancho={2} />
        <Campo label="Objetivo a largo plazo" value={objetivoLargo} onChange={setObjetivoLargo} ancho={2} />
      </div>

      {error && (
        <div style={{ marginTop: 12 }}>
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      <div className="modal-acciones">
        <Boton variante="primario" onClick={guardar}>
          ✅ Añadir cliente
        </Boton>
        <Boton onClick={onCerrar}>Cancelar</Boton>
      </div>
    </Modal>
  );
}
