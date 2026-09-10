// ─── PESTAÑA DATOS ────────────────────────────────
import { useRef, useState } from "react";
import { Boton, Aviso } from "../components/ui.jsx";

export default function DatosTab({ doc, exportar, importar, sincronizarAhora }) {
  const inputFichero = useRef(null);
  const [aviso, setAviso] = useState(null);

  const alImportar = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!window.confirm(`Vas a reemplazar TODOS los datos actuales por los del archivo «${f.name}». ¿Continuar?`)) return;
    const lector = new FileReader();
    lector.onload = (ev) => {
      const r = importar(String(ev.target.result));
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
          El CRM guarda todo automáticamente en Supabase. Aun así, descarga una copia cada cierto tiempo
          y guárdala en tu ordenador o en Drive.
        </p>
        <div className="barra-superior" style={{ marginBottom: 0 }}>
          <Boton variante="primario" onClick={exportar}>
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
        <h3 style={{ marginTop: 0 }}>
          Contenido actual · {doc.clientes.length} clientes · {doc.cobros.length} cobros
        </h3>
        <div className="debug">{JSON.stringify(doc, null, 2)}</div>
      </div>
    </div>
  );
}
