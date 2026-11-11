# HU-13 · Proponer un horario alternativo (frontend)

| HU                                    | Jira                                                          | Sprint                  | Módulo                                    | Contraparte                                           | Estado                    |
| ------------------------------------- | ------------------------------------------------------------- | ----------------------- | ----------------------------------------- | ----------------------------------------------------- | ------------------------- |
| HU-13 Proponer un horario alternativo | [DENT-13](https://uttt-proyecto.atlassian.net/browse/DENT-13) | DentalConnect Sprint 07 | `src/pages/AppointmentManagementPage.tsx` | `DentalConnect-back` HU-13 (DENT-13, PR #16 mergeado) | 🚧 Borrador con evidencia |

## Contexto

**Actor:** usuario autorizado del consultorio (`CLINIC_ADMIN`) dueño de la solicitud.
**Problema:** el horario original no conviene y el consultorio necesita ofrecer al paciente una alternativa sin confirmarla ni reservarla.
**Depende de:** HU-13/DENT-13 del back (endpoint `POST /api/appointments/{appointmentId}/propose` y campos de propuesta ya mergeados). La respuesta del paciente es HU-14/DENT-14; el vencimiento es TEC-07/DENT-31; la entrega de la notificación es HU-15/DENT-15.
**Nombre:** summary del issue `DENT-13` leído por Atlassian MCP el 11-Nov-2026.

## Requisitos

- **R1 (AC1).** En el detalle de una solicitud `PENDING`, mostrar una sección para elegir fecha y horario alternativo. Al seleccionar un horario disponible y enviarlo, llamar al endpoint del back `POST /api/appointments/{appointmentId}/propose` mediante la ruta relativa `/appointments/{appointmentId}/propose` con `proposedStartsAt`. En éxito, mostrar estado `PROPOSED`, el horario original y el propuesto.
- **R2 (AC2).** Si el API responde `409 SLOT_UNAVAILABLE` o `409 APPOINTMENT_CONFLICT`, mostrar el mensaje del servidor, no mostrar confirmación y refrescar lista/detalle para reflejar el estado real.
- **R3 (AC3).** Si la solicitud ya está `PROPOSED`, ocultar el formulario de propuesta, mostrar ambos horarios y el vencimiento, y explicar que el paciente debe responder. No permitir una segunda propuesta desde la UI.
- **R4 (AC4).** La fecha alternativa no puede ser anterior a hoy en `America/Mexico_City`; los horarios se consultan al endpoint público de disponibilidad y solo se muestran los futuros. No ofrecer como alternativa el mismo inicio del horario original. Si el servidor responde `409 PAST_DATE`, mostrar su mensaje.
- **R5.** La propuesta conserva consultorio, dentista y servicio originales. La UI no permite cambiarlos en este flujo; solo cambia el inicio.
- **R6.** El listado acepta el filtro `PROPOSED` y muestra la etiqueta de estado correspondiente; cada fila con propuesta activa muestra también el horario propuesto.
- **R7.** Mostrar `proposalExpiresAt` cuando exista. No calcular vencimientos, no revertir estados ni ejecutar acciones de aceptación/rechazo en el cliente: eso pertenece a HU-14/DENT-14 y TEC-07/DENT-31.
- **R8.** La sección es accesible: `label` asociado al campo de fecha, botones nativos para los horarios con `aria-pressed`, errores con `role="alert"` y avisos con `role="status"`. Se reutilizan las clases existentes (`panel`, `form-grid`, `slot-list`, `slot`, `notice`, `appointment-summary`).
- **R9.** No agregar dependencias, rutas ni endpoints. La URL base del API se resuelve en `src/services/api.ts`, como exige `docs/quality-and-environments.md`. La base ya incluye `/api` (`.env.example` y README), así que la página debe usar rutas relativas sin `/api` (`/appointments`, `/appointments/{id}`, `/clinics/.../availability`). Esto corrige el duplicado `/api/api/...` que hoy tienen las llamadas de la página.

## Diseño

### Archivos

| Archivo                                                    | Cambio                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/services/api.ts`                                      | Exportar `apiBaseUrl()` y usarla en `request`; centraliza la resolución de `VITE_API_BASE_URL` y conserva el fallback de desarrollo.                                                                                                                                                             |
| `src/pages/AppointmentManagementPage.tsx`                  | Tipos de propuesta, normalización de IDs anidados, filtro/etiqueta `PROPOSED`, sección de propuesta, consulta de disponibilidad, envío y visualización de ambos horarios. Cambiar las rutas existentes de `/api/appointments...` a `/appointments...` para no duplicar el prefijo sobre la base. |
| `src/pages/AppointmentManagementPage.test.tsx`             | Nuevo: 5 pruebas de página con `fetch` simulado.                                                                                                                                                                                                                                                 |
| `src/routes/App.tsx`, `src/types/api.ts`, `src/styles.css` | Sin cambios; se mantiene el patrón local de la página y las clases existentes.                                                                                                                                                                                                                   |

### Estado de la página

La página ya mantiene `items`, `selected`, filtros y `request`. Se agrega:

- `proposedDate` (`YYYY-MM-DD`, por defecto hoy local).
- `slots`, `loadingSlots`, `slotError`.
- `selectedProposedStartsAt`, `proposing`.

La consulta de disponibilidad se dispara cuando hay una solicitud `PENDING` seleccionada, con `clinicId`, `dentistId`, `dentalServiceId` y fecha. Se descarta el slot cuyo `startsAt` coincida con `selected.startsAt`.

### Normalización

`Appointment` agrega `clinicId`, `dentistId`, `dentalServiceId`, `estimatedDurationMinutes`, `proposedStartsAt`, `proposedEndsAt` y `proposalExpiresAt`. `normalizeAppointment` toma los IDs de `item.dentist?.id`, `item.service?.id` y la duración de `item.service?.estimatedDurationMinutes`, manteniendo los campos planos si el back los envía.

### Envío

1. Validar que haya slot seleccionado y solicitud `PENDING`.
2. `POST /appointments/{id}/propose` (base + ruta) con `{ proposedStartsAt: slot.startsAt }`.
3. En éxito: aviso “Propuesta enviada…”, recargar lista y detalle.
4. En error: mostrar el mensaje del API y recargar lista/detalle para no dejar la UI en un estado optimista.
5. `NOTE (DENT-14)` junto a la visualización de `PROPOSED`: aceptar/rechazar es de HU-14.

## Contratos

### `POST /api/appointments/{appointmentId}/propose`

Request:

```json
{ "proposedStartsAt": "2026-11-12T18:00:00Z" }
```

Response `200`:

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

Errores que la UI muestra con el mensaje del servidor:

| HTTP | `error.code`                | Caso                                                  |
| ---- | --------------------------- | ----------------------------------------------------- |
| 400  | `VALIDATION_ERROR`          | body nulo o fecha inválida                            |
| 401  | —                           | sin token                                             |
| 403  | —                           | sin `CLINIC_ADMIN` o claim de consultorio             |
| 404  | —                           | cita inexistente o de otro consultorio                |
| 409  | `INVALID_STATUS`            | estado distinto de `PENDING`/`PROPOSED`               |
| 409  | `PROPOSAL_ALREADY_ACTIVE`   | ya existe propuesta activa                            |
| 409  | `PAST_DATE`                 | inicio propuesto en el pasado                         |
| 409  | `PROPOSAL_SAME_AS_ORIGINAL` | mismo inicio que el original                          |
| 409  | `DENTIST_UNAVAILABLE`       | dentista inactivo o de otro consultorio               |
| 409  | `SERVICE_CHANGED`           | servicio inactivo, no ofrecido o duración distinta    |
| 409  | `SLOT_UNAVAILABLE`          | fuera de jornada, descanso, bloqueo o cita confirmada |
| 409  | `APPOINTMENT_CONFLICT`      | conflicto de serialización o unicidad                 |

### Disponibilidad

`GET /api/clinics/{clinicId}/dentists/{dentistId}/availability?serviceId={serviceId}&date=YYYY-MM-DD`

```json
{
  "data": [{ "startsAt": "2026-11-12T18:00:00+00:00", "endsAt": "2026-11-12T18:30:00+00:00" }],
  "timeZone": "America/Mexico_City",
  "service": { "id": "c...", "name": "Limpieza", "estimatedDurationMinutes": 30 }
}
```

### Listado y detalle

- `GET /api/appointments?status=PROPOSED` devuelve las solicitudes con propuesta.
- El listado trae `proposedStartsAt`, `proposedEndsAt` y `proposalExpiresAt`.
- El detalle trae `startsAt`/`endsAt` originales, los tres campos de propuesta, `clinicId`, `dentist.id`, `service.id` y `service.estimatedDurationMinutes`.
- La spec del back es la fuente del contrato: `DentalConnect-back/specs/hu-13-proponer-horario-alternativo/spec.md`.

## Tests

Archivo nuevo: `src/pages/AppointmentManagementPage.test.tsx` (vitest + @testing-library, `fetch` simulado).

| Requisito      | Prueba                                                                                                                                                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1, R4, R5, R8 | `propone un horario alternativo y muestra ambos horarios` — abre el detalle, consulta disponibilidad con los IDs del detalle, excluye el horario original, valida `min` de la fecha, envía el slot elegido y muestra estado, horario original y propuesto. |
| R2             | `informa el conflicto de disponibilidad y conserva la solicitud pendiente` — el POST responde `409 SLOT_UNAVAILABLE`; se muestra el mensaje y no aparece confirmación.                                                                                     |
| R2, R3         | `refresca a propuesta activa cuando el servidor responde PROPOSAL_ALREADY_ACTIVE` — el POST responde `409`; tras refrescar se oculta el formulario y se ven ambos horarios.                                                                                |
| R3, R7         | `muestra la propuesta activa con ambos horarios y vencimiento` — detalle `PROPOSED`; no hay botón de proponer; se ven ambos horarios y `proposalExpiresAt`; la fila muestra el horario propuesto.                                                          |
| R6             | `filtra las solicitudes por estado propuesto` — el selector envía `status=PROPOSED` a `/appointments`.                                                                                                                                                     |
| R9             | `propone un horario alternativo…` y `filtra…` — la URL final contiene `/api/appointments...` y nunca `/api/api/`; la base se resuelve en `apiBaseUrl()`.                                                                                                   |

- Línea base medida: `npm test` → 7/7 (3 archivos).
- Conteo esperado al cerrar: 12/12 (7 existentes + 5 nuevas). Registrar el conteo real; no inventarlo.

## Criterios

- `npm run lint` → 0 errores.
- `npm run test` → 12/12 en verde (conteo real al cerrar).
- `npm run build` → compilación y empaquetado correctos.
- `npx prettier --check` sobre los archivos tocados.
- `security-reviewer` PASS y `traceability-clerk` OK sobre el diff.
- Sin `TODO`; diferidos marcados con `NOTE (DENT-14)`, `NOTE (DENT-15)` y `NOTE (DENT-31)` cuando apliquen.
- Diff limitado a `specs/`, `src/pages/AppointmentManagementPage.tsx`, `src/pages/AppointmentManagementPage.test.tsx` y `src/services/api.ts`.

## Límites

- Aceptar o rechazar la propuesta desde el consultorio: HU-14/DENT-14.
- Vencimiento, reversión a `PENDING` y aviso al consultorio: TEC-07/DENT-31.
- Entrega de la notificación al paciente: HU-15/DENT-15.
- Historial de propuestas y contrapropuesta del paciente: fuera de alcance.
- Cambiar servicio o dentista en la propuesta: fuera de alcance.
- Paginación, orden distinto o nuevos filtros del listado: fuera de alcance.
- Cambios en el back, migraciones o contrato: fuera de alcance; el contrato ya está mergeado.
- Prueba E2E contra un API real: fuera de alcance; el smoke manual se hace después del despliegue.

## Evidencia

| Campo               | Valor                                                                    |
| ------------------- | ------------------------------------------------------------------------ |
| Fecha               | 11-Nov-2026                                                              |
| Baseline tests      | `npm test` → 7/7 (3 archivos)                                            |
| Baseline lint/build | No se ejecutó antes; post-cambio en verde                                |
| Tests de la HU      | `npm test` → 12/12 (4 archivos)                                          |
| Lint                | `npm run lint` → 0 errores                                               |
| Build               | `npm run build` → `tsc -b` + Vite OK                                     |
| Commit              | `9e064d9`                                                                |
| PR                  | Pendiente (sin push/PR)                                                  |
| Guardas             | `security-reviewer` PASS; `traceability-clerk` OK (commit); PR pendiente |

## Aprobación

🚧 Borrador con evidencia. Trazabilidad OK; pendiente revisor indicado por el usuario y PR.
