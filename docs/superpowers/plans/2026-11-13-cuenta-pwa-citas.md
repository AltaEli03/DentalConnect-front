# Cuenta, PWA, tema y citas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Entregar auth accesible, PWA instalable, tema claro/oscuro/sistema, login de consultorio y vistas de citas para paciente y consultorio.

**Architecture:** El back gana `GET /api/appointments/mine`. El front suma un `ThemeProvider` con tokens semánticos, un `PasswordField` reutilizable, un cliente `clinicApi` compartido, dos páginas de citas y `vite-plugin-pwa` para manifest/service worker. La app conserva Tailwind + CSS legado, ambos alimentados por las mismas variables de tema.

**Tech Stack:** React 19, Vite 6, Tailwind 4.3.5, Vitest 4, .NET 10, EF Core, `vite-plugin-pwa@2.0.0`.

**Spec:** `docs/superpowers/specs/2026-11-13-cuenta-pwa-citas-design.md`

## Global Constraints

- No cachear `/api/appointments` ni `/api/auth` en el service worker.
- El rol y el `clinicId` del front son solo presentación; el back sigue siendo la autoridad.
- No agregar librería de iconos; SVG inline.
- Mantener `es-MX`, `America/Mexico_City` y el contrato camelCase.
- Cada tarea termina con lint + tests verdes y un commit.

## Review Focus

- Contraseña: el toggle no debe enviar el formulario ni perder el foco; los requisitos deben ser legibles por lector de pantalla.
- Tema: no debe haber flash del tema incorrecto; el toggle debe funcionar en admin y auth.
- PWA: una cita o un token nunca deben quedar en caché; el shell debe cargar offline.
- Login de consultorio: una cuenta de paciente no debe entrar al panel; un admin sin `clinicId` debe ver un mensaje claro.
- Citas: el paciente solo ve sus citas; el consultorio solo las de su clínica.

---

### Task 1: Back — citas del paciente

**Files:**
- Modify: `../DentalConnect-back/DentalConnect/AppointmentEndpoints.cs`
- Create/Modify: `../DentalConnect-back/DentalConnect.Tests/PatientAppointmentsApiTests.cs`
- Branch: `codex/citas-paciente` in the back repo.

**Interfaces:**
- Produces: `GET /api/appointments/mine` → `{ data: PatientAppointment[] }`, autenticado por `sub`.
- Shape: `id, folio, status, startsAt, endsAt, proposedStartsAt, proposedEndsAt, proposalExpiresAt, createdAt, timeZoneId, rejectionReason, clinic{id,name,municipality,state,phone}, dentist{id,firstName,lastName}, service{id,name,estimatedDurationMinutes}`.

- [ ] **Step 1: Escribir la prueba de 401**

```csharp
[PostgresFact]
public async Task Mine_WithoutToken_Returns401()
{
    using var client = _fixture.Factory!.CreateClient();
    using var response = await client.GetAsync("/api/appointments/mine");
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
}
```

- [ ] **Step 2: Prueba de aislamiento y contrato**

Sembrar una cita del paciente autenticado y otra de `other-patient`; pedir `/api/appointments/mine` con el cliente del paciente; afirmar que solo aparece la propia, que `clinic.name`, `dentist.firstName` y `service.name` están presentes, y que el orden es `startsAt` descendente.

- [ ] **Step 3: Ejecutar y ver fallar**

Run: `dotnet test --filter PatientAppointments`
Expected: FAIL 404/405 o compilación.

- [ ] **Step 4: Implementar `ListForPatientAsync`**

Registrar `endpoints.MapGet("/api/appointments/mine", ListForPatientAsync).RequireAuthorization();` antes de la ruta con `{appointmentId}`. Usar `TryGetPatientSubject`, `AsNoTracking`, joins a `Clinics`, `Dentists` y `DentalServices`, `where a.PatientSubject == patient`, `orderby a.StartsAt descending`.

- [ ] **Step 5: Ejecutar y commit**

Run: `dotnet test --filter PatientAppointments`
Expected: PASS (o skip si no hay Postgres, indicando el motivo).
```bash
git add DentalConnect/AppointmentEndpoints.cs DentalConnect.Tests/PatientAppointmentsApiTests.cs
git commit -m "feat: list patient appointments"
```

---

### Task 2: Front — tipos, API y password reutilizable

**Files:**
- Modify: `src/types/api.ts`, `src/services/api.ts`, `src/services/cognito.ts`
- Create: `src/lib/password.ts`, `src/lib/password.test.ts`, `src/components/auth/PasswordField.tsx`, `src/components/auth/AuthLayout.tsx`
- Modify: `src/pages/AuthPages.tsx`

