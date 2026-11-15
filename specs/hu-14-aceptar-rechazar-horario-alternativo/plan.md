# HU-14 Aceptar o rechazar un horario alternativo · Plan de implementación (frontend)

> **Para el agente:** ejecutar con TDD. Cada tarea termina con su verificación. No commitear la Fase A sola (skill `vertical-slice`). Usar `security-reviewer` antes del push y `traceability-clerk` al cerrar.

**Goal:** que el paciente dueño de una solicitud `PROPOSED` compare el horario original con el propuesto, acepte (la cita queda `CONFIRMED`) o rechace (queda `REJECTED`), y que un conflicto o vencimiento nunca se muestre como confirmación falsa.

**Architecture:** una página privada nueva, `AppointmentProposalPage`, montada en `/mi-solicitud/:appointmentId`, consume el contrato ya mergeado del back (`GET /proposal`, `POST /proposal/accept`, `POST /proposal/reject`). El servicio `api.ts` centraliza la URL, el token y el error con status. Ante cualquier `409`, la página vuelve a consultar el `GET` y muestra la verdad del servidor. El enlace de entrada se agrega al éxito de HU-09; el listado persistente queda para HU-16.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, vitest 4, @testing-library/react 16, `fetch` nativo, React Router 7.

**Spec:** `specs/hu-14-aceptar-rechazar-horario-alternativo/spec.md`

