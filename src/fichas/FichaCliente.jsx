// ─── FICHA DE CLIENTE (vista única, todo editable) ─
// - Datos del ciclo + objetivos + notas: se editan en un borrador local y se
//   confirman con "Guardar cambios" (nada se toca hasta confirmar).
// - Estado, historial de pagos, carreras y llamadas: acciones inmediatas,
//   cada una con su propia confirmación.

import { useEffect, useMemo, useState } from "react";
import { Modal, Campo, Selector, Interruptor, TextArea, Boton, Progreso, Semaforo, EtiquetaEstado, EtiquetaPago, Aviso } from "../components/ui.jsx";
import { ESTADOS, COLOR_ESTADO } from "../lib/estado.js";
import { LISTA_MODALIDADES, semanasDeModalidad, calcularCliente } from "../lib/logica.js";
import { cobrosDeCliente, METODOS_PAGO, ESTADOS_PAGO, marcarLlamadaRenovacion, marcarLlamadaOptimizacion } from "../lib/clientes.js";
import { fFecha } from "../lib/fechas.js";
import CobroForm from "../forms/CobroForm.jsx";
import CarreraForm from "../forms/CarreraForm.jsx";
import RenovacionForm from "../forms/RenovacionForm.jsx";

const CAMPOS_BORRADOR = [
  "modalidad",
  "fechaInicio",
  "importe",
  "metodoPago",
  "estadoPago",
  "fraccionado",
  "objetivoCorto",
  "objetivoLargo",
  "notas",
];

// Nombre editable en la cabecera: se guarda al salir del campo o con Enter.
function NombreEditable({ cliente, actualizar }) {
  const [v, setV] = useState(cliente.nombre);
  useEffect(() => setV(cliente.nombre), [cliente.nombre]);
  const guardar = () => {
    const nuevo = v.trim();
    if (!nuevo || nuevo === cliente.nombre) return setV(cliente.nombre);
    actualizar((d) => ({
      ...d,
      clientes: d.clientes.map((c) =>
        c.id === cliente.id ? { ...c, nombre: nuevo, actualizadoEn: new Date().toISOString() } : c
      ),
    }));
  };
  return (
    <input
      className="ficha-nombre"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={guardar}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      title="Editar nombre"
    />
  );
}

function tomarBorrador(c) {
  const b = {};
  for (const k of CAMPOS_BORRADOR) b[k] = c[k];
  return b;
}