**Interfaces:**
- Produces: `api.myAppointments()`.
- Produces: `passwordChecks(password: string, confirm?: string): { length: boolean; maxLength: boolean; matches?: boolean; variety: boolean }`.
- Produces: `<PasswordField id label value onChange autoComplete confirmValue? showRequirements? error? hint?>`.
- Produces: `<AuthLayout title visualTitle? visualText? wide? hideVisual?>`.
- Produces: `CognitoProfile.clinicId?: string`.

- [ ] **Step 1: Tests de `passwordChecks` y del toggle**

```ts
expect(passwordChecks('corta').length).toBe(false);
expect(passwordChecks('DentConnect123!').length).toBe(true);
expect(passwordChecks('DentConnect123!', 'otra').matches).toBe(false);
```

En `PasswordField`, el botón debe tener nombre `Mostrar contraseña`/`Ocultar contraseña`, `aria-pressed` y cambiar el `type` del input; no debe hacer submit.

- [ ] **Step 2: Implementar tipos, API y lib**

`myAppointments` usa `request<{data: PatientAppointment[]}>('/appointments/mine')`. `cognito.profileFromSession` lee `claims.clinic_id`, `custom:clinic_id`, `clinicId`, `custom:clinicId`.

- [ ] **Step 3: Implementar `PasswordField` y `AuthLayout`**

El campo muestra requisitos 12–128 y coincidencia; usa `aria-describedby`; el toggle es `type="button"`, `aria-controls` y `aria-pressed`. Los iconos de ojo son SVG inline.

- [ ] **Step 4: Mejorar login/registro/verificación**

Login con `PasswordField` y enlace “¿Eres consultorio? Accede aquí”. Registro con dos `PasswordField`, teléfono `type="tel"`, `inputMode="tel"`, `autoComplete="tel"`, ayuda de lada y grid de dos columnas en escritorio (`.form-row`). Verificación con `PasswordField`.

- [ ] **Step 5: Verificar y commit**

Run: `npm run lint && npx vitest run src/lib/password.test.ts src/pages/AuthPages.test.tsx`
Expected: PASS.
```bash
git add src/lib/password.* src/components/auth src/pages/AuthPages.tsx src/services src/types
git commit -m "feat: accessible password and phone fields"
```

---

### Task 3: Login de consultorio

**Files:**
- Create: `src/pages/ClinicLoginPage.tsx`, `src/pages/ClinicLoginPage.test.tsx`
- Modify: `src/routes/App.tsx`, `src/pages/AuthPages.tsx`

**Interfaces:**
- Consumes: `signIn`, `signOut`, `useAuth`, `AuthLayout`, `PasswordField`.
- Produces: route `/consultorio/iniciar-sesion`.

- [ ] **Step 1: Tests**

```tsx
// paciente rechazado
signIn.mockResolvedValue({ email, firstName, lastName, role: 'PACIENTE' });
// clic Entrar → alerta “Esta cuenta es de paciente” y sin navegación a /consultorio/citas

// admin sin clínica
signIn.mockResolvedValue({ role: 'CLINIC_ADMIN', clinicId: undefined });
// alerta “no está vinculada a un consultorio”

// admin válido
signIn.mockResolvedValue({ role: 'CLINIC_ADMIN', clinicId: 'clinic-1' });
// location /consultorio/citas
```

- [ ] **Step 2: Implementar**

Validar `role.toUpperCase().includes('CLINIC_ADMIN')` y `clinicId`; si falla, `signOut()` y mensaje con enlace al login de paciente. Si pasa, `acceptLogin` y `nav('/consultorio/citas')`. Copy propio y enlace de vuelta a paciente.

- [ ] **Step 3: Verificar y commit**

Run: `npm run lint && npx vitest run src/pages/ClinicLoginPage.test.tsx`
Expected: PASS.
```bash
git add src/pages/ClinicLoginPage.* src/routes/App.tsx src/pages/AuthPages.tsx
git commit -m "feat: add clinic login"
```

---

### Task 4: Tema claro/oscuro/sistema

**Files:**
- Create: `src/lib/theme.ts`, `src/lib/theme.test.ts`, `src/theme/ThemeProvider.tsx`, `src/theme/ThemeToggle.tsx`, `src/theme/ThemeToggle.test.tsx`
- Modify: `src/main.tsx`, `index.html`, `src/styles.css`, `src/routes/App.tsx`, `src/test/setup.ts`
- Modify: patient pages replacing `text-brand`→`text-heading`, `bg-white`→`bg-surface`; legacy CSS colors → variables.

