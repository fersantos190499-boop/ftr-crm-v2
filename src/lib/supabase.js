// ─── SUPABASE ─────────────────────────────────────
// Mismo proyecto que el CRM anterior, TABLA NUEVA y VACÍA: ftr_crm (fila id=1,
// columna data JSONB). No se toca la tabla ftr_data del CRM viejo.
// La clave "anon" es pública por diseño (va en el navegador, igual que antes).

const SUPABASE_URL = "https://duwcvzlcxdcbyvlxibrv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1d2N2emxjeGRjYnl2bHhpYnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MzUzNTUsImV4cCI6MjEwMDIxMTM1NX0.F_gLyBH7oL5T8KOg3N1GUndBoPhS4k17AYLrZWlDCDc";

const TABLA = "ftr_crm";
// Fila 1 = datos reales. En desarrollo se puede apuntar a otra fila (p. ej. 2)
// con VITE_FILA_ID para no tocar los datos de producción al hacer pruebas.
const FILA_ID = Number(import.meta.env.VITE_FILA_ID) || 1;

const CABECERAS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: "Bearer " + SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
};

// Devuelve el objeto `data` de la fila, o null si la fila aún no tiene datos.
export async function cargar() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLA}?id=eq.${FILA_ID}&select=data`,
    { headers: CABECERAS }
  );
  if (!res.ok) throw new Error(`Supabase cargar ${res.status}`);
  const filas = await res.json();
  const data = filas[0]?.data;
  return data && typeof data === "object" ? data : null;
}

// Upsert de la fila id=1 con el documento completo.
export async function guardar(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLA}`, {
    method: "POST",
    headers: { ...CABECERAS, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: FILA_ID, data, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Supabase guardar ${res.status}`);
}