**Contrato del back:** `DentalConnect-back/specs/hu-14-aceptar-rechazar-horario-alternativo/spec.md` (DENT-14, PR #17 mergeado). No modificarlo.

## Global Constraints

- Alcance aprobado: enlace directo `/mi-solicitud/:appointmentId`; sin listado de citas del paciente (HU-16/DENT-16).
- No agregar dependencias, endpoints ni migraciones. No tocar `index.html`, `src/styles.css` ni `package-lock.json`.
- La base del API ya incluye `/api`: usar rutas relativas `/appointments/...`; nunca `/api/api/`.
- Auth SIEMPRE por `src/auth/AuthContext.tsx` y `src/services/api.ts`; la página no lee ni guarda tokens.
- El back es la autoridad de estado, vencimiento y disponibilidad. La UI no calcula `proposalExpiresAt` ni revierte estados por reloj local.
- Ante un `POST` fallido, mostrar el mensaje y volver a ejecutar el `GET` antes de dejar la UI en un estado estable.
- Errores: `role="alert"`; avisos: `role="status"`; botones nativos; sección de respuesta con `aria-label`.
- Copia exacta: “Aceptar horario propuesto”, “Rechazar propuesta”, “Aceptaste el horario propuesto. Tu cita quedó confirmada.”, “Rechazaste la propuesta. La solicitud quedó rechazada.”, “Inicia sesión con la cuenta que creó la solicitud.”.
- Zona del piloto `America/Mexico_City` para mostrar; el back persiste UTC.
- Sin `TODO`; `NOTE (DENT-16)` (listado del paciente) en código, `Límites` y `task.md`; retirar el `NOTE (DENT-14)` consumido de `AppointmentManagementPage` y conservar `NOTE (DENT-31)`.
- Prettier solo sobre los archivos tocados: `npx prettier --check` y, si hace falta, `npx prettier --write` sobre la lista del cierre.
- **Staging selectivo:** el árbol tiene `package-lock.json` modificado por trabajo ajeno a la HU. No usar `git add -A`; agregar solo los archivos de la HU. No commitear `package-lock.json`.
- Rama: `Sprint-7-Eliuth` actualizada desde `origin/main` (`a7d3b9c`). Si la rama local existe y está mergeada: `git switch Sprint-7-Eliuth && git merge --ff-only origin/main`. Si el cambio de rama choca con el `package-lock.json` local, usar un worktree (`using-git-worktrees`) y trabajar ahí.
- Commits: `Sprint 7: <resumen> (HU-14 · DENT-14)`.
- CI del front: `npm run lint`, `npm test`, `npm run build` en PR hacia `main` (`.github/workflows/ci.yml`).

## Review Focus

1. **Vencimiento:** un `409 PROPOSAL_EXPIRED` no debe dejar “Confirmada” ni botones; el `GET` posterior debe mostrar `PENDING` y el horario original.
2. **Conflicto de disponibilidad:** un `409 SLOT_UNAVAILABLE`/`PATIENT_CONFLICT` no debe cambiar el estado de forma optimista; la solicitud sigue `PROPOSED` y el paciente ve el mensaje del servidor.
3. **Respuesta concurrente:** si otra pestaña ya respondió, `409 PROPOSAL_NOT_ACTIVE` debe refrescar a `CONFIRMED`/`REJECTED` y retirar las acciones, sin duplicar eventos desde el front.
4. **Propiedad:** sin sesión no se llama al API; un `404` de otra cuenta no renderiza folio, horarios ni datos.
5. **Contrato y URL:** los tipos camelCase coinciden con el back; el `GET` y los dos `POST` van a `/api/appointments/{id}/proposal...`, con `Bearer` y sin `/api/api/`.

Cada línea tiene su prueba en la tarea que implementa la página.

## File Structure

| Archivo                                                                | Responsabilidad                                                         |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/types/api.ts`                                                     | `AppointmentProposal` con la forma real de `AppointmentResponse`.       |
| `src/services/api.ts`                                                  | `ApiError` (mensaje + status) y los tres métodos del contrato.          |
| `src/pages/AppointmentProposalPage.tsx`                                | Página privada: carga, compara horarios, acepta/rechaza y refresca.     |
| `src/pages/AppointmentProposalPage.test.tsx`                           | 9 pruebas de contrato, error, vencimiento, concurrencia y autorización. |
| `src/routes/App.tsx`                                                   | Ruta `/mi-solicitud/:appointmentId`.                                    |
| `src/pages/AppointmentRequestPage.tsx`                                 | `id` en el resultado y enlace al estado; `NOTE (DENT-16)`.              |
| `src/pages/AppointmentRequestPage.test.tsx`                            | 1 prueba del enlace de entrada (R8).                                    |
| `src/pages/AppointmentManagementPage.tsx`                              | Retirar el `NOTE (DENT-14)` consumido; conservar `NOTE (DENT-31)`.      |
| `specs/hu-14-aceptar-rechazar-horario-alternativo/{spec,plan,task}.md` | Trazabilidad DENT-14.                                                   |

---

### Task 0: Commit de specs

**Files:**

- Create: `specs/hu-14-aceptar-rechazar-horario-alternativo/spec.md`
- Create: `specs/hu-14-aceptar-rechazar-horario-alternativo/plan.md`
- Create: `specs/hu-14-aceptar-rechazar-horario-alternativo/task.md`

- [ ] **Step 1: Verificar la cabecera contra Jira**

Confirmar por Atlassian MCP que `DENT-14` sigue con summary `HU-14 Aceptar o rechazar un horario alternativo` y Sprint `DentalConnect Sprint 07`. La contraparte del back debe citar el PR #17.

- [ ] **Step 2: Commit**

```bash
git add specs/hu-14-aceptar-rechazar-horario-alternativo
git commit -m "Sprint 7: especificar respuesta a propuesta de horario en front (HU-14 · DENT-14)"
```

---

### Task 1: Tipo de contrato, `ApiError` y métodos del servicio

**Files:**

- Modify: `src/types/api.ts`
- Modify: `src/services/api.ts`

**Interfaces:**

- Consumes: `ApiResponse<T>` existente y `request<T>` privado de `api.ts`.
- Produces:
  - `export interface AppointmentProposal`.
  - `export class ApiError extends Error { readonly status: number }`.
  - `api.proposal(appointmentId: string)`, `api.acceptProposal(appointmentId: string)`, `api.rejectProposal(appointmentId: string)`, todos `Promise<ApiResponse<AppointmentProposal>>`.

- [ ] **Step 1: Agregar el tipo**

En `src/types/api.ts`:

```ts
export interface AppointmentProposal {
  id: string;
  folio: string;
  status: string;
  clinicId: string;
  dentistId: string;
  dentalServiceId: string;
  startsAt: string;
  endsAt: string;
  proposedStartsAt: string | null;
  proposedEndsAt: string | null;
  proposalExpiresAt: string | null;
  timeZoneId: string;
}
```

- [ ] **Step 2: Agregar `ApiError` y lanzarlo desde `request`**

```ts
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

En el bloque `if (!response.ok)` de `request`, reemplazar `throw new Error(message);` por `throw new ApiError(message, response.status);`. Los `catch` existentes siguen funcionando porque `ApiError` extiende `Error`.

- [ ] **Step 3: Agregar los tres métodos**

Dentro de `export const api = { ... }`:

```ts
proposal: (appointmentId: string) =>
  request<ApiResponse<AppointmentProposal>>(
    `/appointments/${encodeURIComponent(appointmentId)}/proposal`,
  ),
acceptProposal: (appointmentId: string) =>
  request<ApiResponse<AppointmentProposal>>(
    `/appointments/${encodeURIComponent(appointmentId)}/proposal/accept`,
    { method: 'POST' },
  ),
rejectProposal: (appointmentId: string) =>
  request<ApiResponse<AppointmentProposal>>(
    `/appointments/${encodeURIComponent(appointmentId)}/proposal/reject`,
    { method: 'POST' },
  ),
```

- [ ] **Step 4: Verificar que no rompe lo existente**

```bash
npm run build
npm test
```

Expected: build OK y 12/12 pruebas existentes en verde. Aún no hay UI nueva.

- [ ] **Step 5: Commit**

```bash
git add src/types/api.ts src/services/api.ts
git commit -m "Sprint 7: agregar contrato de propuesta al servicio del front (HU-14 · DENT-14)"
```

---

### Task 2: Pruebas RED de la página

**Files:**

- Create: `src/pages/AppointmentProposalPage.test.tsx`

**Interfaces:**

- Consumes: `App`, `currentUser` y `currentIdToken` de `src/services/cognito`.
- Produces: 9 pruebas que fijan el contrato de UI; se commitean con la página en Task 3.

- [ ] **Step 1: Crear el archivo de pruebas**

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../routes/App';
import { currentIdToken, currentUser } from '../services/cognito';

vi.mock('../services/cognito', () => ({
  currentUser: vi.fn(),
  currentIdToken: vi.fn(),
  signOut: vi.fn(),
}));

const profile = { email: 'paciente@example.com', firstName: 'Ana', lastName: 'Pérez' };
const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);
const fetchMock = (handler: (url: string, init?: RequestInit) => Promise<Response>) =>
  vi.fn((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init));

