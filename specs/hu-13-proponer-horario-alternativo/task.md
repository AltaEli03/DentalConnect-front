# Tareas · HU-13 Proponer un horario alternativo (frontend)

**Spec:** `spec.md`
**Plan:** `plan.md`
**Rama:** `Sprint-7-Eliuth` (convención `Sprint-NN-<integrante>`; commits citan `DENT-13`). Si el equipo mantiene la rama activa `Sprint-4-Emanuel`, trabajar ahí y citar `DENT-13`.
**Contrato:** `DentalConnect-back/specs/hu-13-proponer-horario-alternativo/spec.md` (DENT-13, PR #16).

## Checklist

- [x] **T1. URL base centralizada.** Exportar `apiBaseUrl()` en `src/services/api.ts`, usarla en `request` y en `AppointmentManagementPage`; corregir las rutas de la página a `/appointments...` y `/clinics/...` (sin `/api` duplicado).
      Verificación: `npm test` 7/7 existentes y `npm run lint` sin errores nuevos.

- [x] **T2. Pruebas RED.** Crear `src/pages/AppointmentManagementPage.test.tsx` con 5 casos: propuesta exitosa, conflicto `409 SLOT_UNAVAILABLE`, propuesta activa, filtro `PROPOSED` y refresco tras `409 PROPOSAL_ALREADY_ACTIVE`.
      Verificación: `npm test -- src/pages/AppointmentManagementPage.test.tsx` falla por UI ausente, no por imports/mocks.

- [x] **T3. Tipos y normalización.** Campos de propuesta, `clinicId`, `dentistId`, `dentalServiceId`, `estimatedDurationMinutes`; etiqueta y filtro `PROPOSED`; horario propuesto en la fila.
      Verificación: avanza el caso de filtro; los demás siguen en rojo hasta T4.

- [x] **T4. Sección de propuesta.** Fecha alternativa, disponibilidad del mismo dentista/servicio, exclusión del horario original, `POST /appointments/{id}/propose`, refresco y visualización de ambos horarios + vencimiento.
      Verificación: `npm test -- src/pages/AppointmentManagementPage.test.tsx` → 5/5.

- [x] **T5. Verificación y guardas.** Prettier sobre archivos tocados, lint, suite completa, build y agentes de seguridad/trazabilidad.
      Verificación: `npm run lint` 0 errores; `npm test` conteo real (12/12); `npm run build` OK; `security-reviewer` PASS; `traceability-clerk` OK (commit); PR pendiente.

- [x] **T6. .gitignore.** Ignorar `.vite`, `*.tsbuildinfo`, `.eslintcache`, `*.log`, archivos de sistema/editor y `*.tfvars`; conservar `.env.example` y lockfiles.
      Verificación: `git check-ignore` sobre los patrones y `git check-ignore` sin coincidencia para `infra/terraform.tfvars.example`.

## Pendientes con dueño

| Pendiente                                                 | Dueño            | Capa    | Marca                                                                |
| --------------------------------------------------------- | ---------------- | ------- | -------------------------------------------------------------------- |
| Aceptar/rechazar la propuesta desde el consultorio        | HU-14 / DENT-14  | Front   | `NOTE (DENT-14)`                                                     |
| Vencimiento, reversión a `PENDING` y aviso al consultorio | TEC-07 / DENT-31 | Back    | `NOTE (DENT-31)`                                                     |
| Entrega de la notificación al paciente                    | HU-15 / DENT-15  | Back    | `NOTE (DENT-15)`                                                     |
| Historial de propuestas y contrapropuesta del paciente    | Fuera de alcance | —       | —                                                                    |
| Cambiar servicio/dentista dentro de la propuesta          | Fuera de alcance | —       | —                                                                    |
| Smoke E2E contra el API desplegado                        | Eliuth (HU-13)   | Front   | —                                                                    |
| Estado de `DENT-13` en Jira (hoy `Terminada` por el back) | Eliuth (HU-13)   | Gestión | Confirmar si se reabre o se crea subtarea del front antes de cerrar. |

## Evidencia

| Fecha       | Baseline         | Tests HU           | Lint      | Build | Guardas                                                                  | Notas                                                                                   |
| ----------- | ---------------- | ------------------ | --------- | ----- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 11-Nov-2026 | 7/7 (3 archivos) | 12/12 (4 archivos) | 0 errores | OK    | `security-reviewer` PASS; `traceability-clerk` OK (commit); PR pendiente | Implementado en `Sprint-7-Eliuth`; commits `9e064d9`/`f8f573b`/`37c31f5`; PR pendiente. |
