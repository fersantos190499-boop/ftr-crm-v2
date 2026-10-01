// ─── AUTENTICACIÓN (Supabase Auth) ────────────────
// Protege el CRM con un inicio de sesión real: sin iniciar sesión, la base de
// datos rechaza la lectura/escritura (ver política RLS en Supabase — solo
// usuarios autenticados). La clave "anon" sigue siendo pública por diseño
// (va en el navegador): lo que protege los datos es la política + el login.

const SUPABASE_URL = "https://duwcvzlcxdcbyvlxibrv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1d2N2emxjeGRjYnl2bHhpYnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MzUzNTUsImV4cCI6MjEwMDIxMTM1NX0.F_gLyBH7oL5T8KOg3N1GUndBoPhS4k17AYLrZWlDCDc";

const CLAVE_SESION = "ftr_crm_v2_sesion";
const MARGEN_SEG = 45; // refrescar un poco antes de que caduque de verdad

function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION));
  } catch {
    return null;
  }
}
function guardarSesion(s) {
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(s));
  } catch {}
}
export function cerrarSesion() {
  try {
    localStorage.removeItem(CLAVE_SESION);
  } catch {}
}
export function emailSesion() {
  return leerSesion()?.email || null;
}

async function llamarToken(grantType, cuerpo) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=${grantType}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(traducirError(datos));
  }
  return datos;
}

function traducirError(datos) {
  const msg = datos.error_description || datos.msg || datos.error || "";
  if (/invalid login credentials/i.test(msg)) return "Email o contraseña incorrectos.";
  if (/email not confirmed/i.test(msg)) return "Esta cuenta aún no está confirmada.";
  if (/network/i.test(msg)) return "Sin conexión. Inténtalo de nuevo.";
  return msg || "No se ha podido iniciar sesión.";
}

function guardarDesdeRespuesta(datos, emailPrevio) {
  const sesion = {
    access_token: datos.access_token,
    refresh_token: datos.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (datos.expires_in || 3600) - MARGEN_SEG,
    email: datos.user?.email || emailPrevio || null,
  };
  guardarSesion(sesion);
  return sesion;
}

// Inicia sesión con email + contraseña. Lanza un Error con mensaje legible si falla.
export async function iniciarSesion(email, password) {
  const datos = await llamarToken("password", { email, password });
  return guardarDesdeRespuesta(datos, email);
}

// Devuelve un access_token utilizable (refrescando si hace falta), o null si
// no hay sesión / el refresco falla (en ese caso también borra la sesión).
export async function tokenValido() {
  const s = leerSesion();
  if (!s?.refresh_token) return null;
  const ahora = Math.floor(Date.now() / 1000);
  if (s.access_token && s.expires_at > ahora) return s.access_token;
  try {
    const datos = await llamarToken("refresh_token", { refresh_token: s.refresh_token });
    return guardarDesdeRespuesta(datos, s.email).access_token;
  } catch {
    cerrarSesion();
    return null;
  }
}
