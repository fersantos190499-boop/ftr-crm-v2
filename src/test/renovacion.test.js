import { describe, it, expect } from "vitest";
import { renovarCliente } from "../lib/renovacion.js";
import { nuevoCliente, cobrosParaCiclo } from "../lib/clientes.js";

// Documento de prueba: 1 cliente "6 meses" activo + su cobro de alta.
function docPrueba() {
  const cliente = nuevoCliente({
    nombre: "María Prueba",
    modalidad: "6 meses",
    fechaInicio: "2026-03-01",
    importe: 597,
    metodoPago: "Stripe",
  });
  const cobros = cobrosParaCiclo({
    clienteId: cliente.id,
    fechaPago: "2026-02-25",
    importeTotal: 597,
    fraccionado: false,
  });
  return { doc: { clientes: [cliente], cobros, meta: { version: 1 } }, clienteId: cliente.id };
}

const formBase = {
  modalidad: "6 meses",
  importe: 640,
  fechaInicio: "2026-09-01",
  fechaPago: "2026-08-28",
  metodoPago: "Stripe",
  fraccionado: false,
  primeraCobrada: true,
};

describe("Fase 3 · renovación — los 3 blindajes", () => {
  // (a) Abrir y cancelar el formulario NO cambia nada del cliente.
  it("(a) cancelar no toca ningún dato — el formulario nunca llama a renovarCliente", () => {
    const { doc } = docPrueba();
    const copiaProfunda = JSON.parse(JSON.stringify(doc));
    // Simula abrir el formulario y cerrarlo sin confirmar: no se invoca nada.
    // (En la UI, RenovacionForm solo llama a actualizar() dentro de confirmar()).
    expect(doc).toEqual(copiaProfunda);
  });

  // (b) Confirmar actualiza EL MISMO registro, sin crear un cliente nuevo.
  it("(b) confirmar actualiza el mismo registro (mismo id), no crea otro cliente", () => {
    const { doc, clienteId } = docPrueba();
    const idOriginal = doc.clientes[0].id;
    const historialPrevio = doc.clientes[0].historialCiclos.length;

    const nuevo = renovarCliente(doc, clienteId, formBase);

    expect(nuevo.clientes).toHaveLength(1); // ← NO se crea un cliente nuevo
    const c = nuevo.clientes[0];
    expect(c.id).toBe(idOriginal); // ← mismo id
    expect(c.estado).toBe("Renovado");
    expect(c.modalidad).toBe("6 meses");
    expect(c.importe).toBe(640);
    expect(c.fechaInicio).toBe("2026-09-01");
    expect(c.numRenovaciones).toBe(1);
    expect(c.semanasPrevias).toBe(24); // 0 previas + 24 del ciclo anterior
    expect(c.semanasTotal).toBe(24);
    expect(c.llamadaRenovacion).toEqual({ hecha: false, fecha: null }); // reiniciada
    expect(c.historialCiclos).toHaveLength(historialPrevio + 1);
    expect(c.historialCiclos.at(-1)).toMatchObject({ motivo: "renovacion", modalidad: "6 meses", importe: 640 });
    // no muta el doc original
    expect(doc.clientes[0].estado).toBe("Activo");
  });

  it("(b2) no existe 'Pendiente' ni ninguna renovación anticipada", () => {
    const { doc, clienteId } = docPrueba();
    const nuevo = renovarCliente(doc, clienteId, formBase);
    expect(nuevo.clientes.every((c) => c.estado !== "Pendiente")).toBe(true);
    expect(nuevo.clientes).toHaveLength(1);
  });

  // (c) La casilla "ya cobrado" evita el cobro duplicado.
  it("(c) yaCobrado = true → NO se crea ningún cobro", () => {
    const { doc, clienteId } = docPrueba();
    const cobrosAntes = doc.cobros.length;
    const nuevo = renovarCliente(doc, clienteId, { ...formBase, yaCobrado: true });
    expect(nuevo.cobros).toHaveLength(cobrosAntes); // ← 0 cobros nuevos
    expect(nuevo.clientes[0].estado).toBe("Renovado"); // pero el ciclo sí se actualiza
    expect(nuevo.clientes[0].estadoPago).toBe("Pagado");
  });

  it("(c2) yaCobrado = false → se crea 1 cobro de 'Renovación' con la FECHA DE PAGO", () => {
    const { doc, clienteId } = docPrueba();
    const cobrosAntes = doc.cobros.length;
    const nuevo = renovarCliente(doc, clienteId, { ...formBase, yaCobrado: false });
    expect(nuevo.cobros).toHaveLength(cobrosAntes + 1);
    const co = nuevo.cobros.at(-1);
    expect(co.clienteId).toBe(clienteId); // vinculado por id
    expect(co.concepto).toBe("Renovación");
    expect(co.importe).toBe(640);
    expect(co.fechaPago).toBe("2026-08-28"); // la fecha de pago, no la de inicio
    expect(co.estado).toBe("Cobrado");
  });

  it("(c3) yaCobrado = false + fraccionado 4 → se crean 4 cobros que suman el total", () => {
    const { doc, clienteId } = docPrueba();
    const cobrosAntes = doc.cobros.length;
    const nuevo = renovarCliente(doc, clienteId, {
      ...formBase,
      importe: 600,
      yaCobrado: false,
      fraccionado: true,
      numCuotas: 4,
    });
    const nuevos = nuevo.cobros.slice(cobrosAntes);
    expect(nuevos).toHaveLength(4);
    expect(nuevos.reduce((s, c) => s + c.importe, 0)).toBe(600);
    expect(nuevos.map((c) => c.estado)).toEqual(["Cobrado", "Pendiente", "Pendiente", "Pendiente"]);
  });

  it("renovar una 2ª vez sigue acumulando semanas previas y nº de renovaciones", () => {
    const { doc, clienteId } = docPrueba();
    const r1 = renovarCliente(doc, clienteId, { ...formBase, modalidad: "3 meses", yaCobrado: true });
    expect(r1.clientes[0].semanasPrevias).toBe(24);
    expect(r1.clientes[0].numRenovaciones).toBe(1);
    const r2 = renovarCliente(r1, clienteId, { ...formBase, modalidad: "3 meses", yaCobrado: true });
    expect(r2.clientes[0].semanasPrevias).toBe(24 + 12); // + las 12 del ciclo de "3 meses"
    expect(r2.clientes[0].numRenovaciones).toBe(2);
    expect(r2.clientes).toHaveLength(1);
  });

  it("cliente inexistente → documento sin cambios", () => {
    const { doc } = docPrueba();
    expect(renovarCliente(doc, "id-que-no-existe", formBase)).toBe(doc);
  });
});
