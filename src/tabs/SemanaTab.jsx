// ─── PESTAÑA SEMANA (centro de mando) ─────────────
// Todo lo accionable de la semana en un sitio. Cada cosa se marca hecha y
// desaparece de la lista.

import { useState } from "react";
import { agendaSemanal } from "../lib/semana.js";
import {
  marcarLlamadaRenovacion,
  marcarLlamadaOptimizacion,
  marcarTarea,
  registrarContacto,
} from "../lib/clientes.js";
import { fFecha, fFechaCorta, hoyDias, diasAIso } from "../lib/fechas.js";
import { Boton } from "../components/ui.jsx";
import RenovacionForm from "../forms/RenovacionForm.jsx";

function Seccion({ icono, titulo, n, children }) {
  if (!n) return null;
  return (
    <section className="bloque">
      <h3 className="bloque-titulo">
        {icono} {titulo} <span className="cuenta">{n}</span>
      </h3>
      <div className="sem-lista">{children}</div>
    </section>
  );
}

function FilaLlamada({ item, onHecha }) {
  const [nota, setNota] = useState("");
  const esRen = item.tipo === "renovacion";
  return (
    <div className={`sem-fila sem-fila-col ${esRen ? "llamada-renov" : "llamada-optim"}`}>
      <div className="sem-fila-top">
        <span className="llamada-ico">{esRen ? "🔔" : "📞"}</span>
        <span className="sem-txt">
          <strong className={esRen ? "t-renov" : "t-optim"}>
            {esRen ? "Renovación" : "Optimización"}
          </strong>{" "}
          · {item.cliente.nombre}
        </span>
        <span className={`llamada-badge ${esRen ? "b-renov" : "b-optim"}`}>
          {item.ambito === "global" ? `SG${item.semana}` : `S${item.semana}`}
        </span>
      </div>
      <div className="sem-fila-accion">
        <input
          className="campo-input"
          placeholder="Nota de la llamada (opcional)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
        <Boton variante="primario" onClick={() => onHecha(nota)}>
          ✓ Hecha
        </Boton>
      </div>
    </div>
  );
}

function FilaSimple({ tono, texto, sub, accion }) {
  return (
    <div className={`sem-fila ${tono || ""}`}>
      <div className="sem-txt">
        <strong>{texto}</strong>
        {sub && <span className="pista"> · {sub}</span>}
      </div>
      {accion}
    </div>
  );
}

export default function SemanaTab({ doc, actualizar, abrirFicha }) {
  const hoy = hoyDias();
  const a = agendaSemanal(doc, hoy);
  const [formRenov, setFormRenov] = useState(null);

  const rango = `${fFechaCorta(diasAIso(hoy))} — ${fFechaCorta(diasAIso(hoy + 6))}`;

  const marcarLlamada = (item, nota) =>
    actualizar((d) => {
      let nd =
        item.tipo === "renovacion"
          ? marcarLlamadaRenovacion(d, item.cliente.id, true)
          : marcarLlamadaOptimizacion(d, item.cliente.id, item.semana, true);
      nd = registrarContacto(nd, item.cliente.id, {
        tipo: item.tipo === "renovacion" ? "Renovación" : "Optimización",
        texto: nota,
      });
      return nd;
    });

  const marcar = (clave) => actualizar((d) => marcarTarea(d, clave, true));
  const marcarCobrado = (cobroId) =>
    actualizar((d) => ({
      ...d,
      cobros: d.cobros.map((c) => (c.id === cobroId ? { ...c, estado: "Cobrado" } : c)),
    }));

  if (a.total === 0) {
    return (
      <div className="vacio">
        <div className="emoji">☕</div>
        <p>Semana despejada. Nada pendiente de agendar ni de hacer.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="sem-cabecera">
        <div>
          <div className="sem-titulo">Tu semana</div>
          <div className="pista">{rango}</div>
        </div>
        <div className="sem-total">
          {a.total} <span>tareas</span>
        </div>
      </div>

      <Seccion icono="📞" titulo="Llamadas a hacer" n={a.llamadasHacer.length}>
        {a.llamadasHacer.map((it) => (
          <FilaLlamada key={it.clave} item={it} onHecha={(nota) => marcarLlamada(it, nota)} />
        ))}
      </Seccion>

      <Seccion icono="⏰" titulo="Llamadas a agendar (semana que viene)" n={a.llamadasAgendar.length}>
        {a.llamadasAgendar.map((it) => (
          <FilaSimple
            key={it.clave}
            tono={it.tipo === "renovacion" ? "llamada-renov" : "llamada-optim"}
            texto={`${it.tipo === "renovacion" ? "Renovación" : "Optimización"} · ${it.cliente.nombre}`}
            sub={`toca su semana ${it.semana}`}
            accion={
              <Boton onClick={() => marcar(it.clave)}>✓ Agendada</Boton>
            }
          />
        ))}
      </Seccion>

      <Seccion icono="📋" titulo="Revisiones mensuales" n={a.revisiones.length}>
        {a.revisiones.map((it) => (
          <FilaSimple
            key={it.clave}
            texto={it.cliente.nombre}
            sub={`semana ${it.semana} · ${it.cliente.modalidad}`}
            accion={<Boton onClick={() => marcar(it.clave)}>✓ Hecha</Boton>}
          />
        ))}
      </Seccion>

      <Seccion icono="🏁" titulo="Tablas de competición a preparar" n={a.tablasCarrera.length}>
        {a.tablasCarrera.map((it) => (
          <FilaSimple
            key={it.clave}
            texto={`${it.carrera.nombre}`}
            sub={`${it.cliente.nombre} · en ${it.diasRestantes} días (${fFecha(it.carrera.fecha)})`}
            accion={<Boton onClick={() => marcar(it.clave)}>✓ Preparada</Boton>}
          />
        ))}
      </Seccion>

      <Seccion icono="💸" titulo="Cobros que vencen" n={a.cobrosVencen.length}>
        {a.cobrosVencen.map(({ cobro, cliente, dias }) => (
          <FilaSimple
            key={cobro.id}
            tono={dias < 0 ? "sem-vencido" : ""}
            texto={`${cliente?.nombre || "—"} · ${cobro.importe} €`}
            sub={`${cobro.concepto} · ${dias < 0 ? `vencido ${fFecha(cobro.fechaPago)}` : `vence ${fFecha(cobro.fechaPago)}`}`}
            accion={<Boton variante="primario" onClick={() => marcarCobrado(cobro.id)}>✓ Cobrado</Boton>}
          />
        ))}
      </Seccion>

      <Seccion icono="🔁" titulo="Ciclos que acaban · preparar renovación" n={a.renovaciones.length}>
        {a.renovaciones.map((it) => (
          <FilaSimple
            key={it.clave}
            texto={it.cliente.nombre}
            sub={`acaba en ${it.diasRestantes} días · ${it.cliente.modalidad} · ${it.cliente.importe} €`}
            accion={
              <span style={{ display: "flex", gap: 6 }}>
                <Boton variante="primario" onClick={() => setFormRenov(it.cliente)}>
                  Renovar
                </Boton>
                <Boton onClick={() => marcar(it.clave)}>✓ Propuesta enviada</Boton>
              </span>
            }
          />
        ))}
      </Seccion>

      {formRenov && (
        <RenovacionForm cliente={formRenov} actualizar={actualizar} onCerrar={() => setFormRenov(null)} />
      )}
    </div>
  );
}