const proposed = (overrides: Record<string, unknown> = {}) => ({
  id: 'apt-1',
  folio: 'DC-1',
  status: 'PROPOSED',
  clinicId: 'clinic-1',
  dentistId: 'dentist-1',
  dentalServiceId: 'service-1',
  startsAt: '2026-11-20T17:00:00Z',
  endsAt: '2026-11-20T17:30:00Z',
  proposedStartsAt: '2026-11-21T18:00:00Z',
  proposedEndsAt: '2026-11-21T18:30:00Z',
  proposalExpiresAt: '2026-11-12T12:00:00Z',
  timeZoneId: 'America/Mexico_City',
  ...overrides,
});
const confirmed = () =>
  proposed({
    status: 'CONFIRMED',
    startsAt: '2026-11-21T18:00:00Z',
    endsAt: '2026-11-21T18:30:00Z',
    proposedStartsAt: null,
    proposedEndsAt: null,
    proposalExpiresAt: null,
  });
const pending = () =>
  proposed({
    status: 'PENDING',
    proposedStartsAt: null,
    proposedEndsAt: null,
    proposalExpiresAt: null,
  });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/mi-solicitud/apt-1']}>
      <App />
    </MemoryRouter>,
  );
const proposalGets = () =>
  vi
    .mocked(fetch)
    .mock.calls.filter(
      ([url, init]) => String(url).endsWith('/appointments/apt-1/proposal') && !init?.method,
    );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentUser).mockResolvedValue(profile);
  vi.mocked(currentIdToken).mockResolvedValue('token');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('HU-14 aceptar o rechazar un horario alternativo', () => {
  // DENT-14 R1, R2, R9, R10
  it('muestra ambos horarios y acepta la propuesta', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url, init) => {
        if (url.endsWith('/proposal/accept') && init?.method === 'POST')
          return json({ data: confirmed() });
        if (url.endsWith('/proposal')) return json({ data: proposed() });
        return json({ data: [] });
      }),
    );
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Solicitud DC-1' })).toBeInTheDocument();
    expect(screen.getByText('Horario original:')).toBeInTheDocument();
    expect(screen.getByText('Horario propuesto:')).toBeInTheDocument();
    expect(screen.getByText('Vence:')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Responder propuesta' })).toBeInTheDocument();
    expect(
      screen.getByText(/Si aceptas, la cita queda confirmada en el horario propuesto/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceptar horario propuesto' }).tagName).toBe(
      'BUTTON',
    );

    const getCall = proposalGets()[0];
    expect(new Headers(getCall?.[1]?.headers).get('Authorization')).toBe('Bearer token');

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar horario propuesto' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Aceptaste el horario propuesto. Tu cita quedó confirmada.',
    );
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
    expect(screen.getByText('Horario confirmado:')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aceptar horario propuesto' }),
    ).not.toBeInTheDocument();

    const post = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => String(url).endsWith('/proposal/accept'));
    expect(String(post?.[0])).toContain('/api/appointments/apt-1/proposal/accept');
    expect(String(post?.[0])).not.toContain('/api/api/');
  });

  // DENT-14 R3
  it('rechaza la propuesta y conserva el horario original', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url, init) => {
        if (url.endsWith('/proposal/reject') && init?.method === 'POST')
          return json({ data: proposed({ status: 'REJECTED' }) });
        if (url.endsWith('/proposal')) return json({ data: proposed() });
        return json({ data: [] });
      }),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar propuesta' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Rechazaste la propuesta. La solicitud quedó rechazada.',
    );
    expect(screen.getByText('Rechazada')).toBeInTheDocument();
    expect(screen.getByText('Horario original:')).toBeInTheDocument();
    expect(screen.getByText('Horario propuesto rechazado:')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar propuesta' })).not.toBeInTheDocument();
  });

  // DENT-14 R4
  it('informa el conflicto de disponibilidad sin confirmar', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url, init) => {
        if (url.endsWith('/proposal/accept') && init?.method === 'POST')
          return json(
            {
              error: {
                code: 'SLOT_UNAVAILABLE',
                message: 'El horario propuesto ya no está disponible',
              },
            },
            409,
          );
        if (url.endsWith('/proposal')) return json({ data: proposed() });
        return json({ data: [] });
      }),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar horario propuesto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El horario propuesto ya no está disponible',
    );
    await waitFor(() => expect(proposalGets()).toHaveLength(2));
    expect(screen.getByText('Con propuesta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceptar horario propuesto' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // DENT-14 R5
  it('impide aceptar una propuesta vencida y muestra la solicitud pendiente', async () => {
    let gets = 0;
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url, init) => {
        if (url.endsWith('/proposal/accept') && init?.method === 'POST')
          return json(
            {
              error: {
                code: 'PROPOSAL_EXPIRED',
                message: 'La propuesta venció; la solicitud volvió a pendiente',
              },
            },
            409,
          );
        if (url.endsWith('/proposal')) {
          gets += 1;
          return json({ data: gets === 1 ? proposed() : pending() });
        }
        return json({ data: [] });
      }),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar horario propuesto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La propuesta venció; la solicitud volvió a pendiente',
    );
    await waitFor(() => expect(screen.getByText('Pendiente')).toBeInTheDocument());
    expect(screen.getByText('Horario:')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aceptar horario propuesto' }),
    ).not.toBeInTheDocument();
  });

  // DENT-14 R6
  it('refresca a confirmada cuando la propuesta ya fue respondida', async () => {
    let gets = 0;
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url, init) => {
        if (url.endsWith('/proposal/accept') && init?.method === 'POST')
          return json(
            {
              error: {
                code: 'PROPOSAL_NOT_ACTIVE',
                message: 'La solicitud no tiene una propuesta activa',
              },
            },
            409,
          );
        if (url.endsWith('/proposal')) {
          gets += 1;
          return json({ data: gets === 1 ? proposed() : confirmed() });
        }
        return json({ data: [] });
      }),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar horario propuesto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La solicitud no tiene una propuesta activa',
    );
    await waitFor(() => expect(screen.getByText('Confirmada')).toBeInTheDocument());
    expect(screen.getByText('Horario confirmado:')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aceptar horario propuesto' }),
    ).not.toBeInTheDocument();
  });

  // DENT-14 R6
  it('avisa cuando la propuesta está incompleta', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async () =>
        json({
          data: proposed({
            proposedStartsAt: null,
            proposedEndsAt: null,
            proposalExpiresAt: null,
          }),
        }),
      ),
    );
    renderPage();

    expect(
      await screen.findByText(
        'La propuesta está incompleta. Solicita un nuevo horario al consultorio.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Con propuesta')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aceptar horario propuesto' }),
    ).not.toBeInTheDocument();
  });

  // DENT-14 R7
  it('no consulta el API sin sesión', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderPage();

    expect(
      await screen.findByText('Inicia sesión con la cuenta que creó la solicitud.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Iniciar sesión para consultar mi solicitud' }),
    ).toHaveAttribute('href', '/iniciar-sesion');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // DENT-14 R7
  it('muestra el mensaje de sesión requerida con 401', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async () => json(null, 401)),
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Inicia sesión para consultar tu solicitud.',
    );
  });

  // DENT-14 R7
  it('oculta la solicitud de otra cuenta con 404', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async () => json(null, 404)),
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La solicitud no existe o no pertenece a tu cuenta.',
    );
    expect(screen.queryByRole('heading', { name: 'Solicitud DC-1' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar RED**

```bash
npm test -- src/pages/AppointmentProposalPage.test.tsx
```

Expected: los 9 casos fallan porque la ruta `/mi-solicitud/:appointmentId` y la página aún no existen; la app cae en `*` → `/clinics`. No debe fallar por imports ni por el mock de Cognito.

- [ ] **Step 3: No commitear todavía**

Las pruebas se commitean junto con la página en Task 3.

---

### Task 3: Página y ruta

**Files:**

- Create: `src/pages/AppointmentProposalPage.tsx`
- Modify: `src/routes/App.tsx`
- Test: `src/pages/AppointmentProposalPage.test.tsx`

**Interfaces:**

- Consumes: `useAuth()` (`user`, `loading`), `useParams<{ appointmentId: string }>()`, `api.proposal`, `api.acceptProposal`, `api.rejectProposal`, `ApiError`, `AppointmentProposal`.
- Produces: página privada con `load()` y `respond(accept: boolean)`; ruta `/mi-solicitud/:appointmentId`.

- [ ] **Step 1: Implementar la página**

Estructura mínima:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../services/api';
import type { AppointmentProposal } from '../types/api';

const timeZone = 'America/Mexico_City';
const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PROPOSED: 'Con propuesta',
  CONFIRMED: 'Confirmada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
};
const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
      }).format(new Date(value))
    : 'No disponible';
