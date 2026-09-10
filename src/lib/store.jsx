// ─── STORE ────────────────────────────────────────
// Estado global del CRM: un único documento { clientes, cobros, meta }.
// - Cache en localStorage para pintar rápido y trabajar sin conexión.
// - Supabase es la fuente de verdad: no se guarda NADA hasta haber cargado
//   primero de Supabase (o haber fallado explícitamente).
// - Guardado con "debounce": los cambios se agrupan y suben 1,5 s después.

import { useState, useRef, useCallback, useEffect } from "react";
import { cargar, guardar } from "./supabase.js";

export const DOCUMENTO_VACIO = { clientes: [], cobros: [], meta: { version: 1 } };

export const SYNC = {
  INICIAL: "inicial",
  CARGANDO: "cargando",
  SINCRONIZADO: "sincronizado",
  GUARDANDO: "guardando",
  ERROR: "error",
};

const CLAVE_LOCAL = "ftr_crm_v2";

function normaliza(d) {
  return {
    clientes: Array.isArray(d?.clientes) ? d.clientes : [],
    cobros: Array.isArray(d?.cobros) ? d.cobros : [],
    meta: { version: 1, ...(d && typeof d.meta === "object" ? d.meta : {}) },
  };
}

export function useStore() {
  const [data, setData] = useState(DOCUMENTO_VACIO);
  const [listo, setListo] = useState(false);
  const [sync, setSync] = useState(SYNC.INICIAL);
  const [ultimaSync, setUltimaSync] = useState(null);

  const ultimo = useRef(data); // último documento (para guardados diferidos)
  const cargado = useRef(false); // ⚑ bloquea guardados hasta cargar de Supabase
  const timer = useRef(null);

  useEffect(() => {
    (async () => {
      // 1) cache local
      try {
        const cache = localStorage.getItem(CLAVE_LOCAL);
        if (cache) {
          const p = normaliza(JSON.parse(cache));
          setData(p);
          ultimo.current = p;
        }
      } catch {
        /* cache corrupta: se ignora */
      }
      setListo(true);
      setSync(SYNC.CARGANDO);

      // 2) Supabase manda
      try {
        const remoto = await cargar();
        if (remoto) {
          const p = normaliza(remoto);
          setData(p);
          ultimo.current = p;
          try {
            localStorage.setItem(CLAVE_LOCAL, JSON.stringify(p));
          } catch {}
        }
        cargado.current = true;
        setSync(SYNC.SINCRONIZADO);
        setUltimaSync(new Date());
      } catch (e) {
        console.warn("Supabase cargar:", e.message);
        cargado.current = true; // permite trabajar con la cache local
        setSync(SYNC.ERROR);
      }
    })();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const programarGuardado = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setSync(SYNC.GUARDANDO);
    timer.current = setTimeout(async () => {
      if (!cargado.current) return; // nunca guardar antes de haber cargado
      try {
        await guardar(ultimo.current);
        setSync(SYNC.SINCRONIZADO);
        setUltimaSync(new Date());
      } catch (e) {
        console.warn("Supabase guardar:", e.message);
        setSync(SYNC.ERROR);
      }
    }, 1500);
  }, []);

  // actualizar(fn) — fn recibe el documento actual y devuelve el nuevo.
  const actualizar = useCallback(
    (fn) => {
      setData((prev) => {
        const next = normaliza(typeof fn === "function" ? fn(prev) : fn);
        next.meta = { ...next.meta, actualizado: new Date().toISOString() };
        ultimo.current = next;
        try {
          localStorage.setItem(CLAVE_LOCAL, JSON.stringify(next));
        } catch {}
        programarGuardado();
        return next;
      });
    },
    [programarGuardado]
  );

  const sincronizarAhora = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    setSync(SYNC.GUARDANDO);
    try {
      await guardar(ultimo.current);
      setSync(SYNC.SINCRONIZADO);
      setUltimaSync(new Date());
    } catch (e) {
      console.warn("Supabase guardar:", e.message);
      setSync(SYNC.ERROR);
    }
  }, []);

  const exportar = useCallback(() => {
    const blob = new Blob([JSON.stringify(ultimo.current, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ftr-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  // importar(texto) — reemplaza TODO el documento con el del backup.
  const importar = useCallback(
    (jsonStr) => {
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        return { ok: false, error: "El archivo no es un JSON válido." };
      }
      const p = normaliza(parsed);
      setData(p);
      ultimo.current = p;
      try {
        localStorage.setItem(CLAVE_LOCAL, JSON.stringify(p));
      } catch {}
      cargado.current = true;
      programarGuardado();
      return { ok: true, clientes: p.clientes.length, cobros: p.cobros.length };
    },
    [programarGuardado]
  );

  return { data, actualizar, listo, sync, ultimaSync, sincronizarAhora, exportar, importar };
}
