# HU-14 · Aceptar o rechazar un horario alternativo (frontend)

| HU                                              | Jira                                                          | Sprint                  | Módulo                                                         | Contraparte                                           | Estado                    |
| ----------------------------------------------- | ------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------- | ----------------------------------------------------- | ------------------------- |
| HU-14 Aceptar o rechazar un horario alternativo | [DENT-14](https://uttt-proyecto.atlassian.net/browse/DENT-14) | DentalConnect Sprint 07 | `src/pages/AppointmentProposalPage.tsx` + `src/routes/App.tsx` | `DentalConnect-back` HU-14 (DENT-14, PR #17 mergeado) | 🚧 Borrador con evidencia |

## Contexto

**Actor:** paciente autenticado dueño de la solicitud (`Appointment.PatientSubject == sub` en el back).
**Problema:** el consultorio propuso un horario alternativo (HU-13), pero el paciente no tiene una pantalla para comparar el horario original con el propuesto ni para aceptarlo o rechazarlo. Sin esa respuesta la solicitud queda `PROPOSED` y el consultorio no sabe si reservar.
**Depende de:** HU-09/DENT-9 (creación de la solicitud y `id` en la respuesta), HU-13/DENT-13 (propuesta y campos de propuesta), HU-14/DENT-14 del back (rutas `GET /proposal`, `POST /proposal/accept`, `POST /proposal/reject`, PR #17 mergeado). El listado persistente del paciente es HU-16/DENT-16; la entrega del aviso es HU-15/DENT-15; el vencimiento proactivo es TEC-07/DENT-31.
**Decisión de alcance:** el paciente llega por un enlace directo y privado (`/mi-solicitud/:appointmentId`) que se muestra al crear la solicitud. No se construye un listado de citas: pertenece a HU-16/DENT-16 (`NOTE (DENT-16)`).
**Nombre y criterios:** summary y descripción de `DENT-14` leídos por Atlassian MCP el 11-Nov-2026. El back ya está mergeado en `main` (PR #17); el front no tenía pantalla de paciente.

## Requisitos

- **R1 (AC1, consulta).** En `/mi-solicitud/:appointmentId`, con sesión iniciada, consultar `GET /api/appointments/{appointmentId}/proposal` mediante la ruta relativa `/appointments/{appointmentId}/proposal`. Mostrar folio, estado, horario original (`startsAt`/`endsAt`), horario propuesto (`proposedStartsAt`/`proposedEndsAt`) y vencimiento (`proposalExpiresAt`) cuando existan.
- **R2 (AC1, aceptar).** Si el estado es `PROPOSED` y la propuesta está completa, mostrar “Aceptar horario propuesto”. Al confirmar, llamar `POST /api/appointments/{appointmentId}/proposal/accept` sin body. En `200`, mostrar estado `CONFIRMED`, el horario confirmado (`startsAt`/`endsAt` de la respuesta, que ya es el propuesto), ocultar las acciones y anunciar la confirmación con `role="status"`.
- **R3 (AC2, rechazar).** Con la misma condición, mostrar “Rechazar propuesta”. Al confirmar, llamar `POST /api/appointments/{appointmentId}/proposal/reject` sin body. En `200`, mostrar estado `REJECTED`, conservar el horario original y el propuesto rechazado, ocultar las acciones y anunciar el rechazo con `role="status"`.
- **R4 (AC3, conflicto).** Si aceptar responde `409 SLOT_UNAVAILABLE`, `409 DENTIST_UNAVAILABLE`, `409 SERVICE_CHANGED`, `409 PATIENT_CONFLICT` o `409 APPOINTMENT_CONFLICT`, mostrar el mensaje del servidor con `role="alert"`, volver a consultar el `GET` y mantener el estado real (`PROPOSED`). No mostrar confirmación ni cambiar el estado de forma optimista.
- **R5 (AC4, vencimiento).** Si aceptar o rechazar responde `409 PROPOSAL_EXPIRED`, mostrar el mensaje del servidor, volver a consultar el `GET` y mostrar `PENDING` con el horario original y sin acciones. El cliente no calcula el vencimiento ni revierte el estado por su cuenta; la autoridad es el back.
- **R6 (respuesta concurrente).** Si el `POST` responde `409 PROPOSAL_NOT_ACTIVE` (otra pestaña ya respondió, o la propuesta está incompleta), mostrar el mensaje, volver a consultar el `GET` y renderizar el estado real (`CONFIRMED`, `REJECTED`, `PENDING` o `PROPOSED`) sin acciones si ya no corresponde responder.
- **R7 (autorización y propiedad).** Sin sesión, no llamar al API y mostrar un aviso con enlace a iniciar sesión. Con `401`, mostrar “Inicia sesión para consultar tu solicitud.”. Con `404` (cita inexistente o de otro paciente), mostrar “La solicitud no existe o no pertenece a tu cuenta.” y no renderizar datos de la cita. La ruta no debe exponer datos antes de autenticar.
- **R8 (entrada).** En el éxito de `AppointmentRequestPage` (HU-09), mostrar un enlace “Ver el estado de mi solicitud” a `/mi-solicitud/{id}` usando el `id` de la respuesta de creación. El enlace es privado y directo; el listado persistente de citas queda para HU-16/DENT-16 (`NOTE (DENT-16)`).
- **R9 (UI y accesibilidad).** Reutilizar las clases existentes (`page-shell`, `panel`, `eyebrow`, `notice`, `error`, `appointment-summary`, `form-grid`). Usar botones nativos, `role="alert"` para errores, `role="status"` para avisos, un `aria-label` en la sección de respuesta y textos que distingan aceptar (reserva) de rechazar (no reserva). Sin CSS nuevo.
- **R10 (contrato y límites técnicos).** No agregar dependencias, endpoints ni migraciones. La URL base se resuelve en `src/services/api.ts` (ya incluye `/api`); las rutas del front son relativas y nunca contienen `/api/api/`. La forma camelCase de la respuesta es la del back y no se modifica. No se agrega manifest, service worker ni caché offline: la HU vive en la SPA existente y el repo no tiene infraestructura PWA.

## Diseño

### Archivos

| Archivo                                                                | Cambio                                                                                                                                    |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/api.ts`                                                     | Nuevo `AppointmentProposal` con la forma camelCase real de `AppointmentResponse`.                                                         |
| `src/services/api.ts`                                                  | Nuevo `ApiError` (mensaje + `status`) lanzado por `request`; métodos `proposal`, `acceptProposal` y `rejectProposal` con rutas relativas. |
| `src/pages/AppointmentProposalPage.tsx`                                | Página privada de consulta y respuesta; estados de carga, error, aviso y ocupado.                                                         |
| `src/pages/AppointmentProposalPage.test.tsx`                           | 9 pruebas de página con `fetch` simulado, `currentUser`/`currentIdToken` mockeados y `MemoryRouter`.                                      |
| `src/pages/AppointmentRequestPage.test.tsx`                            | 1 prueba del enlace al estado de la solicitud creada (R8).                                                                                |
| `src/routes/App.tsx`                                                   | Ruta `/mi-solicitud/:appointmentId`.                                                                                                      |
| `src/pages/AppointmentRequestPage.tsx`                                 | Guardar `id` del resultado y enlace al estado de la solicitud; `NOTE (DENT-16)`.                                                          |
| `src/pages/AppointmentManagementPage.tsx`                              | Retirar el `NOTE (DENT-14)` consumido; conservar `NOTE (DENT-31)`.                                                                        |
| `specs/hu-14-aceptar-rechazar-horario-alternativo/{spec,plan,task}.md` | Esta spec, el plan y el checklist.                                                                                                        |

Sin cambios en `src/styles.css`, `index.html`, `package.json` ni `package-lock.json`.

### Tipo y servicio

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

```ts
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

proposal: (id: string) => request<ApiResponse<AppointmentProposal>>(`/appointments/${encodeURIComponent(id)}/proposal`),
acceptProposal: (id: string) => request<ApiResponse<AppointmentProposal>>(`/appointments/${encodeURIComponent(id)}/proposal/accept`, { method: 'POST' }),
rejectProposal: (id: string) => request<ApiResponse<AppointmentProposal>>(`/appointments/${encodeURIComponent(id)}/proposal/reject`, { method: 'POST' }),
```

`request` sigue siendo el único lugar que arma `Authorization` y `Content-Type`; la página no toca el token. `ApiError` conserva la compatibilidad de los `catch` existentes porque extiende `Error`.

### Estado de la página

- `appointment?: AppointmentProposal`
- `loading`, `error`, `notice`, `busy`
- `load()`: `GET` al montar y cuando cambia `appointmentId` o hay sesión; si el `GET` responde `404`, limpia `appointment` para no dejar datos de una solicitud anterior.
- `respond(accept: boolean)`: `POST`; en éxito usa la respuesta como nuevo estado; en error guarda el mensaje y vuelve a ejecutar `load()` para mostrar la verdad del servidor.
- `message(cause)`: mapea `ApiError.status === 401` y `404` a los textos de R7; el resto usa el mensaje del servidor.

### Render

- `authLoading` → “Cargando sesión…”.
- `!user` → panel con “Inicia sesión con la cuenta que creó la solicitud.” y enlace “Iniciar sesión para consultar mi solicitud”. No se llama al API.
- `loading && !appointment` → “Cargando tu solicitud…”.
- `error && !appointment` → error con `role="alert"` y enlace a `/clinics`.
- `appointment`:
  - `<h1>Solicitud {folio}</h1>`; si no hay folio, “Solicitud de cita”.
  - Estado con etiquetas: `PENDING` Pendiente, `PROPOSED` Con propuesta, `CONFIRMED` Confirmada, `REJECTED` Rechazada, `CANCELLED` Cancelada.
  - `PROPOSED` con ambos horarios propuestos: “Horario original”, “Horario propuesto”, “Vence” y sección `aria-label="Responder propuesta"` con los dos botones. Texto: “Si aceptas, la cita queda confirmada en el horario propuesto. Si rechazas, la solicitud queda rechazada y no se reserva ningún horario.”
  - `PROPOSED` incompleto: aviso “La propuesta está incompleta. Solicita un nuevo horario al consultorio.”, sin botones.
  - `REJECTED` con propuesta conservada: “Horario original” y “Horario propuesto rechazado”.
  - `CONFIRMED`: “Horario confirmado”.
  - `PENDING`: “Horario” y aviso “No hay una propuesta activa. Tu solicitud sigue pendiente con el horario original.”
  - `CANCELLED`: “Horario” y aviso “La solicitud fue cancelada.”
- Fechas en `America/Mexico_City` con `Intl.DateTimeFormat('es-MX')`, como el resto de la app; el back persiste UTC.

### Enlace de entrada (HU-09)

`AppointmentRequestPage` guarda `{ id, folio, status }` en `requestResult` y, tras el `201`, muestra:

```tsx
<Link to={`/mi-solicitud/${encodeURIComponent(requestResult.id)}`}>
  Ver el estado de mi solicitud
</Link>
```

El enlace queda dentro del aviso `role="status"` existente. Se marca `NOTE (DENT-16)` porque el listado persistente no forma parte de esta HU.

## Contratos

### `GET /api/appointments/{appointmentId}/proposal`

Sin body. Requiere token. `200`:

```json
{
  "data": {
    "id": "c...",
    "folio": "DC-...",
    "status": "PROPOSED",
    "clinicId": "c...",
    "dentistId": "c...",
    "dentalServiceId": "c...",
    "startsAt": "2026-11-15T17:00:00+00:00",
    "endsAt": "2026-11-15T17:30:00+00:00",
    "proposedStartsAt": "2026-11-12T18:00:00+00:00",
    "proposedEndsAt": "2026-11-12T18:30:00+00:00",
    "proposalExpiresAt": "2026-11-12T12:00:00+00:00",
    "timeZoneId": "America/Mexico_City"
  }
}
```

Sin propuesta activa, los tres campos `proposed*`/`proposalExpiresAt` son `null` y `status` refleja el estado real.

### `POST /api/appointments/{appointmentId}/proposal/accept`

Sin body. Requiere token. `200`:

```json
{
  "data": {
    "id": "c...",
    "folio": "DC-...",
    "status": "CONFIRMED",
    "clinicId": "c...",
    "dentistId": "c...",
    "dentalServiceId": "c...",
    "startsAt": "2026-11-12T18:00:00+00:00",
    "endsAt": "2026-11-12T18:30:00+00:00",
    "proposedStartsAt": null,
    "proposedEndsAt": null,
    "proposalExpiresAt": null,
    "timeZoneId": "America/Mexico_City"
  }
}
```

### `POST /api/appointments/{appointmentId}/proposal/reject`

Sin body. Requiere token. `200` con `status: "REJECTED"`, `startsAt`/`endsAt` originales y los tres campos de propuesta conservados. `rejectedAt`/`rejectedBy` quedan en el back y no se muestran en esta pantalla.

### Errores y comportamiento de la UI

| HTTP | `error.code`           | Caso                                                     | UI                                                              |
| ---- | ---------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| 401  | —                      | sin token o token vencido                                | “Inicia sesión para consultar tu solicitud.”                    |
| 404  | —                      | cita inexistente o de otro paciente                      | “La solicitud no existe o no pertenece a tu cuenta.”; sin datos |
| 409  | `PROPOSAL_NOT_ACTIVE`  | estado distinto de `PROPOSED` o propuesta incompleta     | mensaje del servidor + `GET`; estado real                       |
| 409  | `PROPOSAL_EXPIRED`     | `ProposalExpiresAt <= now`                               | mensaje del servidor + `GET`; `PENDING`, sin acciones           |
| 409  | `SLOT_UNAVAILABLE`     | intervalo ocupado, fuera de jornada, descanso o bloqueo  | mensaje del servidor + `GET`; sigue `PROPOSED`                  |
| 409  | `DENTIST_UNAVAILABLE`  | dentista inactivo o de otro consultorio                  | igual que `SLOT_UNAVAILABLE`                                    |
| 409  | `SERVICE_CHANGED`      | servicio inactivo, no ofrecido o duración distinta       | igual que `SLOT_UNAVAILABLE`                                    |
| 409  | `PATIENT_CONFLICT`     | el paciente ya tiene una cita confirmada en el intervalo | igual que `SLOT_UNAVAILABLE`                                    |
| 409  | `APPOINTMENT_CONFLICT` | carrera de serialización o exclusión de agenda           | igual que `SLOT_UNAVAILABLE`                                    |
| red  | —                      | fallo de red o respuesta no JSON                         | mensaje genérico; no se inventa estado                          |

La fuente del contrato es `DentalConnect-back/specs/hu-14-aceptar-rechazar-horario-alternativo/spec.md` (DENT-14, PR #17). No se duplica la lógica de vencimiento ni de disponibilidad en el front.

## Tests

Archivos nuevos:

- `src/pages/AppointmentProposalPage.test.tsx` (vitest + @testing-library, `fetch` simulado, `currentUser`/`currentIdToken` mockeados, `MemoryRouter` + `App`): 9 pruebas.
- `src/pages/AppointmentRequestPage.test.tsx` (`api` y `currentUser` mockeados): 1 prueba.

| Requisito       | Prueba                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1, R2, R9, R10 | `muestra ambos horarios y acepta la propuesta` — `GET` con `PROPOSED`; se ven folio, estado, horario original, propuesto y vencimiento; el `GET` lleva `Bearer`; la sección tiene `role="region"` con `aria-label="Responder propuesta"` y botones nativos; al aceptar se llama `POST .../proposal/accept`; se muestra “Confirmada” y “Horario confirmado”, sin botones; ninguna URL contiene `/api/api/`. |
| R3              | `rechaza la propuesta y conserva el horario original` — `POST .../proposal/reject`; se muestra “Rechazada”, “Horario original” y “Horario propuesto rechazado”, sin botones.                                                                                                                                                                                                                               |
| R4              | `informa el conflicto de disponibilidad sin confirmar` — el `POST` responde `409 SLOT_UNAVAILABLE`; se muestra el mensaje con `role="alert"`; el `GET` se repite; sigue “Con propuesta” y los botones; no hay aviso de éxito.                                                                                                                                                                              |
| R5              | `impide aceptar una propuesta vencida y muestra la solicitud pendiente` — el `POST` responde `409 PROPOSAL_EXPIRED`; el `GET` posterior devuelve `PENDING` sin campos de propuesta; se muestra “Pendiente” y “Horario”, sin botones.                                                                                                                                                                       |
| R6              | `refresca a confirmada cuando la propuesta ya fue respondida` — el `POST` responde `409 PROPOSAL_NOT_ACTIVE`; el `GET` posterior devuelve `CONFIRMED`; se muestra “Confirmada” y “Horario confirmado”, sin botones.                                                                                                                                                                                        |
| R6              | `avisa cuando la propuesta está incompleta` — el `GET` devuelve `PROPOSED` sin `proposedStartsAt`/`proposedEndsAt`; se muestra el aviso de propuesta incompleta y no hay botones.                                                                                                                                                                                                                          |
| R7              | `no consulta el API sin sesión` — `currentUser` null; se ve el aviso y el enlace de login; `fetch` no se llama.                                                                                                                                                                                                                                                                                            |
| R7              | `muestra el mensaje de sesión requerida con 401` — el `GET` responde `401` sin body; se ve “Inicia sesión para consultar tu solicitud.”.                                                                                                                                                                                                                                                                   |
| R7              | `oculta la solicitud de otra cuenta con 404` — el `GET` responde `404` sin body; se ve el mensaje de R7 y no se renderiza el folio.                                                                                                                                                                                                                                                                        |
| R8              | `muestra el enlace al estado de la solicitud creada` — en `AppointmentRequestPage`, tras `api.createAppointment`, el aviso de éxito contiene el enlace `/mi-solicitud/apt-1`.                                                                                                                                                                                                                              |

- Línea base medida el 11-Nov-2026: `npm test` → 12/12 (4 archivos).
- Conteo esperado al cerrar: 22/22 (6 archivos). Registrar el conteo real; no inventarlo.
- Cada prueba cita su requisito con un comentario `// DENT-14 R1` (o el que corresponda).

## Criterios

- `npm run lint` → 0 errores.
- `npm test` → 22/22 en verde (conteo real al cerrar; si difiere, corregir esta spec).
- `npm run build` → `tsc -b` + Vite OK.
- `npx prettier --check` sobre `src/pages/AppointmentProposalPage.tsx`, `src/pages/AppointmentProposalPage.test.tsx`, `src/pages/AppointmentRequestPage.tsx`, `src/pages/AppointmentRequestPage.test.tsx`, `src/pages/AppointmentManagementPage.tsx`, `src/routes/App.tsx`, `src/services/api.ts` y `src/types/api.ts`.
- `security-reviewer` PASS sobre el diff contra `origin/main`.
- `traceability-clerk` OK: DENT-14 ↔ spec ↔ código ↔ pruebas; `NOTE (DENT-16)` en las 3 capas.
- Sin `TODO`; `NOTE (DENT-16)` vigente y `NOTE (DENT-31)` existente. El `NOTE (DENT-14)` de `AppointmentManagementPage` se retira porque esta HU ya implementa la respuesta del paciente; la HU-13 se reconcilia para que no quede como pendiente.
- Diff limitado a `specs/hu-14-aceptar-rechazar-horario-alternativo/`, `specs/hu-13-proponer-horario-alternativo/{spec,plan,task}.md`, `src/pages/AppointmentProposalPage.tsx`, `src/pages/AppointmentProposalPage.test.tsx`, `src/pages/AppointmentRequestPage.tsx`, `src/pages/AppointmentRequestPage.test.tsx`, `src/pages/AppointmentManagementPage.tsx`, `src/routes/App.tsx`, `src/services/api.ts` y `src/types/api.ts`.
- `package-lock.json` no se toca.
- Jira `DENT-14` se actualiza al cerrar con el enlace del PR; no se marca terminado sin PR.

## Límites

- Listado persistente, próximas citas e historial del paciente: HU-16/DENT-16 (`NOTE (DENT-16)`). Esta HU solo llega por enlace directo.
- Entrega del aviso al paciente (correo, push o in-app) y enlace desde la notificación: HU-15/DENT-15.
- Barrido proactivo de propuestas vencidas y aviso al consultorio: TEC-07/DENT-31. El front solo reacciona al `409 PROPOSAL_EXPIRED`.
- Visualización in-app de la notificación al consultorio: HU-15/DENT-15.
- Nombre de consultorio, dentista y servicio: el contrato de HU-14 solo devuelve IDs; HU-16 los muestra.
- Contrapropuesta, negociación por chat, cancelación y reprogramación del paciente: fuera de alcance.
- UI del consultorio para proponer: ya cubierta por HU-13/DENT-13.
- Cambios en el back, migraciones o contrato: fuera de alcance; el contrato ya está mergeado.
- Manifest, service worker, caché offline o instalación PWA: fuera de alcance.
- Prueba E2E contra un API real: fuera de alcance; smoke manual después del despliegue.
- Retorno automático al enlace después de iniciar sesión: fuera de alcance; el paciente puede reabrir o volver atrás.

## Evidencia

| Fecha       | Baseline                        | Tests HU                        | Lint                       | Build                | Guardas                                                                                          | Notas                                                                                                                                                                               |
| ----------- | ------------------------------- | ------------------------------- | -------------------------- | -------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11-Nov-2026 | `npm test` → 12/12 (4 archivos) | `npm test` → 22/22 (6 archivos) | `npm run lint` → 0 errores | `npm run build` → OK | `security-reviewer` PASS (4 WARN no bloqueantes); `traceability-clerk` pendiente de re-auditoría | Rama `Sprint-7-Eliuth` (base `origin/main` a7d3b9c); commits `cd28e6f` specs, `37284f8` servicio, `224c87b` página, `081b175` enlace, `086158f` NOTE; cierre en HEAD. PR pendiente. |

## Aprobación

🚧 Borrador con evidencia. Pendiente de revisor indicado por el usuario y del PR.
