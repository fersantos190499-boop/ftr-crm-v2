// ─── DECISIÓN DE FIN DE MES DE PRUEBA ─────────────
// Se va (pasa a Baja) o sigue hasta completar el trimestre / semestre pagando
// lo que falta (de golpe o fraccionado).

import { useState } from "react";
import { Modal, Campo, Selector, Interruptor, Boton, Aviso } from "../components/ui.jsx";
import { METODOS_PAGO } from "../lib/clientes.js";
import { resolverPrueba, restanteSugerido, OPCIONES_AMPLIACION } from "../lib/prueba.js";

const hoyIso = () => new Date().toISOString().slice(0, 10);
const TXT = { se_va: "Se va", "3 meses": "Sigue hasta 3 meses", "6 meses": "Sigue hasta 6 meses" };

export default function PruebaForm({ cliente, actualizar, onCerrar }) {
  const [opcion, setOpcion] = useState("3 meses");
  const [restante, setRestante] = useState(String(restanteSugerido(cliente, "3 meses")));
  const [fechaPago, setFechaPago] = useState(hoyIso());
  const [metodo, setMetodo] = useState(cliente.metodoPago || "Stripe");
  const [fraccionado, setFraccionado] = useState(false);
  const [numCuotas, setNumCuotas] = useState("2");
  const [primeraCobrada, setPrimeraCobrada] = useState(true);
  const [error, setError] = useState("");

  const elegir = (o) => {
    setOpcion(o);
    if (o !== "se_va") setRestante(String(restanteSugerido(cliente, o)));
  };

  const importe = parseFloat(restante) || 0;
  const n = fraccionado ? Math.max(2, parseInt(numCuotas) || 2) : 1;
  const sigue = opcion !== "se_va";

  const confirmar = () => {
    if (sigue) {
      if (!(importe > 0)) return setError("El importe que paga debe ser mayor que 0.");
      if (!fechaPago) return setError("La fecha de pago es obligatoria.");
    }
    actualizar((d) =>
      resolverPrueba(d, cliente.id, { opcion, restante: importe, fechaPago, metodo, fraccionado, numCuotas: n, primeraCobrada })
    );
    onCerrar();
  };

  return (
    <Modal titulo="Decisión del mes de prueba" subtitulo={cliente.nombre} onCerrar={onCerrar}>
      <div className="chips" style={{ marginBottom: 14 }}>
        {["se_va", ...OPCIONES_AMPLIACION].map((o) => (
          <button key={o} className={`chip ${opcion === o ? "activo" : ""}`} onClick={() => elegir(o)}>
            {TXT[o]}
          </button>
        ))}
      </div>

      {!sigue ? (
        <Aviso tono="info">
          Pasa a «Baja». Cuenta como prueba no convertida (no como renovación fallida) y lo ya cobrado se queda como
          está.
        </Aviso>
      ) : (
        <div className="form-grid">
          <Campo label="Importe que paga ahora (€)" type="number" value={restante} onChange={setRestante} />
          <Campo label="Fecha de pago" type="date" value={fechaPago} onChange={setFechaPago} />
          <Selector label="Método de pago" value={metodo} onChange={setMetodo} opciones={METODOS_PAGO} />
          <Selector
            label="Primer cobro"
            value={primeraCobrada ? "Cobrado" : "Pendiente"}
            onChange={(v) => setPrimeraCobrada(v === "Cobrado")}
            opciones={["Cobrado", "Pendiente"]}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <Interruptor label="Dividir el pago en cuotas" checked={fraccionado} onChange={setFraccionado} />
          </div>
          {fraccionado && (
            <>
              <Campo label="Nº de cuotas" type="number" value={numCuotas} onChange={setNumCuotas} />
              <div className="pista" style={{ alignSelf: "end", paddingBottom: 8 }}>
                {n} cuotas de ~{Math.round(importe / n)} € · 1ª el {fechaPago}, el resto cada ~30 días.
              </div>
            </>
          )}
          <div className="pista" style={{ gridColumn: "1 / -1" }}>
            Pasa a {opcion} (mismo inicio). Entra en facturación como venta nueva el mes en que paga; su total
            contratado queda en {(Number(cliente.prueba?.importePrueba) || 0) + importe} €.
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12 }}>
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      <div className="modal-acciones">
        <Boton variante="primario" onClick={confirmar}>
          Confirmar
        </Boton>
        <Boton onClick={onCerrar}>Cancelar</Boton>
      </div>
    </Modal>
  );
}
