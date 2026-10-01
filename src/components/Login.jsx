// ─── PANTALLA DE INICIO DE SESIÓN ──────────────────
import { useState } from "react";
import { iniciarSesion } from "../lib/auth.js";
import Icono from "./Icono.jsx";

export default function Login({ onEntrar }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const enviar = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setCargando(true);
    setError("");
    try {
      await iniciarSesion(email.trim(), password);
      onEntrar();
    } catch (err) {
      setError(err.message || "No se ha podido iniciar sesión.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-pantalla">
      <form className="login-caja" onSubmit={enviar}>
        <div className="login-logo">
          <svg viewBox="0 0 32 32" width="24" height="24">
            <path
              d="M5 21 L12 13 L17 17 L27 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="27" cy="6" r="3" fill="currentColor" />
            <path d="M5 26 H27" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
          </svg>
        </div>
        <h1 className="login-titulo">Fuel to Run · CRM</h1>
        <p className="pista" style={{ textAlign: "center", marginBottom: 18 }}>
          Acceso privado. Inicia sesión para continuar.
        </p>

        <label className="campo">
          <span className="campo-label">Email</span>
          <input
            className="campo-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </label>
        <label className="campo" style={{ marginTop: 12 }}>
          <span className="campo-label">Contraseña</span>
          <input
            className="campo-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <div className="login-error">
            <Icono nombre="aviso" size={15} /> {error}
          </div>
        )}

        <button type="submit" className="btn primario login-boton" disabled={cargando}>
          <Icono nombre="candado" size={15} /> {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
