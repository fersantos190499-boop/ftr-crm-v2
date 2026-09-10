// ─── AGENDA SEMANAL (centro de mando) ─────────────
// Reúne TODO lo accionable de la semana en una sola estructura.
// Cada ítem lleva una `clave` estable para marcarlo hecho en `doc.tareas`.

import { esActivo } from "./estado.js";
import { calcularCliente, carrerasOrdenadas } from "./logica.js";
import { hoyDias, diasAIso } from "./fechas.js";

// Domingo de la semana en curso (fin de "esta semana"), en días desde epoch.
function finDeSemana(hoy) {
  const d = new Date(hoy * 86400000);
  const dow = d.getUTCDay(); // 0 dom … 6 sáb
  const faltan = dow === 0 ? 0 : 7 - dow;
  return hoy + faltan;
}

const hecha = (doc, clave) => !!doc.tareas?.[clave]?.hecha;

export function agendaSemanal(doc, hoy = hoyDias()) {
  const finSem = finDeSemana(hoy);
  const clientesPorId = Object.fromEntries((doc.clientes || []).map((c) => [c.id, c]));

  const llamadasHacer = [];
  const llamadasAgendar = [];
  const revisiones = [];
  const tablasCarrera = [];
  const renovaciones = [];

  for (const c of doc.clientes || []) {
    if (!esActivo(c)) continue;
    const d = calcularCliente(c, hoy);

    // Renovación
    if (!c.llamadaRenovacion?.hecha) {
      const falta = d.semanaRenovacion - d.semanaPrograma;
      if (falta <= 0) {
        llamadasHacer.push({ clave: `lr-${c.id}`, tipo: "renovacion", cliente: c, d, semana: d.semanaRenovacion, ambito: "local" });
      } else if (falta === 1) {
        const clave = `ag-lr-${c.id}-${d.semanaRenovacion}`;
        if (!hecha(doc, clave))
          llamadasAgendar.push({ clave, tipo: "renovacion", cliente: c, d, semana: d.semanaRenovacion, ambito: "local" });
      }
    }

    // Optimización
    for (const w of d.semanasOptimizacion) {
      if (c.llamadasOptimizacion?.[w]?.hecha) continue;
      const falta = w - d.semanaGlobal;
      if (falta <= 0) {
        llamadasHacer.push({ clave: `lo-${c.id}-${w}`, tipo: "optimizacion", cliente: c, d, semana: w, ambito: "global" });
      } else if (falta === 1) {
        const clave = `ag-lo-${c.id}-${w}`;
        if (!hecha(doc, clave))
          llamadasAgendar.push({ clave, tipo: "optimizacion", cliente: c, d, semana: w, ambito: "global" });
      }
    }

    // Revisión mensual (semana de programa múltiplo de 4)
    if (d.esMensual) {
      const clave = `rev-${c.id}-${d.semanaGlobal}`;
      if (!hecha(doc, clave)) revisiones.push({ clave, cliente: c, d, semana: d.semanaPrograma });
    }

    // Preparar renovación: ciclo activo que acaba en ≤ 4 semanas
    if (d.diasRestantes != null && d.diasRestantes > 0 && d.diasRestantes <= 28) {
      const clave = `renprep-${c.id}-${c.numRenovaciones || 0}`;
      if (!hecha(doc, clave))
        renovaciones.push({ clave, cliente: c, d, diasRestantes: d.diasRestantes });
    }
  }

  // Tablas de competición: carreras que caen dentro de 8–30 días.
  for (const c of doc.clientes || []) {
    for (const r of carrerasOrdenadas(c, hoy)) {
      const dias = r._dias - hoy;
      if (dias >= 8 && dias <= 30) {
        const clave = `tabla-${r.id}`;
        if (!hecha(doc, clave))
          tablasCarrera.push({ clave, carrera: r, cliente: c, diasRestantes: dias });
      }
    }
  }
  tablasCarrera.sort((a, b) => a.diasRestantes - b.diasRestantes);

  // Cobros pendientes que vencen esta semana o ya vencidos.
  const cobrosVencen = (doc.cobros || [])
    .filter((co) => co.estado !== "Cobrado")
    .map((co) => {
      const dias = co.fechaPago ? isoADiasSeguro(co.fechaPago) - hoy : null;
      return { cobro: co, cliente: clientesPorId[co.clienteId], dias };
    })
    .filter((x) => x.dias != null && x.dias <= finSem - hoy)
    .sort((a, b) => a.dias - b.dias);

  const orden = (a, b) => (a.tipo === b.tipo ? a.semana - b.semana : a.tipo === "renovacion" ? -1 : 1);
  llamadasHacer.sort(orden);
  llamadasAgendar.sort(orden);
  revisiones.sort((a, b) => a.cliente.nombre.localeCompare(b.cliente.nombre));
  renovaciones.sort((a, b) => a.diasRestantes - b.diasRestantes);

  const total =
    llamadasHacer.length +
    llamadasAgendar.length +
    revisiones.length +
    tablasCarrera.length +
    cobrosVencen.length +
    renovaciones.length;

  return { llamadasHacer, llamadasAgendar, revisiones, tablasCarrera, cobrosVencen, renovaciones, total };
}

function isoADiasSeguro(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : null;
}

export { diasAIso };
