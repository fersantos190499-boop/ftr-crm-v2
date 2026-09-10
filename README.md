# Fuel to Run · CRM (v2)

Reconstrucción desde cero del CRM. Sin clientes en el código: **todos** viven en
la base de datos y se referencian por su `id` interno (nunca por el nombre).

- **Stack:** Vite + React + JSX plano.
- **Base de datos:** Supabase, proyecto `duwcvzlcxdcbyvlxibrv`, tabla `ftr_crm`
  (una fila `id=1`, columna `data` JSONB con `{ clientes, cobros, meta }`).
- **Publicación:** GitHub Actions → GitHub Pages
  (`https://fersantos190499-boop.github.io/ftr-crm-v2/`).

## Cómo subir cambios en el futuro

Edita el código, haz *commit* y súbelo a GitHub (web o `git push`). GitHub lo
compila y lo publica solo en ~1 minuto. No hay que arrastrar ni compilar nada a mano.

## Pasar del CRM antiguo a este (una sola vez)

Este CRM es **nuevo y aparte** del antiguo (`ftr-crm`). No comparten datos ni
base de datos. Se empieza con la base vacía y se reintroducen los clientes a mano.

1. **Clientes → + Nuevo cliente**: alta de cada persona (nombre, modalidad,
   importe, **fecha de inicio real** y **fecha de pago** — pueden ser distintas).
2. En cada ficha: añadir **cobros anteriores**, **carreras**, y marcar las
   **llamadas** ya hechas. Ajustar el estado (Activo / Renovado / Finalizado / Baja).
3. Al terminar: **Datos → Descargar backup**.
4. Comprobar en **Inicio** que los números cuadran.
5. A partir de ahí, usar solo este CRM. El antiguo se deja como está (no borrar),
   como referencia.
6. Guardar la URL en favoritos. Descargar un backup cada semana o dos.

## Desarrollo local (opcional)

```
npm install
npm run dev      # servidor local en http://localhost:5173/ftr-crm-v2/
npm test         # batería de tests (golden master de la lógica + renovación + panel)
npm run build    # genera dist/ (lo que se publica)
```

## Puesta en marcha de infraestructura (ya hecho)

1. **Supabase** → SQL Editor:

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
    fechas.js      fechas ISO ↔ días, formateo
    logica.js      semana de programa, semáforo, semanas de renovación/optimización
    estado.js      ESTADOS + regla central esActivo()  (Renovado cuenta como activo)
    clientes.js    constructores (cliente/cobro/carrera) + marcar llamadas
    renovacion.js  renovarCliente(): actualiza el MISMO registro, sin duplicar
    consultas.js   selectores transversales (llamadas, carreras, cobros por mes, panel)
    supabase.js    cargar() / guardar()
    store.jsx      useStore(): data, actualizar(), backup/restore, estado de sync
  components/ui.jsx   Boton, Campo, Selector, Modal, tabla…
  forms/         NuevoClienteForm, RenovacionForm, CobroForm, CarreraForm
  fichas/FichaCliente.jsx   vista única editable del cliente
  tabs/          InicioTab, ClientesTab, LlamadasTab, CarrerasTab, CobrosTab, DatosTab
  test/          logica / clientes / renovacion / consultas / panel  (10k+ asserts)
```

## Modelo de datos (documento `data`)

- **clientes[]**: `id`, `nombre`, `estado`, `modalidad`, `semanasTotal`,
  `fechaInicio` (real, manda en semana de programa y renovaciones), `importe`,
  `fraccionado`, `metodoPago`, `estadoPago`, `objetivoCorto/Largo`,
  `semanasPrevias`, `numRenovaciones`, `notas`, `llamadaRenovacion`,
  `llamadasOptimizacion`, `carreras[]`, `historialCiclos[]`.
- **cobros[]**: `id`, `clienteId` (siempre por id), `fechaPago` (mes de
  facturación), `concepto`, `importe`, `metodo`, `estado`, `nota`.