export default function FichaCliente({ cliente, doc, actualizar, onCerrar }) {
  const [borrador, setBorrador] = useState(() => tomarBorrador(cliente));
  const [formCobro, setFormCobro] = useState(null); // { cobro? }  o null
  const [formCarrera, setFormCarrera] = useState(null);
  const [formRenovacion, setFormRenovacion] = useState(false);

  // Si el registro del cliente cambia por debajo (renovación, cambio de estado,
  // renombrado…), el borrador se resincroniza para no arrastrar valores viejos.
  useEffect(() => {
    setBorrador(tomarBorrador(cliente));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id, cliente.actualizadoEn]);

  const cobros = useMemo(
    () => cobrosDeCliente(doc, cliente.id).slice().sort((a, b) => String(a.fechaPago).localeCompare(String(b.fechaPago))),
    [doc, cliente.id]
  );

  // Vista de cálculo usando el borrador (para que la semana/semáforo reaccionen al editar).
  const previa = useMemo(
    () =>
      calcularCliente({
        ...cliente,
        ...borrador,
        semanasTotal: semanasDeModalidad(borrador.modalidad),
      }),
    [cliente, borrador]
  );

  const sucio = CAMPOS_BORRADOR.some((k) => borrador[k] !== cliente[k]);
  const set = (k) => (v) => setBorrador((b) => ({ ...b, [k]: v }));

  const guardarCambios = () => {
    // Solo se escriben los campos que la usuaria ha tocado de verdad, comparando
    // con el cliente ACTUAL (nunca se pisan cambios hechos por otra vía).
    const parche = {};
    for (const k of CAMPOS_BORRADOR) {
      if (borrador[k] !== cliente[k]) parche[k] = k === "importe" ? Number(borrador[k]) || 0 : borrador[k];
    }
    if ("modalidad" in parche) parche.semanasTotal = semanasDeModalidad(parche.modalidad);
    if (Object.keys(parche).length === 0) return;
    actualizar((d) => ({
      ...d,
      clientes: d.clientes.map((c) =>
        c.id === cliente.id ? { ...c, ...parche, actualizadoEn: new Date().toISOString() } : c
      ),
    }));
  };

  const descartar = () => setBorrador(tomarBorrador(cliente));

  const eliminarCliente = () => {
    const n = cobros.length;
    const msg =
      `Vas a ELIMINAR a «${cliente.nombre}»` +
      (n ? ` y sus ${n} cobro(s)` : "") +
      `.\n\nEsto NO se puede deshacer. ¿Continuar?`;
    if (!window.confirm(msg)) return;
    actualizar((d) => ({
      ...d,
      clientes: d.clientes.filter((c) => c.id !== cliente.id),
      cobros: d.cobros.filter((c) => c.clienteId !== cliente.id),
    }));
    onCerrar();
  };

  const cambiarEstado = (estado) => {
    if (estado === cliente.estado) return;
    actualizar((d) => ({
      ...d,
      clientes: d.clientes.map((c) => (c.id === cliente.id ? { ...c, estado, actualizadoEn: new Date().toISOString() } : c)),
    }));
  };

  const borrarCobro = (id) => {
    if (!window.confirm("¿Eliminar este cobro? No se puede deshacer.")) return;
    actualizar((d) => ({ ...d, cobros: d.cobros.filter((c) => c.id !== id) }));
  };

  const borrarCarrera = (id) => {
    if (!window.confirm("¿Eliminar esta carrera?")) return;
    actualizar((d) => ({
      ...d,
      clientes: d.clientes.map((c) =>
        c.id === cliente.id ? { ...c, carreras: (c.carreras || []).filter((r) => r.id !== id) } : c
      ),
    }));
  };

  const toggleLlamadaRenovacion = () =>
    actualizar((d) => marcarLlamadaRenovacion(d, cliente.id, !cliente.llamadaRenovacion?.hecha));

  const toggleOptimizacion = (semana) =>
    actualizar((d) => marcarLlamadaOptimizacion(d, cliente.id, semana, !cliente.llamadasOptimizacion?.[semana]?.hecha));

  const carreras = (cliente.carreras || []).slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

  return (
    <Modal
      titulo={<NombreEditable cliente={cliente} actualizar={actualizar} />}
      subtitulo={`${cliente.modalidad} · semana ${previa.semanaPrograma}/${semanasDeModalidad(borrador.modalidad)} · global ${previa.semanaGlobal}${cliente.numRenovaciones ? ` · ${cliente.numRenovaciones} renovación(es)` : ""}`}
      onCerrar={onCerrar}
      ancho={640}
    >
      {/* Estado + progreso */}
      <div className="ficha-seccion">
        <div className="ficha-titulo">Estado</div>
        <div className="chips">
          {ESTADOS.map((e) => {
            const activo = e === cliente.estado;
            const col = COLOR_ESTADO[e][2];
            return (
              <button
                key={e}
                className={`chip ${activo ? "activo" : ""}`}
                style={activo ? { background: col, borderColor: col } : { borderColor: col }}
                onClick={() => cambiarEstado(e)}
              >
                {e}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          <Progreso pct={previa.pct} semaforo={previa.semaforo} />
          <span className="cc-semana">
            sem {previa.semanaPrograma}/{semanasDeModalidad(borrador.modalidad)}
          </span>
          <Semaforo semaforo={previa.semaforo} diasRestantes={previa.diasRestantes} />
        </div>
        <div className="pista" style={{ marginTop: 4 }}>
          Inicio {fFecha(cliente.fechaInicio)} · fin previsto {fFecha(previa.finDias != null ? isoDe(previa.finDias) : null)}
        </div>
      </div>

      {/* Datos del ciclo (borrador) */}
      <div className="ficha-seccion">
        <div className="ficha-titulo">
          Datos del ciclo {sucio && <span className="pista" style={{ color: "#ca8a04" }}>· cambios sin guardar</span>}
        </div>
        <div className="form-grid">
          <Selector label="Modalidad" value={borrador.modalidad} onChange={set("modalidad")} opciones={LISTA_MODALIDADES} />
          <Campo label="Importe (€)" type="number" value={borrador.importe} onChange={set("importe")} />
          <Campo label="Fecha de inicio real" type="date" value={borrador.fechaInicio || ""} onChange={set("fechaInicio")} />
          <div className="pista" style={{ alignSelf: "end", paddingBottom: 8 }}>
            {semanasDeModalidad(borrador.modalidad)} semanas · renovación en la semana {previa.semanaRenovacion}
          </div>
          <Selector label="Método de pago" value={borrador.metodoPago} onChange={set("metodoPago")} opciones={METODOS_PAGO} />
          <Selector label="Estado de pago" value={borrador.estadoPago} onChange={set("estadoPago")} opciones={ESTADOS_PAGO} />
          <div style={{ gridColumn: "1 / -1" }}>
            <Interruptor label="Pago fraccionado" checked={borrador.fraccionado} onChange={set("fraccionado")} />
          </div>
          <Campo label="Objetivo a corto plazo" value={borrador.objetivoCorto} onChange={set("objetivoCorto")} ancho={2} />
          <Campo label="Objetivo a largo plazo" value={borrador.objetivoLargo} onChange={set("objetivoLargo")} ancho={2} />
          <TextArea label="Notas" value={borrador.notas} onChange={set("notas")} filas={3} />
        </div>
        <div className="modal-acciones" style={{ marginTop: 12 }}>
          <Boton variante="primario" onClick={guardarCambios} disabled={!sucio}>
            Guardar cambios
          </Boton>
          <Boton onClick={descartar} disabled={!sucio}>
            Descartar
          </Boton>
        </div>
      </div>

      {/* Historial de pagos */}
      <div className="ficha-seccion">
        <div className="ficha-titulo">
          Historial de pagos
          <Boton style={{ marginLeft: "auto" }} onClick={() => setFormCobro({})}>
            + Cobro
          </Boton>
        </div>
        {cobros.length === 0 ? (
          <div className="pista">Sin cobros registrados.</div>
        ) : (
          <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Método</th>
                <th style={{ textAlign: "right" }}>Importe</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cobros.map((c) => (
                <tr key={c.id}>
                  <td>{fFecha(c.fechaPago)}</td>
                  <td>{c.concepto}</td>
                  <td>{c.metodo}</td>
                  <td style={{ textAlign: "right" }}>{c.importe} €</td>
                  <td>
                    <EtiquetaPago estado={c.estado} />
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="mini" onClick={() => setFormCobro({ cobro: c })}>
                      ✏️
                    </button>
                    <button className="mini" onClick={() => borrarCobro(c.id)}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ fontWeight: 700 }}>
                  Total
                </td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>
                  {cobros.reduce((s, c) => s + (Number(c.importe) || 0), 0)} €
                </td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Carreras */}
      <div className="ficha-seccion">
        <div className="ficha-titulo">
          Carreras
          <Boton style={{ marginLeft: "auto" }} onClick={() => setFormCarrera({})}>
            + Carrera
          </Boton>
        </div>
        {carreras.length === 0 ? (
          <div className="pista">Sin carreras.</div>
        ) : (
          <ul className="lista-simple">
            {carreras.map((r) => (
              <li key={r.id}>
                <span>
                  <strong>{r.nombre}</strong> — {fFecha(r.fecha)}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  <button className="mini" onClick={() => setFormCarrera({ carrera: r })}>
                    ✏️
                  </button>
                  <button className="mini" onClick={() => borrarCarrera(r.id)}>
                    🗑️
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Llamadas */}
      <div className="ficha-seccion">
        <div className="ficha-titulo">Llamadas</div>
        <div className="lista-simple">
          <div className="fila-llamada">
            <span>
              🔔 Renovación (semana {previa.semanaRenovacion})
              {previa.esRenovacionAhora && !cliente.llamadaRenovacion?.hecha && (
                <span style={{ color: "#dc2626", fontWeight: 700 }}> · toca esta semana</span>
              )}
            </span>
            <Boton
              variante={cliente.llamadaRenovacion?.hecha ? "primario" : "normal"}
              onClick={toggleLlamadaRenovacion}
            >
              {cliente.llamadaRenovacion?.hecha ? "✓ Hecha" : "Marcar hecha"}
            </Boton>
          </div>
          {previa.semanasOptimizacion.map((w) => {
            const hecha = cliente.llamadasOptimizacion?.[w]?.hecha;
            return (
              <div className="fila-llamada" key={w}>
                <span>
                  📞 Optimización (semana global {w})
                  {previa.semanaGlobal === w && !hecha && (
                    <span style={{ color: "#ca8a04", fontWeight: 700 }}> · toca ahora</span>
                  )}
                </span>
                <Boton variante={hecha ? "primario" : "normal"} onClick={() => toggleOptimizacion(w)}>
                  {hecha ? "✓ Hecha" : "Marcar hecha"}
                </Boton>
              </div>
            );
          })}
        </div>
      </div>

      {/* Renovación */}
      <div className="ficha-seccion">
        <div className="ficha-titulo">Renovación</div>
        <div className="fila-llamada">
          <span>
            Renovar el ciclo del cliente (mismo registro, pasa a «Renovado»).
            {previa.esRenovacionAhora && <span style={{ color: "#dc2626", fontWeight: 700 }}> · toca esta semana</span>}
          </span>
          <Boton variante="primario" onClick={() => setFormRenovacion(true)}>
            🔄 Registrar renovación
          </Boton>
        </div>
      </div>

      {/* Historial de ciclos */}
      {Array.isArray(cliente.historialCiclos) && cliente.historialCiclos.length > 0 && (
        <div className="ficha-seccion">
          <div className="ficha-titulo">Historial de ciclos</div>
          <ul className="lista-simple">
            {cliente.historialCiclos.map((h, i) => (
              <li key={i}>
                <span>
                  {h.motivo === "alta" ? "🟢 Alta" : "🔄 Renovación"} — {fFecha(h.fecha)}
                </span>
                <span className="pista">
                  {h.modalidad} · {h.importe} €
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Zona de peligro */}
      <div className="ficha-seccion">
        <div className="ficha-titulo">Zona de peligro</div>
        <div className="fila-llamada" style={{ background: "#fef2f2" }}>
          <span>Eliminar este cliente y todos sus cobros de forma permanente.</span>
          <Boton variante="peligro" onClick={eliminarCliente}>
            Eliminar cliente
          </Boton>
        </div>
      </div>

      {formRenovacion && (
        <RenovacionForm cliente={cliente} actualizar={actualizar} onCerrar={() => setFormRenovacion(false)} />
      )}
      {formCobro && (
        <CobroForm
          clienteId={cliente.id}
          cobro={formCobro.cobro}
          actualizar={actualizar}
          onCerrar={() => setFormCobro(null)}
        />
      )}
      {formCarrera && (
        <CarreraForm
          clienteId={cliente.id}
          carrera={formCarrera.carrera}
          actualizar={actualizar}
          onCerrar={() => setFormCarrera(null)}
        />
      )}
    </Modal>
  );
}

// fin previsto en ISO a partir de "días desde epoch"
function isoDe(dias) {
  const d = new Date(dias * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
