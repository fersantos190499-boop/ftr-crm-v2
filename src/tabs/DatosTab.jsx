// ─── PESTAÑA DATOS ────────────────────────────────
// Copia de seguridad (descargar / importar), resumen del contenido y volcado
// en bruto. Importar reemplaza TODO, con validación y confirmación.

import { useRef, useState } from "react";
import { Boton, Aviso } from "../components/ui.jsx";
import { fFecha } from "../lib/fechas.js";

const CLAVE_BACKUP = "ftr_crm_v2_ultimo_backup";

function haceCuanto(iso) {
  const dias = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

export default function DatosTab({ doc, exportar, importar, sincronizarAhora }) {
  const inputFichero = useRef(null);
  const [aviso, setAviso] = useState(null);
  const [verBruto, setVerBruto] = useState(false);
  const [verGuia, setVerGuia] = useState(false);
  const [ultimoBackup, setUltimoBackup] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_BACKUP);
    } catch {
      return null;
    }
  });

  const nCarreras = doc.clientes.reduce((s, c) => s + (c.carreras?.length || 0), 0);
  const totalCobrado = doc.cobros
    .filter((c) => c.estado === "Cobrado")
    .reduce((s, c) => s + (Number(c.importe) || 0), 0);

  const backupAntiguo = ultimoBackup && Date.now() - Date.parse(ultimoBackup) > 7 * 86400000;

  const descargar = () => {
    exportar();
    const t = new Date().toISOString();
    try {
      localStorage.setItem(CLAVE_BACKUP, t);
    } catch {}
    setUltimoBackup(t);
    setAviso({ tono: "ok", txt: "Backup descargado. Guárdalo en tu ordenador o en Drive." });
  };

  const alImportar = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const lector = new FileReader();
    lector.onload = (ev) => {
      const texto = String(ev.target.result);
      let parsed;
      try {
        parsed = JSON.parse(texto);
      } catch {
        return setAviso({ tono: "error", txt: "El archivo no es un JSON válido." });
      }
      if (!Array.isArray(parsed?.clientes)) {
        return setAviso({
          tono: "error",
          txt: "El archivo no parece un backup de este CRM (no tiene lista de clientes).",
        });
      }
      const nCli = parsed.clientes.length;
      const nCob = Array.isArray(parsed.cobros) ? parsed.cobros.length : 0;
      const ok = window.confirm(
        `Vas a REEMPLAZAR todos los datos actuales (${doc.clientes.length} clientes, ${doc.cobros.length} cobros) ` +
          `por los del archivo «${f.name}» (${nCli} clientes, ${nCob} cobros).\n\n` +
          `Esto no se puede deshacer. ¿Continuar?`
      );
      if (!ok) return;
      const r = importar(texto);
      setAviso(
        r.ok
          ? { tono: "ok", txt: `Backup importado: ${r.clientes} clientes, ${r.cobros} cobros.` }
          : { tono: "error", txt: r.error }
      );
    };
    lector.readAsText(f);
  };

  return (
    <div>
      <div className="tarjeta" style={{ marginTop: 0 }}>
        <h3 style={{ marginTop: 0 }}>Copia de seguridad</h3>
        <p className="pista">
          El CRM guarda todo automáticamente en la nube. Aun así, descarga una copia de vez en cuando y
          guárdala aparte (ordenador, Drive…).
        </p>

        {ultimoBackup ? (
          <Aviso tono={backupAntiguo ? "error" : "info"}>
            Última copia descargada: {haceCuanto(ultimoBackup)} ({fFecha(ultimoBackup.slice(0, 10))}).
            {backupAntiguo ? " Hace más de una semana — descarga una nueva." : ""}
          </Aviso>
        ) : (
          <Aviso tono="error">Aún no has descargado ninguna copia desde este navegador. Hazlo ahora.</Aviso>
        )}

        <div className="barra-superior" style={{ marginTop: 12, marginBottom: 0 }}>
          <Boton variante="primario" onClick={descargar}>
            💾 Descargar backup (.json)
          </Boton>
          <Boton onClick={() => inputFichero.current?.click()}>📂 Importar backup</Boton>
          <Boton onClick={sincronizarAhora}>🔄 Sincronizar ahora</Boton>
          <input ref={inputFichero} type="file" accept=".json" hidden onChange={alImportar} />
        </div>
        {aviso && (
          <div style={{ marginTop: 12 }}>
            <Aviso tono={aviso.tono}>{aviso.txt}</Aviso>
          </div>
        )}
      </div>

      <div className="tarjeta">
        <h3 style={{ marginTop: 0 }}>Resumen</h3>
        <ul className="lista-simple">
          <li>
            <span>Clientes</span>
            <strong>{doc.clientes.length}</strong>
          </li>
          <li>
            <span>Cobros</span>
            <strong>{doc.cobros.length}</strong>
          </li>
          <li>
            <span>Carreras</span>
            <strong>{nCarreras}</strong>
          </li>
          <li>
            <span>Total cobrado (histórico)</span>
            <strong>{totalCobrado} €</strong>
          </li>
        </ul>
        <button className="enlace" style={{ marginTop: 12 }} onClick={() => setVerBruto((v) => !v)}>
          {verBruto ? "Ocultar" : "Ver"} datos en bruto
        </button>
        {verBruto && <div className="debug" style={{ marginTop: 8 }}>{JSON.stringify(doc, null, 2)}</div>}
      </div>

      <div className="tarjeta">
        <button className="enlace" onClick={() => setVerGuia((v) => !v)} style={{ fontWeight: 700 }}>
          {verGuia ? "▾" : "▸"} ℹ️ Cómo empezar (viniendo del CRM antiguo)
        </button>
        {verGuia && (
          <div className="pista" style={{ marginTop: 10, lineHeight: 1.6 }}>
            <p>
              Este CRM es <strong>nuevo y aparte</strong> del antiguo. No comparten datos. Empiezas con la
              base vacía y metes tus clientes a mano, una sola vez.
            </p>
            <ol style={{ paddingLeft: 18 }}>
              <li>Ve a <strong>Clientes → + Nuevo cliente</strong> y da de alta a cada persona (nombre, modalidad, importe, <strong>fecha de inicio real</strong> y <strong>fecha de pago</strong>).</li>
              <li>En cada ficha, añade sus <strong>cobros anteriores</strong>, sus <strong>carreras</strong> y marca las <strong>llamadas</strong> ya hechas.</li>
              <li>Cuando termines, <strong>descarga un backup</strong> aquí mismo.</li>
              <li>Comprueba en <strong>Inicio</strong> que los números cuadran.</li>
              <li>A partir de ahí, usa solo este CRM. El antiguo déjalo como está (no lo borres), por si acaso.</li>
            </ol>
            <p>Guarda esta dirección en favoritos y descarga un backup cada semana o dos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
