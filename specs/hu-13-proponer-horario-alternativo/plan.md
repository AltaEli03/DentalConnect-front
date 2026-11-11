# HU-13 Proponer un horario alternativo · Plan de implementación (frontend)

> **Para el agente:** ejecutar con TDD. Cada tarea termina con su verificación. No commitear la Fase A sola (skill `vertical-slice`).

**Goal:** que un `CLINIC_ADMIN` proponga un horario alternativo desde la pantalla de solicitudes, conserve el horario original y vea la propuesta activa sin poder crear una segunda.

**Architecture:** la pantalla `AppointmentManagementPage` ya lista y detalla solicitudes. Se extiende con una sección de propuesta que consulta la disponibilidad pública del mismo dentista/servicio, llama al endpoint del back `POST /api/appointments/{id}/propose` mediante la ruta relativa `/appointments/{id}/propose` y refresca lista/detalle. No se crean rutas, servicios ni endpoints nuevos.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, vitest 4, @testing-library/react 16, `fetch` nativo.

**Spec:** `specs/hu-13-proponer-horario-alternativo/spec.md`

**Contrato del back:** `DentalConnect-back/specs/hu-13-proponer-horario-alternativo/spec.md` (DENT-13, PR #16). No modificarlo.

## Global Constraints

- No agregar dependencias, rutas ni endpoints.
- La URL base del API se resuelve en `src/services/api.ts`; la base ya incluye `/api`, así que la página usa rutas relativas sin `/api` (`/appointments`, `/appointments/{id}`, `/clinics/.../availability`). Corregir el duplicado `/api/api/...` existente.
- Zona del piloto `America/Mexico_City`; el back persiste UTC.
- La propuesta conserva consultorio, dentista y servicio; solo cambia el inicio.
- Una sola propuesta activa: si el estado es `PROPOSED`, no se muestra el formulario.
- La propuesta no reserva: la UI no debe decir “reservado” ni “confirmado”.
- Errores del API: mostrar `error.message`; no inventar mensajes para códigos nuevos.
- `409 PROPOSAL_ALREADY_ACTIVE` debe dejar la UI en el estado `PROPOSED` tras refrescar.
- Accesibilidad: `label` asociado, botones nativos, `aria-pressed`, `role="alert"` y `role="status"`.
- Sin `TODO`; usar `NOTE (DENT-14)`, `NOTE (DENT-15)` y `NOTE (DENT-31)` cuando aplique.
- Prettier solo sobre los archivos tocados: `npx prettier --write src/pages/AppointmentManagementPage.tsx src/pages/AppointmentManagementPage.test.tsx src/services/api.ts`.
- **Staging selectivo:** el árbol tiene cambios de fin de línea (CRLF) en casi todo el repo y `package-lock.json` modificado. No usar `git add -A`; agregar solo los archivos de la HU. No commitear `.agents/` ni `.opencode/`.
- Rama: `Sprint-7-Eliuth` (convención `Sprint-NN-<integrante>`; el issue asignado es Eliuth). Si el equipo confirma otra rama, usar esa y citar `DENT-13` en commits.
- Commits: `Sprint 7: <resumen> (HU-13 · DENT-13)`.

## Review Focus

1. El formulario solo aparece en `PENDING`; en `PROPOSED` se ven ambos horarios y el vencimiento.
2. El slot igual al horario original no se ofrece y el body envía exactamente `{ proposedStartsAt }`.
3. Un `409` no deja un estado optimista: se muestra el error y se refresca lista/detalle.
4. La fecha mínima es hoy local y la consulta usa `clinicId`, `dentistId`, `dentalServiceId` del detalle.
5. La página sigue funcionando con el contrato real: listado con `data[]`, detalle con `data`, disponibilidad con `{ data, timeZone }`, y ninguna URL contiene `/api/api/`.

## File Structure

| Archivo                                                        | Responsabilidad                                                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/services/api.ts`                                          | Exportar `apiBaseUrl()` y reutilizarla en `request`.                                                           |
| `src/pages/AppointmentManagementPage.tsx`                      | Tipos, normalización, filtro/etiqueta `PROPOSED`, sección de propuesta, disponibilidad, envío y visualización. |
| `src/pages/AppointmentManagementPage.test.tsx`                 | Pruebas de página con `fetch` simulado y `currentIdToken` mockeado.                                            |
| `specs/hu-13-proponer-horario-alternativo/{spec,plan,task}.md` | Spec, plan y checklist.                                                                                        |

---

### Task 1: Centralizar la URL base del API

**Files:**

- Modify: `src/services/api.ts`
- Modify: `src/pages/AppointmentManagementPage.tsx`

**Interfaces:**

- Produces: `export function apiBaseUrl(): string`.
- Consumes: `import.meta.env.VITE_API_BASE_URL`, `import.meta.env.DEV`.

- [ ] **Step 1: Extraer la función**

En `src/services/api.ts`:

```ts
export function apiBaseUrl(): string {
  const baseUrl = (
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    (import.meta.env.DEV ? 'http://localhost:3000/api' : '')
  ).replace(/\/+$/, '');
  if (!baseUrl) throw new Error('La URL de la API no está configurada para este ambiente.');
  return baseUrl;
}
```

`request` deja de calcular `baseUrl` y usa `apiBaseUrl()`.

- [ ] **Step 2: Usarla en la página y quitar el `/api` duplicado**

En `AppointmentManagementPage.tsx`, importar `apiBaseUrl` y reemplazar la constante local `apiBase` por `const base = apiBaseUrl();` dentro de `request`. Eliminar el chequeo duplicado de URL vacía.

Cambiar las rutas de la página (la base ya termina en `/api`):

- `/api/appointments` → `/appointments`
- `/api/appointments/{id}` → `/appointments/{id}`
- `/api/appointments/{id}/confirm|reject` → `/appointments/{id}/confirm|reject`
- `/api/clinics/.../availability` → `/clinics/.../availability`

- [ ] **Step 3: Verificar que no rompe lo existente**

```bash
npm test
npm run lint
```

Expected: 7/7 pruebas existentes en verde y lint sin errores nuevos. Esta tarea es preparatoria: aún no hay pruebas de la HU.

---

### Task 2: Pruebas RED de la página

**Files:**

- Create: `src/pages/AppointmentManagementPage.test.tsx`

**Interfaces:**

- Consumes: `AppointmentManagementPage`, `currentIdToken`, `apiBaseUrl()` ya centralizada.
- Produces: 5 pruebas que fijan el contrato de UI.

- [ ] **Step 1: Crear el archivo de pruebas**

Mocks base:

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentManagementPage } from './AppointmentManagementPage';
import { currentIdToken } from '../services/cognito';

vi.mock('../services/cognito', () => ({ currentIdToken: vi.fn() }));

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);

const appointment = (overrides: Record<string, unknown> = {}) => ({
  id: 'apt-1',
  folio: 'DC-1',
  status: 'PENDING',
  createdAt: '2026-11-01T12:00:00Z',
  startsAt: '2026-11-20T17:00:00Z',
  endsAt: '2026-11-20T17:30:00Z',
  clinicId: 'clinic-1',
  patient: { firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com', phone: '555' },
  dentist: { id: 'dentist-1', firstName: 'Luis', lastName: 'Mora' },
  service: { id: 'service-1', name: 'Limpieza', estimatedDurationMinutes: 30 },
  ...overrides,
});
```

`beforeEach`: `vi.clearAllMocks(); vi.mocked(currentIdToken).mockResolvedValue('token');`
`afterEach`: `cleanup(); vi.unstubAllGlobals();`

El mock de `fetch` debe ser **con estado** para la prueba 1: una variable `proposed` que el POST pone en `true` y que hace que el detalle posterior devuelva `PROPOSED` con sus tres campos. Así el refresco de `propose()` se prueba de verdad.

Casos:

1. `propone un horario alternativo y muestra ambos horarios`
   - Lista y detalle devuelven `PENDING` antes del POST y `PROPOSED` después; disponibilidad `{ data: [{ startsAt: '2026-11-20T17:00:00Z', endsAt: '2026-11-20T17:30:00Z' }, { startsAt: '2026-11-21T18:00:00Z', endsAt: '2026-11-21T18:30:00Z' }], timeZone: 'America/Mexico_City' }`.
   - Abrir detalle, esperar “Proponer horario alternativo”.
   - Verificar que el botón del horario original no existe y que el alternativo sí.
   - Elegirlo, enviar y comprobar el POST con `JSON.stringify({ proposedStartsAt: '2026-11-21T18:00:00Z' })`.
   - La URL real es absoluta (`http://localhost:3000/api/appointments/apt-1/propose`): usar `expect.stringContaining('/api/appointments/apt-1/propose')` y comprobar que no contiene `/api/api/`.
   - Tras el refresco, ver “Propuesta enviada”, “Horario original”, “Propuesta” y el vencimiento.
   - Verificar `aria-pressed` y el `label` “Fecha alternativa”.

2. `informa el conflicto de disponibilidad y conserva la solicitud pendiente`
   - POST responde `409 { error: { code: 'SLOT_UNAVAILABLE', message: 'El horario propuesto no está disponible' } }`.
   - Comprobar el mensaje con `role="alert"` y que no aparece “Propuesta enviada”.

3. `muestra la propuesta activa con ambos horarios y vencimiento`
   - Lista/detalle con `status: 'PROPOSED'` y los tres campos; la fila muestra la etiqueta “Con propuesta” y el horario propuesto.
   - Comprobar ambos horarios, el vencimiento y que no existe el botón “Proponer este horario”. No esperar “Propuesta enviada”: ese aviso solo aparece tras un POST en la misma sesión.

4. `filtra las solicitudes por estado propuesto`
   - Cambiar el selector “Estado” a “Con propuesta”.
   - Esperar que `fetch` reciba una URL que contenga `/api/appointments?status=PROPOSED` y no `/api/api/`.

5. `refresca a propuesta activa cuando el servidor responde PROPOSAL_ALREADY_ACTIVE`
   - Detalle inicial `PENDING`; el POST responde `409 { error: { code: 'PROPOSAL_ALREADY_ACTIVE', message: 'Ya existe una propuesta activa para esta solicitud' } }`; el detalle posterior devuelve `PROPOSED`.
   - Comprobar el mensaje, que desaparece el formulario y que se ven ambos horarios.

- [ ] **Step 2: Ejecutar y confirmar RED**

```bash
npm test -- src/pages/AppointmentManagementPage.test.tsx
```

Expected: falla porque la UI y los campos aún no existen. No debe fallar por imports, por URL no configurada ni por el mock.

- [ ] **Step 3: No commitear todavía**

La Fase A se commitea junto con la implementación.

---

### Task 3: Tipos, normalización, estado y filtro

**Files:**

- Modify: `src/pages/AppointmentManagementPage.tsx`
- Test: `src/pages/AppointmentManagementPage.test.tsx`

**Interfaces:**

- Consumes: campos del listado/detalle del back.
- Produces: `Appointment` con IDs, duración y campos de propuesta; etiqueta y filtro `PROPOSED`.

- [ ] **Step 1: Extender el tipo local**

```ts
type Appointment = {
  id: string;
  reference?: string;
  folio?: string;
  status: string;
  createdAt?: string;
  startsAt?: string;
  endsAt?: string;
  proposedStartsAt?: string;
  proposedEndsAt?: string;
  proposalExpiresAt?: string;
  clinicId?: string;
  dentistId?: string;
  dentalServiceId?: string;
  estimatedDurationMinutes?: number;
  patientFirstName?: string;
  patientLastName?: string;
  patientEmail?: string;
  patientPhone?: string;
  serviceName?: string;
  dentistName?: string;
  rejectionReason?: string;
};
```

`AppointmentDto` agrega `clinicId?`, `dentistId?`, `dentalServiceId?`, `dentist?: { id?: string }`, `service?: { id?: string; estimatedDurationMinutes?: number }`.

- [ ] **Step 2: Normalizar IDs y duración**

En `normalizeAppointment`:

```ts
clinicId: item.clinicId,
dentistId: item.dentistId || item.dentist?.id,
dentalServiceId: item.dentalServiceId || item.service?.id,
estimatedDurationMinutes: item.estimatedDurationMinutes ?? item.service?.estimatedDurationMinutes,
```

- [ ] **Step 3: Etiqueta y filtro**

```ts
const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  PROPOSED: 'Con propuesta',
};
```

Agregar `<option value="PROPOSED">Con propuesta</option>` al selector de estado.

- [ ] **Step 4: Mostrar el horario propuesto en la fila**

Si `item.status === 'PROPOSED'` y `item.proposedStartsAt`, agregar una línea:

```tsx
<p>Propuesta: {dateTime(item.proposedStartsAt)}</p>
```

- [ ] **Step 5: Ejecutar**

```bash
npm test -- src/pages/AppointmentManagementPage.test.tsx
```

Expected: avanza el caso 4; los demás siguen en rojo por la sección faltante.

---

### Task 4: Sección de propuesta, disponibilidad y envío

**Files:**

- Modify: `src/pages/AppointmentManagementPage.tsx`
- Test: `src/pages/AppointmentManagementPage.test.tsx`

**Interfaces:**

- Consumes: `request`, `clinicId`, `dentistId`, `dentalServiceId`, `startsAt`.
- Produces: sección “Proponer horario alternativo”; llamada a `POST /appointments/{id}/propose` (base + ruta); visualización de `PROPOSED`.

- [ ] **Step 1: Estado y helpers**

Importar el tipo existente: `import type { AvailabilitySlot } from '../types/api';`.

Agregar:

```ts
const [proposedDate, setProposedDate] = useState(localToday());
const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
const [loadingSlots, setLoadingSlots] = useState(false);
const [slotError, setSlotError] = useState('');
const [selectedProposed, setSelectedProposed] = useState('');
const [proposing, setProposing] = useState(false);
```

Helpers de fecha:

```ts
const timeZone = 'America/Mexico_City';
const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
const sameInstant = (a?: string, b?: string) =>
  !!a && !!b && new Date(a).getTime() === new Date(b).getTime();
```

- [ ] **Step 2: Reset al cambiar de solicitud**

En `openDetail`, después de `setSelected(...)`, reiniciar `proposedDate` a `localToday()`, `slots`, `selectedProposed`, `slotError`.

- [ ] **Step 3: Consultar disponibilidad**

`useEffect` dependiente de `selected`, `proposedDate` y `request`:

- Solo si `selected?.status === 'PENDING'` y existen `clinicId`, `dentistId`, `dentalServiceId`.
- `GET /clinics/{clinicId}/dentists/{dentistId}/availability?serviceId=...&date=...`.
- Guardar `data.data` en `slots`; filtrar el slot con `sameInstant(slot.startsAt, selected.startsAt)`.
- Manejar `loadingSlots` y `slotError`.

- [ ] **Step 4: Enviar la propuesta**

```ts
const propose = async () => {
  if (!selected || !selectedProposed) return;
  setProposing(true);
  setError('');
  setNotice('');
  let failure = '';
  try {
    await request('/appointments/' + encodeURIComponent(selected.id) + '/propose', {
      method: 'POST',
      body: JSON.stringify({ proposedStartsAt: selectedProposed }),
    });
  } catch (e) {
    failure = e instanceof Error ? e.message : 'No se pudo proponer el horario.';
  } finally {
    setProposing(false);
  }
  await load();
  await openDetail(selected.id);
  if (failure) setError(failure);
  else {
    setSelectedProposed('');
    setNotice(
      'Propuesta enviada. El paciente debe aceptarla o rechazarla; el horario no queda reservado.',
    );
  }
};
```

Si `openDetail` borra el error/aviso, asignarlos después como arriba.

- [ ] **Step 5: JSX del detalle**

En el detalle, después de “Horario”:

```tsx
{
  selected.proposedStartsAt && (
    <>
      <p>
        <strong>Horario original:</strong> {dateTime(selected.startsAt)} –{' '}
        {dateTime(selected.endsAt)}
      </p>
      <p>
        <strong>Propuesta:</strong> {dateTime(selected.proposedStartsAt)} –{' '}
        {dateTime(selected.proposedEndsAt)}
      </p>
      {selected.proposalExpiresAt && (
        <p>
          <strong>Vence:</strong> {dateTime(selected.proposalExpiresAt)}
        </p>
      )}
      <p className="notice">
        El paciente debe aceptar o rechazar la propuesta. La propuesta no reserva el horario.
      </p>
    </>
  );
}
{
  /* NOTE (DENT-14): aceptar/rechazar la propuesta es de HU-14. */
}
{
  /* NOTE (DENT-31): el vencimiento y la reversión a PENDING son de TEC-07. */
}
```

Si no hay propuesta, mantener “Horario:”.

Formulario solo si `selected.status === 'PENDING'`:

```tsx
<section className="appointment-summary" aria-label="Proponer horario alternativo">
  <h3>Proponer horario alternativo</h3>
  <label>
    Fecha alternativa
    <input
      type="date"
      min={localToday()}
      value={proposedDate}
      onChange={(e) => {
        setProposedDate(e.target.value);
        setSelectedProposed('');
      }}
    />
  </label>
  {loadingSlots && <p>Consultando horarios…</p>}
  {slotError && (
    <p className="notice error" role="alert">
      {slotError}
    </p>
  )}
  {!loadingSlots && !slotError && !slots.length && (
    <p className="notice">No hay horarios disponibles para esta fecha.</p>
  )}
  <div className="slot-list">
    {slots.map((slot) => (
      <button
        type="button"
        key={slot.startsAt}
        className={selectedProposed === slot.startsAt ? 'slot selected' : 'slot'}
        aria-pressed={selectedProposed === slot.startsAt}
        onClick={() => setSelectedProposed(slot.startsAt)}
      >
        {dateTime(slot.startsAt)} –{' '}
        {new Intl.DateTimeFormat('es-MX', { timeStyle: 'short', timeZone }).format(
          new Date(slot.endsAt),
        )}
      </button>
    ))}
  </div>
  <button type="button" disabled={!selectedProposed || proposing} onClick={() => void propose()}>
    {proposing ? 'Enviando…' : 'Proponer este horario'}
  </button>
</section>
```

- [ ] **Step 6: Ejecutar las 5 pruebas**

```bash
npm test -- src/pages/AppointmentManagementPage.test.tsx
```

Expected: 5/5 en verde.

- [ ] **Step 7: Commit**

```bash
git add src/services/api.ts src/pages/AppointmentManagementPage.tsx src/pages/AppointmentManagementPage.test.tsx
git commit -m "Sprint 7: proponer horario alternativo desde solicitudes (HU-13 · DENT-13)"
```

---

### Task 5: Verificación, guardas y cierre

**Files:**

- Modify: `specs/hu-13-proponer-horario-alternativo/spec.md`
- Modify: `specs/hu-13-proponer-horario-alternativo/task.md`

- [ ] **Step 1: Formato y lint**

```bash
npx prettier --check src/pages/AppointmentManagementPage.tsx src/pages/AppointmentManagementPage.test.tsx src/services/api.ts
npm run lint
```

- [ ] **Step 2: Suite completa**

```bash
npm test
```

Expected: 12/12 en verde. Registrar el conteo real; si difiere, corregir la spec.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: `tsc -b` y Vite sin errores.

- [ ] **Step 4: Guardas**

- `security-reviewer` sobre el diff contra `origin/main`.
- `traceability-clerk` sobre Jira ↔ spec ↔ código ↔ test.
- Corregir gaps y repetir.

- [ ] **Step 5: Evidencia y commit de specs**

Actualizar la tabla `Evidencia` de `spec.md` y el checklist de `task.md` con conteos reales. Mantener `🚧 Borrador con evidencia`; no usar `✅ Aprobado` sin revisor indicado por el usuario.

```bash
git add specs/hu-13-proponer-horario-alternativo/spec.md specs/hu-13-proponer-horario-alternativo/plan.md specs/hu-13-proponer-horario-alternativo/task.md
git commit -m "Sprint 7: cerrar evidencia de propuesta de horario en front (HU-13 · DENT-13)"
```

## Riesgos y decisiones

- **CRLF:** casi todo el árbol aparece modificado por fin de línea. Solo se agregan los archivos de la HU; nunca `git add -A`.
- **`/api` duplicado:** la página actual concatena una base que ya termina en `/api` con rutas `/api/...`. La HU corrige las rutas de esta página (no las de otras pantallas) porque el flujo nuevo necesita el mismo `request`.
- **`package-lock.json`:** ya tenía un diff ajeno a la HU; no tocarlo.
- **CI:** `.github/workflows/ci.yml` dispara en PR/push a `main` y `sprint-3-Emanuel`. Abrir el PR contra `main` para que corran lint, test y build; no modificar el workflow en esta HU.
- **Tests sin env:** `apiBaseUrl()` usa el fallback de desarrollo en vitest; no se requiere `.env.test`.
- **Estado tras `409`:** se refresca la verdad del servidor antes de mostrar el mensaje, para no dejar un formulario habilitado sobre una propuesta ya activa.
- **Vencimiento:** la UI solo muestra `proposalExpiresAt`; no hay temporizador ni reversión local.
- **Contrato:** si el back cambia la forma de listado/detalle, actualizar esta spec y la prueba antes de tocar la página (skill `drift-guards`).

## Execution Handoff

Plan completo. Implementar en `Sprint-7-Eliuth` con TDD y staging selectivo. Dependencias externas: HU-14/DENT-14, TEC-07/DENT-31 y HU-15/DENT-15.