const message = (cause: unknown) => {
  if (cause instanceof ApiError) {
    if (cause.status === 401) return 'Inicia sesión para consultar tu solicitud.';
    if (cause.status === 404) return 'La solicitud no existe o no pertenece a tu cuenta.';
    return cause.message;
  }
  return cause instanceof Error ? cause.message : 'No fue posible consultar la solicitud.';
};

export function AppointmentProposalPage() {
  const { appointmentId = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [appointment, setAppointment] = useState<AppointmentProposal>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.proposal(appointmentId);
      setAppointment(data);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) setAppointment(undefined);
      setError(message(cause));
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (!user || !appointmentId) return;
    let active = true;
    setLoading(true);
    setError('');
    api
      .proposal(appointmentId)
      .then(({ data }) => {
        if (active) setAppointment(data);
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 404) setAppointment(undefined);
        setError(message(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appointmentId, user]);

  const respond = async (accept: boolean) => {
    setBusy(true);
    setError('');
    setNotice('');
    let failure = '';
    try {
      const { data } = await (accept
        ? api.acceptProposal(appointmentId)
        : api.rejectProposal(appointmentId));
      setAppointment(data);
      setNotice(
        accept
          ? 'Aceptaste el horario propuesto. Tu cita quedó confirmada.'
          : 'Rechazaste la propuesta. La solicitud quedó rechazada.',
      );
      return;
    } catch (cause) {
      failure = message(cause);
    } finally {
      setBusy(false);
    }
    setError(failure);
    await load();
  };

  if (authLoading)
    return (
      <main className="page-shell">
        <p>Cargando sesión…</p>
      </main>
    );
  if (!user)
    return (
      <main className="page-shell">
        <section className="panel">
          <p className="eyebrow">Mi solicitud</p>
          <h1>Solicitud de cita</h1>
          <p className="notice">Inicia sesión con la cuenta que creó la solicitud.</p>
          <Link to="/iniciar-sesion">Iniciar sesión para consultar mi solicitud</Link>
        </section>
      </main>
    );

  const status = appointment?.status?.toUpperCase() ?? '';
  const hasProposal =
    status === 'PROPOSED' &&
    Boolean(appointment?.proposedStartsAt) &&
    Boolean(appointment?.proposedEndsAt);

  return (
    <main className="page-shell">
      <section className="panel" aria-label="Mi solicitud">
        <p className="eyebrow">Respuesta a propuesta</p>
        <h1>{appointment ? `Solicitud ${appointment.folio}` : 'Solicitud de cita'}</h1>
        {loading && !appointment && <p>Cargando tu solicitud…</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {!appointment && !loading && <Link to="/clinics">Volver al directorio</Link>}
        {appointment && (
          <>
            <p>
              <strong>Estado:</strong> {statusLabels[status] || appointment.status}
            </p>
            {hasProposal ? (
              <>
                <p>
                  <strong>Horario original:</strong> {dateTime(appointment.startsAt)} –{' '}
                  {dateTime(appointment.endsAt)}
                </p>
                <p>
                  <strong>Horario propuesto:</strong> {dateTime(appointment.proposedStartsAt)} –{' '}
                  {dateTime(appointment.proposedEndsAt)}
                </p>
                {appointment.proposalExpiresAt && (
                  <p>
                    <strong>Vence:</strong> {dateTime(appointment.proposalExpiresAt)}
                  </p>
                )}
                <section className="appointment-summary" aria-label="Responder propuesta">
                  <h2>¿Aceptas el horario propuesto?</h2>
                  <p>
                    Si aceptas, la cita queda confirmada en el horario propuesto. Si rechazas, la
                    solicitud queda rechazada y no se reserva ningún horario.
                  </p>
                  <div className="form-grid">
                    <button type="button" disabled={busy} onClick={() => void respond(true)}>
                      Aceptar horario propuesto
                    </button>
                    <button type="button" disabled={busy} onClick={() => void respond(false)}>
                      Rechazar propuesta
                    </button>
                  </div>
                </section>
              </>
            ) : (
              <>
                <p>
                  <strong>
                    {status === 'CONFIRMED'
                      ? 'Horario confirmado:'
                      : status === 'REJECTED' && appointment.proposedStartsAt
                        ? 'Horario original:'
                        : 'Horario:'}
                  </strong>{' '}
                  {dateTime(appointment.startsAt)} – {dateTime(appointment.endsAt)}
                </p>
                {status === 'REJECTED' && appointment.proposedStartsAt && (
                  <p>
                    <strong>Horario propuesto rechazado:</strong>{' '}
                    {dateTime(appointment.proposedStartsAt)} –{' '}
                    {dateTime(appointment.proposedEndsAt)}
                  </p>
                )}
                {status === 'PENDING' && (
                  <p className="notice">
                    No hay una propuesta activa. Tu solicitud sigue pendiente con el horario
                    original.
                  </p>
                )}
                {status === 'CANCELLED' && <p className="notice">La solicitud fue cancelada.</p>}
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
```

Si `PROPOSED` no trae ambos horarios, no renderizar botones; mostrar “La propuesta está incompleta. Solicita un nuevo horario al consultorio.” en lugar del bloque de respuesta. Es una salvaguarda de UI; el back también responde `409 PROPOSAL_NOT_ACTIVE`.

- [ ] **Step 2: Montar la ruta**

En `src/routes/App.tsx`:

```tsx
import { AppointmentProposalPage } from '../pages/AppointmentProposalPage';
...
<Route path="/mi-solicitud/:appointmentId" element={<AppointmentProposalPage />} />
```

No agregar enlace global en el header: el header no conoce el id de la solicitud.

- [ ] **Step 3: Ejecutar las 9 pruebas**

```bash
npm test -- src/pages/AppointmentProposalPage.test.tsx
```

Expected: 9/9 en verde.

- [ ] **Step 4: Lint y build**

```bash
npm run lint
npm run build
```

Expected: 0 errores y build OK.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AppointmentProposalPage.tsx src/pages/AppointmentProposalPage.test.tsx src/routes/App.tsx
git commit -m "Sprint 7: responder propuesta de horario desde el front (HU-14 · DENT-14)"
```

---

### Task 4: Enlace de entrada desde HU-09

**Files:**

- Modify: `src/pages/AppointmentRequestPage.tsx`
- Create: `src/pages/AppointmentRequestPage.test.tsx`

**Interfaces:**

- Consumes: `result.data.id`, `result.data.folio`, `result.data.status` de `api.createAppointment`.
- Produces: enlace `/mi-solicitud/{id}` visible tras el `201`; `NOTE (DENT-16)`.

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../routes/App';
import { currentUser } from '../services/cognito';
import { api } from '../services/api';

vi.mock('../services/cognito', () => ({
  currentUser: vi.fn(),
  currentIdToken: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../services/api', () => {
  class ApiError extends Error {}
  return {
    apiBaseUrl: () => 'http://localhost:3000/api',
    ApiError,
    api: { clinic: vi.fn(), availability: vi.fn(), createAppointment: vi.fn() },
  };
});

const clinic = {
  id: 'clinic-1',
  name: 'Clínica Uno',
  description: 'Atención dental',
  phone: '555',
  email: 'clinica@example.com',
  address: 'Calle 1',
  municipality: 'Centro',
  state: 'CDMX',
  postalCode: '01000',
  services: [
    {
      id: 'service-1',
      name: 'Limpieza',
      description: 'Limpieza dental',
      estimatedDurationMinutes: 30,
      priceFrom: 500,
    },
  ],
  dentists: [
    {
      id: 'dentist-1',
      firstName: 'Luis',
      lastName: 'Mora',
      specialty: 'General',
      professionalLicense: '123',
      biography: 'Dentista',
      services: [
        {
          id: 'service-1',
          name: 'Limpieza',
          description: 'Limpieza dental',
          estimatedDurationMinutes: 30,
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentUser).mockResolvedValue({
    email: 'paciente@example.com',
    firstName: 'Ana',
    lastName: 'Pérez',
  });
  vi.mocked(api.clinic).mockResolvedValue({ data: clinic });
  vi.mocked(api.availability).mockResolvedValue({
    data: [{ startsAt: '2026-11-20T17:00:00Z', endsAt: '2026-11-20T17:30:00Z' }],
    timeZone: 'America/Mexico_City',
  });
  vi.mocked(api.createAppointment).mockResolvedValue({
    data: {
      id: 'apt-1',
      folio: 'DC-1',
      status: 'PENDING',
      clinicId: 'clinic-1',
      dentistId: 'dentist-1',
      dentalServiceId: 'service-1',
      startsAt: '2026-11-20T17:00:00Z',
      endsAt: '2026-11-20T17:30:00Z',
      timeZoneId: 'America/Mexico_City',
    },
  });
  vi.stubGlobal('crypto', { randomUUID: () => 'test-key-123' });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('HU-14 enlace al estado de la solicitud', () => {
  // DENT-14 R8
  it('muestra el enlace al estado de la solicitud creada', async () => {
    render(
      <MemoryRouter
        initialEntries={['/clinics/clinic-1/solicitar?serviceId=service-1&dentistId=dentist-1']}
      >
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /20 de noviembre de 2026/i }));
    const submit = await screen.findByRole('button', { name: 'Enviar solicitud pendiente' });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    const link = await screen.findByRole('link', { name: 'Ver el estado de mi solicitud' });
    expect(link).toHaveAttribute('href', '/mi-solicitud/apt-1');
    expect(api.createAppointment).toHaveBeenCalledWith(
      {
        clinicId: 'clinic-1',
        dentistId: 'dentist-1',
        dentalServiceId: 'service-1',
        startsAt: '2026-11-20T17:00:00Z',
      },
      'test-key-123',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/pages/AppointmentRequestPage.test.tsx
```

Expected: FAIL porque el aviso de éxito aún no contiene el enlace.

- [ ] **Step 3: Guardar el `id`**

Cambiar el estado:

```tsx
const [requestResult, setRequestResult] = useState<{ id: string; folio: string; status: string }>();
```

En `submitRequest`:

```tsx
setRequestResult({
  id: result.data.id,
  folio: result.data.folio,
  status: result.data.status,
});
```

- [ ] **Step 4: Mostrar el enlace**

Dentro del `<p className="notice" role="status">` de éxito, después del texto existente:

```tsx
<>
  {' '}
  <Link to={`/mi-solicitud/${encodeURIComponent(requestResult.id)}`}>
    Ver el estado de mi solicitud
  </Link>
  {/* NOTE (DENT-16): el listado persistente de citas del paciente es HU-16. */}
</>
```

`Link` ya está importado. No cambiar el flujo de creación ni el `Idempotency-Key`.

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- src/pages/AppointmentRequestPage.test.tsx
```

Expected: 1/1 en verde.

- [ ] **Step 6: Verify the full suite**

```bash
npm run lint
npm test
npm run build
```

Expected: lint 0, 22/22 pruebas y build OK.

- [ ] **Step 7: Commit**

```bash
git add src/pages/AppointmentRequestPage.tsx src/pages/AppointmentRequestPage.test.tsx
git commit -m "Sprint 7: enlazar la solicitud creada con su estado (HU-14 · DENT-14)"
```

---

### Task 5: Verificación, guardas y cierre

**Files:**

- Modify: `src/pages/AppointmentManagementPage.tsx`
- Modify: `specs/hu-14-aceptar-rechazar-horario-alternativo/spec.md`
- Modify: `specs/hu-14-aceptar-rechazar-horario-alternativo/task.md`
- Modify: `specs/hu-13-proponer-horario-alternativo/spec.md`
- Modify: `specs/hu-13-proponer-horario-alternativo/plan.md`
- Modify: `specs/hu-13-proponer-horario-alternativo/task.md`

- [ ] **Step 1: Retirar el `NOTE (DENT-14)` consumido y reconciliar HU-13**

```bash
grep -rn "NOTE (DENT-14)" src specs/hu-13-proponer-horario-alternativo
```

Expected: solo `src/pages/AppointmentManagementPage.tsx` y referencias históricas en HU-13. Eliminar la línea del código y conservar `NOTE (DENT-31)`. En HU-13, quitar la fila del pendiente, el `NOTE (DENT-14)` de `Límites`/`Global Constraints` y el fragmento del plan; dejar la respuesta del paciente como cubierta por HU-14. Volver a ejecutar el `grep` y confirmar que no hay coincidencias.

- [ ] **Step 2: Formato y lint**

```bash
npx prettier --check src/pages/AppointmentProposalPage.tsx src/pages/AppointmentProposalPage.test.tsx src/pages/AppointmentRequestPage.tsx src/pages/AppointmentRequestPage.test.tsx src/pages/AppointmentManagementPage.tsx src/routes/App.tsx src/services/api.ts src/types/api.ts
npm run lint
```

Expected: Prettier sin cambios pendientes; lint 0.

- [ ] **Step 3: Suite completa y build**

```bash
npm test
npm run build
```

Expected: 22/22 en verde y build OK. Registrar el conteo real; si difiere, corregir la spec antes de commitear.

- [ ] **Step 4: Guardas**

- `security-reviewer` sobre el diff contra `origin/main`: ruta privada con guard, token solo en `api.ts`, `ApiError` sin filtrar detalles, sin `TODO`, contrato camelCase, `NOTE (DENT-16)` y ausencia del `NOTE (DENT-14)` consumido.
- `traceability-clerk` sobre Jira ↔ spec ↔ código ↔ test: `DENT-14`, nombres de pruebas con `// DENT-14 Rn`, `NOTE (DENT-16)` en las 3 capas y contraparte del back.

Corregir los gaps y repetir.

- [ ] **Step 5: Actualizar evidencia y estado**

En `spec.md`, completar la tabla `Evidencia` con baseline, tests reales, lint, build, commits y guardas. Mantener `🚧 Borrador con evidencia`; no usar `✅ Aprobado` sin revisor indicado por el usuario.

En `task.md`, marcar T1–T7 y actualizar los pendientes con dueño.

- [ ] **Step 6: Actualizar Jira**

Consultar las transiciones de `DENT-14` con `listJiraIssueTransitions`; agregar un comentario con el enlace del PR cuando exista. No mover a un estado de cierre sin PR. Si el PR aún no existe, dejar el enlace pendiente y no marcar el issue como terminado.

- [ ] **Step 7: Commit de limpieza**

```bash
git add src/pages/AppointmentManagementPage.tsx specs/hu-13-proponer-horario-alternativo/spec.md specs/hu-13-proponer-horario-alternativo/plan.md specs/hu-13-proponer-horario-alternativo/task.md
git commit -m "Sprint 7: retirar NOTE consumida y reconciliar HU-13 (HU-14 · DENT-14)"
```

- [ ] **Step 8: Commit de specs**

```bash
git add specs/hu-14-aceptar-rechazar-horario-alternativo/spec.md specs/hu-14-aceptar-rechazar-horario-alternativo/task.md
git commit -m "Sprint 7: cerrar evidencia de respuesta a propuesta en front (HU-14 · DENT-14)"
```

- [ ] **Step 9: PR**

Título: `Sprint 7: aceptar o rechazar un horario alternativo (HU-14 · DENT-14) (vitest 22)`. Cuerpo: enlace a la spec, al back (PR #17) y a `DENT-14`; conteos reales; límites (`NOTE (DENT-16)`). Abrir contra `main` para que corra `ci.yml`.

---

## Riesgos y decisiones

- **Sin listado del paciente:** el enlace es directo y privado; si el paciente lo pierde, no puede recuperarlo desde la app hasta HU-16. Es el límite aprobado para esta HU.
- **Enlace desde HU-09:** el `id` está en la respuesta de creación; guardarlo en el estado local evita una consulta extra. No se persiste en `localStorage` para no invadir HU-16.
- **Vencimiento:** la UI solo muestra `proposalExpiresAt`; no hay temporizador ni reversión local. El `409 PROPOSAL_EXPIRED` del back es la única fuente.
- **Conflictos:** se refresca el `GET` después de cualquier error de respuesta para no dejar botones habilitados sobre un estado ya cambiado.
- **`ApiError`:** cambio pequeño en `api.ts` que conserva la compatibilidad de los `catch` existentes; permite distinguir 401/404 sin parsear mensajes.
- **CRLF:** el árbol puede mostrar cambios de fin de línea; no usar `git add -A`.
- **`package-lock.json`:** ya tenía un diff ajeno; no tocarlo.
- **CI:** el workflow del front corre en PR/push a `main` y `sprint-3-Emanuel`; abrir el PR contra `main`.
- **Contrato:** si el back cambia la forma de `AppointmentResponse`, actualizar `src/types/api.ts`, la prueba y esta spec antes de tocar la página (skill `drift-guards`).
- **Contraparte del back:** la spec del back marca el front como “pendiente”; al abrir el PR, actualizar esa fila en un commit del back si el equipo lo requiere.

## Execution Handoff

Plan completo. Ejecución recomendada: **nativa y secuencial**, porque la página, el servicio y las pruebas comparten tipos y contratos; `slice-scaffolder` no aporta un esqueleto distinto al que produce este plan. Gates: `security-reviewer` antes del push y `traceability-clerk` al cerrar. Dependencias externas: HU-16/DENT-16 (listado), HU-15/DENT-15 (notificación) y TEC-07/DENT-31 (vencimiento proactivo).
