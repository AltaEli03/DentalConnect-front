# Experiencia del paciente con Tailwind híbrido — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar el recorrido del paciente con Tailwind, estados de carga/error/éxito, accesibilidad y una identidad visual consistente, sin tocar los flujos administrativos.

**Architecture:** Tailwind v4 se suma con capas CSS (`theme, base, legacy, utilities`): el CSS existente queda en `legacy`, las pantallas del paciente usan utilidades y componentes propios, y administración/auth conservan su apariencia. La lógica compartida de citas se extrae a `src/lib/appointments.ts`.

**Tech Stack:** React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4.3.5, `@tailwindcss/vite` 4.3.5, Fontsource Inter/Outfit 5.3.0, Vitest 4.1.11 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-13-paciente-tailwind-hybrid-design.md`

## Global Constraints

- No cambiar contratos de API ni agregar endpoints.
- No agregar manifest ni service worker.
- Mantener español `es-MX` y zona `America/Mexico_City`.
- Tailwind solo en pantallas del paciente; administración y auth conservan CSS legado.
- Todo elemento interactivo debe ser alcanzable por teclado y mostrar foco visible.
- Los errores se anuncian con `role="alert"`; los estados con `role="status"`.
- Cada tarea termina con `npm run lint` y `npm test` en verde y un commit.

## Review Focus

- Consultorio sin imagen o con URL rota: debe verse un respaldo, nunca un icono roto.
- API caída o lenta: la pantalla debe explicar qué pasó y ofrecer reintento sin perder la selección.
- Solicitud enviada dos veces por doble clic o reintento: la clave de idempotencia debe reutilizarse.
- Propuesta rechazada por accidente: debe existir una confirmación explícita antes de llamar al API.
- Filtros del directorio al volver del detalle: la búsqueda debe conservarse.

---

### Task 1: Infraestructura Tailwind y capas CSS

**Files:**
- Modify: `package.json`, `vite.config.ts`, `src/styles.css`, `src/main.tsx`
- Test: build y suite existente

**Interfaces:**
- Produces: utilidades Tailwind (`bg-brand`, `text-ink`, `font-display`, `rounded-card`, etc.) disponibles en toda la app.

- [ ] **Step 1: Instalar dependencias medidas**

```bash
npm install tailwindcss@4.3.5 @tailwindcss/vite@4.3.5 @fontsource-variable/inter@5.3.0 @fontsource-variable/outfit@5.3.0
```

- [ ] **Step 2: Registrar el plugin en `vite.config.ts`**

```ts
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwindcss()] });
```

- [ ] **Step 3: Reordenar `src/styles.css`**

Antes del CSS existente:

```css
@layer theme, base, legacy, utilities;

@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);

@theme {
  --font-sans: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;
  --font-display: 'Outfit Variable', 'Inter Variable', ui-sans-serif, sans-serif;
  --color-brand: #003b4a;
  --color-brand-strong: #002a36;
  --color-accent: #007c83;
  --color-accent-strong: #005b63;
  --color-coral: #b6412c;
  --color-coral-strong: #963622;
  --color-canvas: #f5f8fa;
  --color-ink: #0f172a;
  --color-muted: #425466;
  --color-subtle: #596b7a;
  --color-line: #e2e8f0;
  --color-line-strong: #cbd5e1;
  --color-danger: #a72b24;
  --color-danger-strong: #8e211b;
  --color-success: #087443;
  --radius-card: 1.25rem;
  --radius-control: 0.75rem;
}

@layer legacy {
  /* todo el CSS actual, sin cambios de valores */
}
```

- [ ] **Step 4: Cargar las fuentes en `src/main.tsx`**

```ts
import '@fontsource-variable/inter/latin.css';
import '@fontsource-variable/outfit/latin.css';
```

Si el paquete no expone `latin.css`, usar el `index.css` del paquete y verificar el tamaño del build.

- [ ] **Step 5: Verificar**

Run: `npm run build && npm run lint`
Expected: build correcto y CSS generado con utilidades. La suite puede seguir con fallos conocidos de tests desactualizados; se corrigen en las tareas 3–8.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/styles.css src/main.tsx
git commit -m "build: add tailwind v4 with layered legacy css"
```

---

### Task 2: Utilidades compartidas y primitivas de interfaz

**Files:**
- Create: `src/lib/appointments.ts`, `src/components/ui/Button.tsx`, `src/components/ui/Notice.tsx`, `src/components/ui/StatusBadge.tsx`, `src/components/ui/Skeleton.tsx`
- Modify: `src/components/ContentImage.tsx`
- Test: `src/lib/appointments.test.ts`, `src/components/ui/Button.test.tsx`, `src/components/ui/Notice.test.tsx`, `src/components/ContentImage.test.tsx`

