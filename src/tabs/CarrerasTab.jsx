// ─── PESTAÑA CARRERAS ─────────────────────────────
// Todas las carreras de todos los clientes, ordenadas por fecha.

import { useState } from "react";
import { carreras } from "../lib/consultas.js";
import { fFecha } from "../lib/fechas.js";
import { Boton } from "../components/ui.jsx";
import CarreraForm from "../forms/CarreraForm.jsx";

function FilaCarrera({ f, abrirFicha, onEditar, onBorrar }) {
  return (
    <div className="fila-llamada">
      <span>
        <strong>{fFecha(f.fecha)}</strong> · {f.nombre}
        {" — "}
        <button className="enlace" onClick={() => abrirFicha(f.clienteId)}>
          {f.clienteNombre}
        </button>
        {f.diasRestantes != null && f.diasRestantes >= 0 && (
          <span className="pista"> · faltan {f.diasRestantes} días</span>
        )}
      </span>
      <span style={{ whiteSpace: "nowrap" }}>
        <button className="mini" onClick={onEditar}>
          ✏️
        </button>
        <button className="mini" onClick={onBorrar}>
          🗑️
        </button>
      </span>
    </div>
  );
}

export default function CarrerasTab({ doc, actualizar, abrirFicha }) {
  const { proximas, pasadas } = carreras(doc);
  const [verPasadas, setVerPasadas] = useState(false);
  const [form, setForm] = useState(null); // { carrera? } | null

  const borrar = (f) => {
    if (!window.confirm(`¿Eliminar la carrera «${f.nombre}» de ${f.clienteNombre}?`)) return;
    actualizar((d) => ({
      ...d,
      clientes: d.clientes.map((c) =>
        c.id === f.clienteId ? { ...c, carreras: (c.carreras || []).filter((r) => r.id !== f.id) } : c
      ),
    }));
  };

  return (
    <div>
      <div className="barra-superior">
        <Boton variante="primario" style={{ marginLeft: "auto" }} onClick={() => setForm({})}>
          + Nueva carrera
        </Boton>
      </div>

      <section className="bloque">
        <h3 className="bloque-titulo">🏁 Próximas ({proximas.length})</h3>
        {proximas.length === 0 ? (
          <div className="pista">No hay carreras próximas.</div>
        ) : (
          <div className="lista-simple">
            {proximas.map((f) => (
              <FilaCarrera
                key={f.id}
                f={f}
                abrirFicha={abrirFicha}
                onEditar={() => setForm({ carrera: f })}
                onBorrar={() => borrar(f)}
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
            <div className="lista-simple">
              {pasadas.map((f) => (
                <FilaCarrera
                  key={f.id}
                  f={f}
                  abrirFicha={abrirFicha}
                  onEditar={() => setForm({ carrera: f })}
                  onBorrar={() => borrar(f)}
                />
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
