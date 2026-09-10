// ─── REGISTRAR RENOVACIÓN ─────────────────────────
// Formulario con estado SOLO local. Abrirlo y cerrarlo / cancelar / Escape
// no cambia ni un dato del cliente: nada se escribe hasta pulsar "Confirmar".

import { useState } from "react";
import { Modal, Campo, Selector, Interruptor, Boton, Aviso } from "../components/ui.jsx";
import { LISTA_MODALIDADES, semanasDeModalidad } from "../lib/logica.js";
import { METODOS_PAGO } from "../lib/clientes.js";
import { renovarCliente } from "../lib/renovacion.js";

const hoyIso = () => new Date().toISOString().slice(0, 10);

export default function RenovacionForm({ cliente, actualizar, onCerrar }) {
  const [modalidad, setModalidad] = useState(cliente.modalidad);
  const [importe, setImporte] = useState(String(cliente.importe ?? ""));
  const [fechaInicio, setFechaInicio] = useState(hoyIso());
  const [fechaPago, setFechaPago] = useState(hoyIso());
  const [metodoPago, setMetodoPago] = useState(cliente.metodoPago || "Stripe");
  const [fraccionado, setFraccionado] = useState(false);
  const [numCuotas, setNumCuotas] = useState("3");
  const [yaCobrado, setYaCobrado] = useState(false);
  const [primeraCobrada, setPrimeraCobrada] = useState(true);
  const [error, setError] = useState("");

  const total = parseFloat(importe) || 0;
  const n = fraccionado ? Math.max(2, parseInt(numCuotas) || 3) : 1;

  const confirmar = () => {
    if (!(total > 0)) return setError("El importe debe ser mayor que 0.");
    if (!fechaInicio) return setError("La fecha de inicio del nuevo ciclo es obligatoria.");
    if (!yaCobrado && !fechaPago) return setError("La fecha de pago es obligatoria (o marca «ya cobré este ciclo»).");

    actualizar((d) =>
      renovarCliente(d, cliente.id, {
        modalidad,
        importe: total,
        fechaInicio,
        fechaPago,
        metodoPago,
        fraccionado,
        numCuotas: n,
        yaCobrado,
        primeraCobrada,
      })
    );
    onCerrar();
  };

  return (
    <Modal
      titulo={`🔄 Renovar — ${cliente.nombre}`}
      subtitulo={`Renovación nº ${(cliente.numRenovaciones || 0) + 1} · el mismo cliente, el mismo registro`}
      onCerrar={onCerrar}
    >
      <div className="form-grid">
        <Selector label="Nueva modalidad" value={modalidad} onChange={setModalidad} opciones={LISTA_MODALIDADES} />
        <Campo label="Nuevo importe (€)" type="number" value={importe} onChange={setImporte} />
        <Campo label="Inicio del nuevo ciclo *" type="date" value={fechaInicio} onChange={setFechaInicio} />
        <Campo label="Fecha de pago" type="date" value={fechaPago} onChange={setFechaPago} />
        <div className="pista" style={{ gridColumn: "1 / -1", marginTop: -4 }}>
          El nuevo ciclo tendrá {semanasDeModalidad(modalidad)} semanas. La numeración de «semana global»
          sigue contando desde el ciclo anterior.
        </div>

        <Selector label="Método de pago" value={metodoPago} onChange={setMetodoPago} opciones={METODOS_PAGO} />
        <div />

        <div style={{ gridColumn: "1 / -1" }}>
          <Interruptor
            label="Ya cobré este ciclo por adelantado (no crear un cobro nuevo)"
            checked={yaCobrado}
            onChange={setYaCobrado}
          />
        </div>

        {!yaCobrado && (
          <>
            <div style={{ gridColumn: "1 / -1" }}>
              <Interruptor label="Pago fraccionado en varias cuotas" checked={fraccionado} onChange={setFraccionado} />
            </div>
            {fraccionado ? (
              <Campo label="Nº de cuotas" type="number" value={numCuotas} onChange={setNumCuotas} />
            ) : (
              <Selector
                label="Primer cobro"
                value={primeraCobrada ? "Cobrado" : "Pendiente"}
                onChange={(v) => setPrimeraCobrada(v === "Cobrado")}
                opciones={["Cobrado", "Pendiente"]}
              />
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <Aviso tono={yaCobrado ? "ok" : "info"}>
          {yaCobrado
            ? "Se actualizará el ciclo del cliente y pasará a «Renovado». NO se creará ningún cobro."
            : `Se actualizará el ciclo del cliente, pasará a «Renovado» y se creará ${n === 1 ? "1 cobro" : `${n} cobros`} de «Renovación».`}
        </Aviso>
      </div>

      {error && (
        <div style={{ marginTop: 12 }}>
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      <div className="modal-acciones">
        <Boton variante="primario" onClick={confirmar}>
          ✅ Confirmar renovación
        </Boton>
        <Boton onClick={onCerrar}>Cancelar</Boton>
      </div>
    </Modal>
  );
}