**Interfaces:**
- Produces: `ThemePreference = 'light' | 'dark' | 'system'`; `readThemePreference`, `resolveTheme`, `applyTheme`.
- Produces: `ThemeProvider`, `useTheme()`, `<ThemeToggle />` with three `aria-pressed` buttons.

- [ ] **Step 1: Tests de tema**

```ts
expect(resolveTheme('system', true)).toBe('dark');
expect(resolveTheme('light', true)).toBe('light');
```

`ThemeToggle`: clic en Oscuro agrega `.dark` a `<html>`, persiste `dark` y marca `aria-pressed`; clic en Sistema usa `matchMedia`.

- [ ] **Step 2: Implementar provider, hook y toggle**

Persistir en `localStorage` (`dentalconnect-theme`), escuchar `matchMedia('(prefers-color-scheme: dark)')`, aplicar `document.documentElement.classList.toggle('dark')`, `style.colorScheme` y `meta[name="theme-color"]`.

- [ ] **Step 3: Anti-flash en `index.html`**

Script inline antes del bundle: lee `localStorage` y `matchMedia`, aplica `.dark` y `colorScheme`. Agregar `<meta name="color-scheme" content="light dark">`.

- [ ] **Step 4: Tokens y overrides**

En `styles.css`: `@custom-variant dark (&:where(.dark, .dark *));`; tokens `--color-surface`, `--color-surface-alt`, `--color-surface-soft`, `--color-heading`, `--color-ink`, `--color-muted`, `--color-line`, `--color-line-strong`, `--color-brand`, `--color-accent`, `--color-coral`, `--color-danger`, `--color-success`. `.dark` los redefine. Reemplazar colores literales en CSS legado por variables y agregar overrides de estados.

- [ ] **Step 5: Medir contraste**

Ejecutar el script de luminancia para todos los pares texto/fondo de ambos temas. Ningún texto normal < 4.5:1; componentes < 3:1. Documentar los valores en el commit o en la spec.

- [ ] **Step 6: Verificar y commit**

Run: `npm run lint && npx vitest run src/lib/theme.test.ts src/theme/ThemeToggle.test.tsx && npm run build`
Expected: PASS y CSS con `.dark`.
```bash
git add src/lib/theme.* src/theme src/main.tsx index.html src/styles.css src/routes/App.tsx src/test/setup.ts src/pages
git commit -m "feat: add light dark system theme"
```

---

### Task 5: PWA

**Files:**
- Modify: `vite.config.ts`, `index.html`, `src/routes/App.tsx`, `src/vite-env.d.ts`, `package.json`
- Create: `pwa-assets.config.ts`, `public/icon-source.svg`, `src/components/NetworkStatus.tsx`, `src/components/NetworkStatus.test.tsx`

**Interfaces:**
- Produces: manifest, `sw.js`, iconos 192/512/maskable/apple, aviso offline.

- [ ] **Step 1: Instalar y generar iconos**

```bash
npm install -D vite-plugin-pwa@2.0.0 @vite-pwa/assets-generator@2.0.0
npx pwa-assets-generator --config pwa-assets.config.ts
```

El SVG fuente es cuadrado, con fondo `#003B4A` y monograma `DC` en blanco.

- [ ] **Step 2: Configurar VitePWA**

```ts
VitePWA({
  registerType: 'autoUpdate',
  manifest: { name: 'DentalConnect', short_name: 'DentalConnect', lang: 'es-MX', start_url: '/clinics', scope: '/', display: 'standalone', theme_color: '#003B4A', background_color: '#F5F8FA', icons: [...] },
  workbox: {
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
      { urlPattern: /\/api\/clinics/, handler: 'NetworkFirst', options: { cacheName: 'public-clinics', expiration: { maxEntries: 50, maxAgeSeconds: 86400 } } },
      { urlPattern: /\/api\/(appointments|auth)/, handler: 'NetworkOnly' },
      { urlPattern: /\.(?:png|jpg|jpeg|webp|svg)$/, handler: 'CacheFirst', options: { cacheName: 'images', expiration: { maxEntries: 60, maxAgeSeconds: 2592000 } } }
    ]
  }
})
```

- [ ] **Step 3: Aviso offline**

`NetworkStatus` escucha `online`/`offline`; muestra `role="status"` “Sin conexión. Puedes consultar la información guardada.” No bloquea la app.

- [ ] **Step 4: Verificar y commit**

