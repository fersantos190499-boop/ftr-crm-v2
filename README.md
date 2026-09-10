# Fuel to Run · CRM (v2)

Reconstrucción desde cero del CRM. Sin clientes en el código: **todos** viven en
la base de datos y se referencian por su `id` interno.

- **Stack:** Vite + React + JSX plano.
- **Base de datos:** Supabase, proyecto `duwcvzlcxdcbyvlxibrv`, tabla `ftr_crm`
  (una fila `id=1`, columna `data` JSONB con `{ clientes, cobros, meta }`).
- **Publicación:** GitHub Actions → GitHub Pages
  (`https://fersantos190499-boop.github.io/ftr-crm-v2/`).

## Cómo subir cambios en el futuro

Edita el código, haz *commit* y súbelo a GitHub (web o `git push`). GitHub lo
compila y lo publica solo en ~1 minuto. No hay que arrastrar ni compilar nada a mano.

## Desarrollo local (opcional)

```
npm install
npm run dev      # servidor local en http://localhost:5173/ftr-crm-v2/
npm test         # batería de tests (incluye el golden master de la lógica)
npm run build    # genera dist/ (lo que se publica)
```

## Puesta en marcha (una sola vez)

1. **Supabase** → SQL Editor → ejecutar:

   ```sql
   create table ftr_crm (
     id int primary key default 1,
     data jsonb not null default '{"clientes":[],"cobros":[],"meta":{"version":1}}'::jsonb,
     updated_at timestamptz not null default now()
   );
   insert into ftr_crm (id) values (1);
   alter table ftr_crm enable row level security;
   create policy "acceso anon" on ftr_crm for all using (true) with check (true);
   ```

2. **GitHub** → repo `ftr-crm-v2` → Settings → Pages → *Source* = **GitHub Actions**.

## Estructura

```
src/
  lib/
    fechas.js     fechas ISO ↔ días, formateo
    logica.js     semana de programa, semáforo, renovación, optimización, carreras
    estado.js     ESTADOS + regla central esActivo()
    supabase.js   cargar() / guardar()
    store.jsx     hook useStore(): data, actualizar(), backup/restore, estado de sync
  test/
    logica.test.js            tests de lógica + fechas + estado
    legacy-calc.reference.js  copia congelada del calc() anterior (golden master)
  App.jsx         interfaz (Fase 1: comprobación de la base)
```
