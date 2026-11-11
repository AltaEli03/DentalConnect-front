# Tareas · HU-14 Aceptar o rechazar un horario alternativo (frontend)

**Spec:** `spec.md`
**Plan:** `plan.md`
**Rama:** `Sprint-7-Eliuth`, basada en `origin/main` (`a7d3b9c`); commits citan `DENT-14`.
**Contrato:** `DentalConnect-back/specs/hu-14-aceptar-rechazar-horario-alternativo/spec.md` (DENT-14, PR #17 mergeado).

## Checklist

- [ ] **T1. Specs.** Crear `spec.md`, `plan.md` y `task.md` con la cabecera de `DENT-14` leída por Atlassian MCP, la contraparte del back (PR #17) y el alcance aprobado (enlace directo, sin listado).
      Verificación: cabecera y summary coinciden con Jira; `git diff --check` sin espacios sobrantes.

- [ ] **T2. Contrato y servicio.** Agregar `AppointmentProposal` en `src/types/api.ts`; `ApiError` y los métodos `proposal`, `acceptProposal`, `rejectProposal` en `src/services/api.ts`.
      Verificación: `npm run build` OK y `npm test` 12/12 existentes.

- [ ] **T3. Pruebas RED.** Crear `src/pages/AppointmentProposalPage.test.tsx` con 8 casos: aceptar, rechazar, `409 SLOT_UNAVAILABLE`, `409 PROPOSAL_EXPIRED`, `409 PROPOSAL_NOT_ACTIVE`, sin sesión, `401` y `404`.
      Verificación: `npm test -- src/pages/AppointmentProposalPage.test.tsx` falla por ruta/página ausente, no por imports ni mocks.

- [ ] **T4. Página y ruta.** Implementar `AppointmentProposalPage.tsx` y montar `/mi-solicitud/:appointmentId` en `src/routes/App.tsx`; guard de sesión, comparación de horarios, aceptar/rechazar, refresco tras error y accesibilidad.
      Verificación: `npm test -- src/pages/AppointmentProposalPage.test.tsx` → 8/8; `npm run lint` y `npm run build` OK.

- [ ] **T5. Enlace desde HU-09.** Guardar `id` en `requestResult` de `AppointmentRequestPage.tsx` y mostrar “Ver el estado de mi solicitud”; prueba `src/pages/AppointmentRequestPage.test.tsx` y `NOTE (DENT-16)`.
      Verificación: `npm test -- src/pages/AppointmentRequestPage.test.tsx` → 1/1; `npm run lint`, `npm test` 21/21 y `npm run build` OK.

- [ ] **T6. Verificación y guardas.** Retirar el `NOTE (DENT-14)` consumido de `AppointmentManagementPage.tsx`; Prettier sobre los archivos tocados, suite completa, build, `security-reviewer` PASS y `traceability-clerk` OK.
      Verificación: `grep -rn "NOTE (DENT-14)" src` sin coincidencias; `npx prettier --check ...`; `npm run lint` 0; `npm test` 21/21; `npm run build` OK; guardas sin gaps bloqueantes.

- [ ] **T7. Cierre y PR.** Actualizar evidencia en `spec.md` y checklist; comentar `DENT-14` con el enlace del PR; abrir PR contra `main` con título `Sprint 7: aceptar o rechazar un horario alternativo (HU-14 · DENT-14) (vitest 21)`.
      Verificación: PR creado y `ci.yml` en verde; sin marcar `DENT-14` como terminada sin PR.

## Pendientes con dueño

| Pendiente                                                                | Dueño            | Capa         | Marca            |
| ------------------------------------------------------------------------ | ---------------- | ------------ | ---------------- |
| Listado persistente, próximas citas e historial del paciente             | HU-16 / DENT-16  | Front + back | `NOTE (DENT-16)` |
| Entrega del aviso al paciente y enlace desde la notificación             | HU-15 / DENT-15  | Back         | —                |
| Barrido proactivo de propuestas vencidas y aviso al consultorio          | TEC-07 / DENT-31 | Back         | `NOTE (DENT-31)` |
| Visualización in-app de la notificación al consultorio                   | HU-15 / DENT-15  | Back + front | —                |
| Nombre de consultorio, dentista y servicio en la pantalla                | HU-16 / DENT-16  | Front        | —                |
| Actualizar la fila `Contraparte` de la spec del back con el PR del front | Eliuth (back)    | Back         | —                |
| Contrapropuesta, chat, cancelación y reprogramación                      | Fuera de alcance | —            | —                |
| Manifest, service worker y caché offline                                 | Fuera de alcance | —            | —                |
| Smoke E2E contra el API desplegado                                       | Eliuth (HU-14)   | Front        | Pendiente        |
| Push y PR del front                                                      | Eliuth (HU-14)   | Gestión      | Pendiente        |

## Evidencia

| Fecha       | Baseline                        | Tests HU                   | Lint      | Build     | Guardas   | Notas                                                                                                 |
| ----------- | ------------------------------- | -------------------------- | --------- | --------- | --------- | ----------------------------------------------------------------------------------------------------- |
| 11-Nov-2026 | `npm test` → 12/12 (4 archivos) | Pendiente (esperado 21/21) | Pendiente | Pendiente | Pendiente | Spec, plan y checklist creados; implementación no iniciada. Back DENT-14 mergeado en `main` (PR #17). |

## Estado

🚧 Borrador. No hay código ni pruebas de la HU todavía; la implementación empieza en T2.