Run: `npm run build && ls dist/manifest.webmanifest dist/sw.js dist/pwa-192x192.png dist/pwa-512x512.png`
Expected: artefactos presentes y `sw.js` con precaché.
```bash
git add vite.config.ts index.html src/routes/App.tsx src/vite-env.d.ts package.json package-lock.json pwa-assets.config.ts public src/components/NetworkStatus.*
git commit -m "feat: add installable pwa shell"
```

---

### Task 6: Página de citas del paciente

**Files:**
- Create: `src/pages/PatientAppointmentsPage.tsx`, `src/pages/PatientAppointmentsPage.test.tsx`
- Modify: `src/routes/App.tsx`

**Interfaces:**
- Consumes: `api.myAppointments()`, `formatDateTime`, `StatusBadge`, `Notice`, `Skeleton`, `Button`.
- Produces: `/mis-citas`.

- [ ] **Step 1: Tests**

Sin sesión: CTA de login con retorno. Con citas: separa próximas/historial; una `PROPOSED` muestra enlace a `/mi-solicitud/:id`; error muestra alerta y reintento.

- [ ] **Step 2: Implementar**

Fetch al montar; `now = Date.now()`; próximas = `startsAt >= now && status not in REJECTED/CANCELLED`; historial = resto. Cada cita muestra consultorio, dentista, servicio, fecha, folio, estado. Estados de carga/error/vacío. Enlace al directorio para agendar otra.

- [ ] **Step 3: Verificar y commit**

Run: `npm run lint && npx vitest run src/pages/PatientAppointmentsPage.test.tsx`
Expected: PASS.
```bash
git add src/pages/PatientAppointmentsPage.* src/routes/App.tsx
git commit -m "feat: add patient appointments page"
```

---

### Task 7: Citas del consultorio y cliente compartido

**Files:**
- Create: `src/services/clinicApi.ts`, `src/pages/ClinicAppointmentsPage.tsx`, `src/pages/ClinicAppointmentsPage.test.tsx`
- Modify: `src/pages/AppointmentManagementPage.tsx`, `src/routes/App.tsx`

**Interfaces:**
- Produces: `clinicRequest<T>(path, init): Promise<T>` con token y `ApiError`.
- Produces: `/consultorio/citas`.

- [ ] **Step 1: Extraer `clinicRequest`**

Mover el `fetch` autenticado de `AppointmentManagementPage` a `src/services/clinicApi.ts`; conservar los mensajes 401/403/404 y `Content-Type` solo con body. Usar `apiBaseUrl`.

- [ ] **Step 2: Página de citas confirmadas**

Guard de rol: sin `CLINIC_ADMIN` redirige a `/consultorio/iniciar-sesion`. Fetch `/appointments?status=CONFIRMED` con filtros de fecha. Lista con paciente, teléfono, servicio, dentista, fecha y folio. Enlace “Gestionar” a `/administrar-solicitudes?appointmentId=...`. Estados de carga/error/vacío.

- [ ] **Step 3: Abrir detalle por URL**

`AppointmentManagementPage` lee `appointmentId` de `useSearchParams` y llama `openDetail` al cargar, para que el enlace del listado funcione. Probar.

- [ ] **Step 4: Verificar y commit**

Run: `npm run lint && npx vitest run src/pages/ClinicAppointmentsPage.test.tsx src/pages/AppointmentManagementPage.test.tsx`
Expected: PASS.
```bash
git add src/services/clinicApi.ts src/pages/ClinicAppointmentsPage.* src/pages/AppointmentManagementPage.tsx src/routes/App.tsx
git commit -m "feat: add clinic appointments page"
```

---

### Task 8: Integración de header, responsive y verificación final

**Files:**
- Modify: `src/routes/App.tsx`, `src/styles.css`, docs si aplica.

- [ ] **Step 1: Header**

Agregar `ThemeToggle`; para `CLINIC_ADMIN` mostrar “Citas” y “Solicitudes”; para paciente mostrar “Mis citas” si hay sesión. Enlace “Acceso consultorio” en el login de paciente y viceversa.

- [ ] **Step 2: Responsive**

Auth en 360/768/1280; toggle legible en móvil; listas de citas apiladas.

- [ ] **Step 3: Verificación completa**

```bash
npm run lint
npx vitest run
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
node scripts/prepare-static-routes.mjs
```

Back: `dotnet test` (o CI). Revisar `dist/manifest.webmanifest`, `dist/sw.js`, iconos y que `sw.js` no cachee `/api/appointments` ni `/api/auth`. Ejecutar el script de contraste.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "test: verify auth pwa theme and appointments"
```