**Interfaces:**
- Produces: `formatDateTime(value?: string | null): string`, `formatTime(value?: string | null): string`, `localToday(): string`, `statusLabels`, `statusTone(status?: string): 'pending' | 'confirmed' | 'proposed' | 'rejected' | 'cancelled'`.
- Produces: `buttonStyles(variant?, size?, className?): string` y `<Button variant size loading>`.
- Produces: `<Notice tone="info" | "success" | "error">`, `<StatusBadge status>`, `<Skeleton className>`.
- Produces: `<ContentImage src alt className>` con respaldo accesible.

- [ ] **Step 1: Escribir los tests de `appointments`**

```ts
expect(formatTime('2026-11-20T17:00:00Z')).toBe('11:00');
expect(formatDateTime('2026-11-20T17:00:00Z')).toMatch(/20 nov 2026/);
expect(localToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
expect(statusLabels.PROPOSED).toBe('Con propuesta');
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npx vitest run src/lib/appointments.test.ts`
Expected: FAIL porque el módulo no existe.

- [ ] **Step 3: Implementar `src/lib/appointments.ts`**

Usar `Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City' })`. `formatTime` con `hour: '2-digit', minute: '2-digit', hour12: false`. `localToday` con `en-CA`.

- [ ] **Step 4: Escribir tests de Button y Notice**

```tsx
render(<Button loading>Guardar</Button>);
expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');

render(<Notice tone="error">No se pudo cargar</Notice>);
expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar');
```

- [ ] **Step 5: Implementar las primitivas**

`Button` usa `buttonStyles`; variantes: primary (brand), coral (CTA), outline, ghost, danger. `Notice` usa `role="alert"` para error y `role="status"` para el resto. `StatusBadge` muestra texto y color, nunca solo color. `Skeleton` usa `animate-pulse` y `aria-hidden`.

- [ ] **Step 6: Convertir `ContentImage` a Tailwind y probar el respaldo**

```tsx
render(<ContentImage alt="Consultorio" />);
expect(screen.getByRole('img', { name: /Imagen no disponible/ })).toBeInTheDocument();
```

- [ ] **Step 7: Verificar y commit**

Run: `npm run lint && npx vitest run src/lib src/components`
Expected: PASS.
```bash
git add src/lib src/components
git commit -m "feat: add patient ui primitives and appointment helpers"
```

---

### Task 3: Directorio de consultorios

**Files:**
- Modify: `src/pages/ClinicListPage.tsx`, `src/components/ClinicCard.tsx`, `src/components/ClinicCard.test.tsx`
- Create: `src/pages/ClinicListPage.test.tsx`

**Interfaces:**
- Consumes: `api.clinics(search?, serviceId?)`, `filterNearbyClinics`, `Button`, `Notice`, `Skeleton`, `ContentImage`.
- Produces: `/clinics?q=<texto>&servicio=<id>` como estado de búsqueda; `ClinicCard` recibe `from?: string` y enlaza el detalle con `state={{ from }}`.

- [ ] **Step 1: Escribir tests del directorio**

```tsx
render(<App />, { wrapper: MemoryRouter, initialEntries: ['/clinics?q=Puebla&servicio=s1'] });
await waitFor(() => expect(api.clinics).toHaveBeenCalledWith('Puebla', 's1'));
```

