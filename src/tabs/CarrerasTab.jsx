// ─── PESTAÑA CARRERAS ─────────────────────────────
// Todas las carreras de todos los clientes, en tarjetas, ordenadas por fecha.

import { useState } from "react";
import { carreras } from "../lib/consultas.js";
import { calcularCliente } from "../lib/logica.js";
import { fFecha } from "../lib/fechas.js";
import { Boton, BadgeDias } from "../components/ui.jsx";
import CarreraForm from "../forms/CarreraForm.jsx";

function TarjetaCarrera({ f, cliente, abrirFicha, onEditar }) {
  const d = cliente ? calcularCliente(cliente) : null;
  return (
    <div className="carrera-card">
      <div className="carrera-info">
        <button className="enlace" onClick={() => abrirFicha(f.clienteId)}>
          <strong>{f.clienteNombre}</strong>
        </button>
        <div className="carrera-nombre">🏁 {f.nombre}</div>
        <div className="pista">
          {fFecha(f.fecha)}
          {d ? ` · sem ${d.semanaPrograma}/${cliente.semanasTotal} · ${cliente.modalidad}` : ""}
        </div>
        <button className="mini-enlace" onClick={onEditar}>
          ✏️ Editar
        </button>
      </div>
      <BadgeDias dias={f.diasRestantes} />
    </div>
  );
}

export default function CarrerasTab({ doc, actualizar, abrirFicha }) {
  const { proximas, pasadas } = carreras(doc);
  const [verPasadas, setVerPasadas] = useState(false);
  const [form, setForm] = useState(null);
  const porId = Object.fromEntries(doc.clientes.map((c) => [c.id, c]));

  return (
    <div>
      <div className="barra-superior">
        <Boton variante="primario" style={{ marginLeft: "auto" }} onClick={() => setForm({})}>
          + Nueva carrera
        </Boton>
      </div>

      <section className="bloque">
        <h3 className="bloque-titulo">
          🏁 Próximas <span className="cuenta">{proximas.length}</span>
        </h3>
        {proximas.length === 0 ? (
          <div className="pista">No hay carreras próximas.</div>
        ) : (
          <div className="carreras-grid">
            {proximas.map((f) => (
              <TarjetaCarrera
                key={f.id}
                f={f}
                cliente={porId[f.clienteId]}
                abrirFicha={abrirFicha}
                onEditar={() => setForm({ carrera: f })}
              />
            ))}
          </div>
        )}
      </section>

      {pasadas.length > 0 && (
        <section className="bloque">
          <h3 className="bloque-titulo">
            <button className="enlace" onClick={() => setVerPasadas((v) => !v)}>
              {verPasadas ? "▾" : "▸"} Pasadas ({pasadas.length})
            </button>
          </h3>
          {verPasadas && (
            <div className="llamadas-lista">
              {pasadas.map((f) => (
                <div className="llamada llamada-plana" key={f.id}>
                  <div className="llamada-txt">
                    <button className="enlace" onClick={() => abrirFicha(f.clienteId)}>
                      <strong>{f.nombre}</strong> · {f.clienteNombre}
                    </button>
                  </div>
                  <span className="pista">{fFecha(f.fecha)}</span>
                  <button className="mini" onClick={() => setForm({ carrera: f })}>
                    ✏️
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {form && (
        <CarreraForm
          clienteId={form.carrera?.clienteId}
          clientes={form.carrera ? undefined : doc.clientes}
          carrera={form.carrera}
          actualizar={actualizar}
          onCerrar={() => setForm(null)}
        />
      )}
    </div>
  );
}