Probar también: enviar el formulario actualiza la URL, el error muestra “Reintentar” y vuelve a llamar al API, y con 7 resultados la página 2 muestra el séptimo.

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npx vitest run src/pages/ClinicListPage.test.tsx`
Expected: FAIL por la UI actual.

- [ ] **Step 3: Reescribir `ClinicCard`**

`<article>` con `ContentImage`, ubicación, nombre en `h3`, descripción, hasta 3 servicios, distancia y `<Link className={buttonStyles('outline','sm')}>Ver consultorio</Link>`. Sin calificaciones inventadas.

- [ ] **Step 4: Reescribir `ClinicListPage`**

- Leer `q` y `servicio` de `useSearchParams`; el formulario actualiza la URL.
- Un solo efecto de búsqueda: llama `api.clinics(q, servicio)`; si hay filtros y el catálogo está vacío, carga el catálogo completo para las opciones de servicio.
- `loading`: 3 skeletons con `aria-hidden` y un `role="status"` visible.
- Error: `Notice tone="error"` con botón “Reintentar”.
- Vacío: invitación a cambiar zona o servicio.
- Paginación de 6 con botones de 44 px, `aria-current="page"` y resumen “Mostrando X–Y de N”.
- Geolocalización: mensaje `role="status"`; botón deshabilitado mientras busca.
- Pasar `from={location.search}` a cada tarjeta.

- [ ] **Step 5: Verificar y commit**

Run: `npm run lint && npx vitest run src/pages/ClinicListPage.test.tsx src/components/ClinicCard.test.tsx`
Expected: PASS.
```bash
git add src/pages/ClinicListPage.tsx src/pages/ClinicListPage.test.tsx src/components/ClinicCard.tsx src/components/ClinicCard.test.tsx
git commit -m "feat: rebuild clinic directory with tailwind and url filters"
```

---

### Task 4: Ficha del consultorio y perfil del dentista

**Files:**
- Modify: `src/pages/ClinicDetailPage.tsx`, `src/pages/DentistProfilePage.tsx`
- Create: `src/pages/ClinicDetailPage.test.tsx`, `src/pages/DentistProfilePage.test.tsx`

**Interfaces:**
- Consumes: `Button`, `Notice`, `Skeleton`, `ContentImage`, `api.clinic`.
- Produces: enlace “Volver al directorio” que respeta `location.state.from`; enlaces de solicitud con `serviceId` y `dentistId`.

- [ ] **Step 1: Escribir tests**

```tsx
render(<App />, { wrapper: MemoryRouter, initialEntries: [{ pathname: '/clinics/c1', state: { from: '?q=Puebla' } }] });
expect(await screen.findByRole('link', { name: /Volver al directorio/ })).toHaveAttribute('href', '/clinics?q=Puebla');
```

Probar error 404 con reintento y perfil de dentista con servicio que enlaza a `/solicitar?serviceId=...&dentistId=...`.

- [ ] **Step 2: Reescribir ambas pantallas**

Ficha: breadcrumb, imagen con respaldo, datos de contacto, servicios en tarjetas con precio/duración y CTA “Solicitar atención”, equipo dental con enlaces. Perfil: cabecera con imagen, especialidad, biografía, servicios y CTA que conserva ambos ids.

- [ ] **Step 3: Verificar y commit**

Run: `npm run lint && npx vitest run src/pages/ClinicDetailPage.test.tsx src/pages/DentistProfilePage.test.tsx`
Expected: PASS.
```bash
git add src/pages/ClinicDetailPage.tsx src/pages/ClinicDetailPage.test.tsx src/pages/DentistProfilePage.tsx src/pages/DentistProfilePage.test.tsx
git commit -m "feat: rebuild clinic and dentist detail with tailwind"
```

---

### Task 5: Solicitud de cita

**Files:**
- Modify: `src/pages/AppointmentRequestPage.tsx`, `src/pages/AppointmentRequestPage.test.tsx`

**Interfaces:**
- Consumes: `api.clinic`, `api.availability`, `api.createAppointment`, `Button`, `Notice`, `formatDateTime`, `formatTime`, `localToday`.
- Produces: clave de idempotencia estable por horario seleccionado; enlace final a `/mi-solicitud/:id`.

- [ ] **Step 1: Actualizar el test existente**

Mantener la aserción de `api.createAppointment(body, 'test-key-123')`; consultar el horario por su etiqueta de hora (`11:00`) y enviar con el botón “Enviar solicitud”. Agregar: error del API muestra `role="alert"` y permite reintentar; sin sesión muestra el enlace “Inicia sesión para agendar”.

- [ ] **Step 2: Reescribir la pantalla**

Stepper `<ol>` de 3 pasos, tarjetas por paso, resumen sticky con `<dl>`, selector de fecha, slots como botones con `aria-pressed` y etiqueta completa, aviso de “sin costo / el consultorio confirma”, éxito con folio y enlace al estado. Generar `crypto.randomUUID()` al elegir horario y reutilizarla al reintentar.

- [ ] **Step 3: Verificar y commit**

Run: `npm run lint && npx vitest run src/pages/AppointmentRequestPage.test.tsx`
Expected: PASS.
```bash
git add src/pages/AppointmentRequestPage.tsx src/pages/AppointmentRequestPage.test.tsx
git commit -m "feat: rebuild appointment request flow with tailwind"
```

---

### Task 6: Respuesta a propuesta

**Files:**
- Modify: `src/pages/AppointmentProposalPage.tsx`, `src/pages/AppointmentProposalPage.test.tsx`

**Interfaces:**
- Consumes: `api.proposal`, `api.acceptProposal`, `api.rejectProposal`, `StatusBadge`, `Notice`, `Button`, `formatDateTime`.
- Produces: confirmación en dos pasos para rechazar; estados `PENDING`, `PROPOSED`, `CONFIRMED`, `REJECTED`, `CANCELLED`.

- [ ] **Step 1: Actualizar tests**

Aceptar: “Aceptar horario propuesto” → estado confirmado. Rechazar: primer clic en “Rechazar propuesta” muestra “¿Seguro que quieres rechazar?” y solo “Sí, rechazar propuesta” llama al API. Probar error 409 y 401.

- [ ] **Step 2: Reescribir la pantalla**

Comparación de horarios en dos tarjetas, vencimiento, badge de estado, acciones con confirmación inline y `busy`. Sin emojis. Enlace de regreso al directorio.

- [ ] **Step 3: Verificar y commit**

Run: `npm run lint && npx vitest run src/pages/AppointmentProposalPage.test.tsx`
Expected: PASS.
```bash
git add src/pages/AppointmentProposalPage.tsx src/pages/AppointmentProposalPage.test.tsx
git commit -m "feat: rebuild appointment proposal response with confirmation"
```

---

### Task 7: Auth del paciente y verificación

**Files:**
- Modify: `src/pages/AuthPages.tsx`, `src/pages/AuthPages.test.tsx`

**Interfaces:**
- Consumes: `useSearchParams`, `api.verify`, `api.resend`.
- Produces: temporizador de reenvío con limpieza al desmontar; mensajes de error/estado anunciados.

- [ ] **Step 1: Agregar cleanup del intervalo**

Usar `useRef<number | undefined>` y un `useEffect(() => () => clearInterval(...), [])`; limpiar antes de iniciar uno nuevo.

- [ ] **Step 2: Verificar el parámetro de correo y los roles**

`VerifyPage` debe leer `email` de `useSearchParams` (ya en la rama). Confirmar con test.

- [ ] **Step 3: Verificar y commit**

Run: `npm run lint && npx vitest run src/pages/AuthPages.test.tsx`
Expected: PASS.
```bash
git add src/pages/AuthPages.tsx src/pages/AuthPages.test.tsx
git commit -m "fix: clean up verification resend timer"
```

---

### Task 8: Administración consistente y tests desactualizados

**Files:**
- Modify: `src/pages/AppointmentManagementPage.tsx`, `src/pages/AppointmentManagementPage.test.tsx`, `src/styles.css`
- Modify: `src/pages/DentistManagementPage.tsx` solo si falta una clase visual

**Interfaces:**
- Produces: `aria-label="Detalle de solicitud"` en el panel de detalle y texto accesible en los puntos de estado.

- [ ] **Step 1: Actualizar `openDetail` del test**

```ts
const openDetail = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /Ana Pérez/ }));
  return screen.findByRole('heading', { name: 'Ana Pérez' });
};
```

Ajustar etiquetas: “Proponer horario seleccionado”, “Selecciona una fecha”, “Horario Propuesto”, “Fecha Solicitada”.

- [ ] **Step 2: Añadir el `aria-label` al panel de detalle y texto oculto al punto de estado**

- [ ] **Step 3: Completar clases legadas faltantes**

Ejecutar el comparador de clases usadas/definidas y agregar al `@layer legacy` solo las que afectan layout de administración (`form-panel`, `dentist-card`, `dentist-list`, `schedule-grid`, `schedule-column`, `checkbox-grid`, `checkbox-pill`, `form-actions`, `icon-btn`, `input-with-button`, `services-fieldset`). No duplicar las que ya existen.

- [ ] **Step 4: Verificar y commit**

Run: `npm run lint && npm test`
Expected: 22+ tests PASS, incluidos los de administración.
```bash
git add src/pages/AppointmentManagementPage.tsx src/pages/AppointmentManagementPage.test.tsx src/pages/DentistManagementPage.tsx src/styles.css
git commit -m "fix: align admin screens with current ui and complete legacy styles"
```

---

### Task 9: Verificación integral

**Files:** ninguno; solo verificación y evidencia.

- [ ] **Step 1: Suite completa**

Run: `npm run lint && npm test && npm run build`
Expected: todo en verde; revisar el tamaño de `dist/assets/*.css` y `*.js`.

- [ ] **Step 2: Revisión manual**

- Tabular por el flujo completo: directorio → ficha → dentista → solicitud → propuesta.
- Verificar skip link, foco visible, `aria-current`, labels y errores.
- Revisar 360, 768 y 1280 px.
- Comprobar que administración y auth conservan su apariencia.

- [ ] **Step 3: Contraste**

Verificar los pares medidos en la spec y cualquier color nuevo con el script de luminancia. No introducir texto por debajo de 4.5:1.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "test: verify patient flow accessibility and responsive behavior"
```
