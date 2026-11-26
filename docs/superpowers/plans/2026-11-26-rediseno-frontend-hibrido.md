# Rediseño frontend híbrido DentalConnect — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the DentalConnect frontend as one coherent system: current brand and clinic cards, B-style clarity in search, records, tables and admin, with every active screen working in light/dark and at 360–1280 px.

**Architecture:** Keep React 19, Vite, TypeScript, Tailwind 4 and the existing API. Add a small shared UI layer (`Button`, `Field`, `Notice`, `StatusStamp`, `PageHeader`, `Section`, `EmptyState`, `Receipt`, `SlotButton`, `Icon`, `NavMenu`), move the shell to `SiteHeader`/`SiteFooter`, and restyle pages with Tailwind utilities. Migrate all pages before deleting the legacy CSS layer. One additive backend change: `priceFrom` in the clinic list service summary.

**Tech Stack:** React 19, Vite 6, TypeScript 5.8, Tailwind 4.3.5, Vitest 4, Testing Library, .NET 10 backend (one additive DTO change).

**Spec:** `docs/superpowers/specs/2026-11-26-rediseno-frontend-hibrido-design.md`

## Global Constraints

- Palette: teal `#003B4A`, aqua `#007C83`, coral `#B6412C`, coral-text `#B6412C` light / `#E89880` dark, pearl `#F5F8FA`, white surfaces. No new brand colors.
- Fonts: self-hosted Outfit (display) and Inter (body/UI). No new fonts.
- Radii: card 12 px, panel 10 px, control 6 px, chip/thumbnail 4 px.
- No shadows on content, no gradients in the directory hero, no decorative pills, no emoji as UI icons.
- Touch targets: 44 px minimum for every interactive element, including `Button` `sm`.
- Spanish (Mexico) copy; calm, direct, no exclamation marks; no unsupported claims.
- Preserve existing routes, authentication, theme behavior, PWA, SEO and API behavior. The only backend change is `priceFrom` in the list service summary.
- No new dependencies.
- `npm run test`, `npm run lint`, `npm run build`, `npm run test:contrast` must be green before each PR is merged. The full test suite must pass three consecutive runs at the final phase.
- Keep the accessible names and visible strings that existing tests assert unless a task explicitly updates the test.

## Review Focus

These are the failure modes most likely to hurt a real user; each has a test in the task that owns the code.

1. **Clinic without a photo** — the card, detail and dentist profile must show a monogram fallback, not a broken image or an empty box. (Task 7, 9, 10.)
2. **Dark mode coral text and indicators** — `#B6412C` fails contrast on dark surfaces; links and underlines must use `coral-text` (`#E89880`) in dark. (Task 1, 2; contrast script.)
3. **Mobile header with many role links** — the menu must open, close with Escape, return focus, and never overflow at 390 px. (Task 4.)
4. **Long, empty and failed API responses** — directory, detail, appointments and admin must show the explicit loading/empty/error state, not a blank screen. (Tasks 8–10, 13–14, 18–20.)
5. **Admin actions** — confirm, propose, reject, schedule and service edits keep their current behavior and destructive guards. (Tasks 18–20; existing tests.)

## File Map

```text
src/components/ui/Button.tsx          update variants/sizes to the new system
src/components/ui/Field.tsx           new label/hint/error wrapper + controlClass
src/components/ui/Icon.tsx            new 17-icon set
src/components/ui/Notice.tsx          update tones and tokens
src/components/ui/StatusStamp.tsx     new replacement for StatusBadge
src/components/ui/PageHeader.tsx      new
src/components/ui/Section.tsx         new
src/components/ui/EmptyState.tsx      new
src/components/ui/Receipt.tsx         new
src/components/ui/SlotButton.tsx      new
src/components/ui/Skeleton.tsx        update if needed
src/components/ui/NavMenu.tsx         new disclosure
src/components/layout/SiteHeader.tsx  new
src/components/layout/SiteFooter.tsx  new
src/components/layout/AdminShell.tsx  new (AdminShell + AdminSectionNav)
src/lib/headerLinks.ts                new pure role → links mapping
src/lib/clinicPrice.ts                new min price + formatter
src/lib/clinicPrice.test.ts           new
src/lib/headerLinks.test.ts           new
src/components/ClinicCard.tsx         update to approved card
src/components/ContentImage.tsx       add fallbackLabel
src/components/auth/AuthLayout.tsx    one-column auth shell
src/components/auth/PasswordField.tsx update to Field/controlClass
src/theme/ThemeToggle.tsx             restyle with Icon + tokens
src/components/FeedbackToast.tsx      restyle
src/components/NetworkStatus.tsx      restyle
src/routes/App.tsx                    use SiteHeader/SiteFooter
src/pages/ClinicListPage.tsx          restyle directory
src/pages/ClinicDetailPage.tsx        restyle detail
src/pages/DentistProfilePage.tsx      restyle profile
src/pages/AppointmentRequestPage.tsx  restyle booking
src/pages/AppointmentProposalPage.tsx restyle proposal
src/pages/PatientAppointmentsPage.tsx restyle patient appointments
src/pages/NotificationsPage.tsx       restyle notifications
src/pages/AuthPages.tsx               restyle auth/account
src/pages/ClinicApplicationPage.tsx   restyle application/review
src/pages/ClinicSettingsPage.tsx      restyle under AdminShell
src/pages/DentistManagementPage.tsx   restyle under AdminShell
src/pages/ClinicAppointmentsPage.tsx  restyle under AdminShell
src/pages/AppointmentManagementPage.tsx restyle under AdminShell
src/styles.css                        tokens/base; delete @layer legacy at the end
eslint.config.mjs                     ignore .agents/
scripts/check-contrast.mjs            add coral-text pairs
```

---

## Phase 1 — Foundations and baseline

### Task 1: Tokens, contrast, lint baseline and test stability

**Files:**
- Modify: `src/styles.css`
- Modify: `eslint.config.mjs`
- Modify: `scripts/check-contrast.mjs`
- Modify: `src/pages/ClinicAppointmentsPage.test.tsx`

**Interfaces:**
- Produces: `--color-coral-text`, `--radius-card: 0.75rem`, `--radius-panel: 0.625rem`, `--radius-control: 0.375rem`, `--radius-chip: 0.25rem`, `--shadow-overlay` available to every component.
- Produces: a green `npm run lint`, `npm run test:contrast`, and three consecutive full test runs.

- [ ] **Step 1: Add the tokens**

In `src/styles.css`, inside `@theme`, set the radii above and add `--color-coral-text: #b6412c;` and `--shadow-overlay: 0 16px 40px -24px rgb(0 59 74 / 0.35);`.

In the existing `.dark` block, add `--color-coral-text: #e89880;`. Keep `--color-coral: #b6412c;` for filled buttons.

- [ ] **Step 2: Add contrast pairs**

In `scripts/check-contrast.mjs`, add:
```js
{ label: 'light coral-text on white', fg: '#B6412C', bg: '#FFFFFF', min: 4.5 },
{ label: 'light coral-text on canvas', fg: '#B6412C', bg: '#F5F8FA', min: 4.5 },
{ label: 'dark coral-text on surface', fg: '#E89880', bg: '#102A30', min: 4.5 },
{ label: 'dark coral-text on surface soft', fg: '#E89880', bg: '#163840', min: 4.5 },
{ label: 'dark coral-text on canvas', fg: '#E89880', bg: '#08181D', min: 4.5 },
```

- [ ] **Step 3: Ignore local tooling in ESLint**

In `eslint.config.mjs`, add `.agents/` to the ignores array. Do not ignore `src/`.

- [ ] **Step 4: Remove the real API fetch from the appointments test**

In `src/pages/ClinicAppointmentsPage.test.tsx`, mock `../services/api` so `AuthProvider` does not fetch the real API:
```ts
vi.mock('../services/api', () => ({
  api: { me: vi.fn().mockRejectedValue(new Error('API no expuesta')) },
}));
```
The test still uses the mocked `cognito` and `clinicApi` modules.

- [ ] **Step 5: Verify baseline**

Run:
```bash
npm run test:contrast
npm run lint
npm test
npm test
npm test
```
Expected: contrast passes 37 pairs, lint exits 0, and all test runs pass. If a run fails in `ClinicAppointmentsPage`, stop and report the exact test and error; do not paper over it.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css eslint.config.mjs scripts/check-contrast.mjs src/pages/ClinicAppointmentsPage.test.tsx
git commit -m "chore: add design tokens and stabilize test baseline"
```

---

### Task 2: Icon, Button, Field, Notice and StatusStamp

**Files:**
- Create: `src/components/ui/Icon.tsx`
- Create: `src/components/ui/Field.tsx`
- Create: `src/components/ui/StatusStamp.tsx`
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Notice.tsx`
- Test: `src/components/ui/Button.test.tsx`, `src/components/ui/Field.test.tsx`, `src/components/ui/Notice.test.tsx`, `src/components/ui/StatusStamp.test.tsx`

**Interfaces:**
- Produces `Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string })`, where `IconName` is `'search' | 'pin' | 'phone' | 'mail' | 'clock' | 'calendar' | 'arrow-right' | 'chevron-left' | 'chevron-right' | 'chevron-down' | 'sun' | 'moon' | 'monitor' | 'menu' | 'close' | 'check' | 'alert' | 'eye' | 'eye-off'`.
- Produces `Button`, `buttonStyles`, `ButtonVariant`, `ButtonSize` with unchanged names and 44 px minimum height.
- Produces `Field({ id, label, hint, error, required, className = '', children })` and `controlClass`; `Field` injects `id`, `aria-describedby` and `aria-invalid` into its single child element.
- Produces `Notice` with `NoticeTone = 'info' | 'success' | 'error' | 'warning'`.
- Produces `StatusStamp({ status, className = '' })`.

- [ ] **Step 1: Write the failing component tests**

`Field.test.tsx`:
```tsx
render(
  <Field id="email" label="Correo" error="Requerido">
    <input />
  </Field>,
);
const input = screen.getByLabelText('Correo');
expect(input).toHaveAttribute('id', 'email');
expect(input).toHaveAttribute('aria-invalid', 'true');
expect(input).toHaveAttribute('aria-describedby', 'email-error');
expect(screen.getByText('Requerido')).toHaveAttribute('id', 'email-error');
```

`StatusStamp.test.tsx`:
```tsx
render(<StatusStamp status="CONFIRMED" />);
expect(screen.getByText('Confirmada')).toBeInTheDocument();
```

`Notice.test.tsx` add:
```tsx
render(<Notice tone="warning" title="Vence">La propuesta vence hoy.</Notice>);
expect(screen.getByRole('status')).toHaveTextContent('Vence');
```

`Button.test.tsx` add:
```tsx
expect(screen.getByRole('button', { name: 'Guardar' }).className).toContain('min-h-11');
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/components/ui/Field.test.tsx src/components/ui/StatusStamp.test.tsx src/components/ui/Notice.test.tsx src/components/ui/Button.test.tsx`
Expected: FAIL for the missing `Field`, `StatusStamp`, warning tone and `min-h-11`.

- [ ] **Step 3: Implement**

- `Icon`: one `svg` wrapper with `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={1.6}`, `aria-hidden="true"`, `focusable="false"`, and a `switch` or record for the paths. `size` sets width/height.
- `Button`: base `inline-flex min-h-11 items-center justify-center gap-2 rounded-control font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent disabled:cursor-not-allowed disabled:border-transparent disabled:bg-line-strong disabled:text-subtle`. `sm`: `min-h-11 px-3 text-sm`; `md`: `min-h-11 px-5 text-base`. Variants: `primary` `bg-brand text-white hover:bg-brand-strong`; `coral` `bg-coral text-white hover:bg-coral-strong`; `outline` `border border-control bg-surface text-heading hover:border-brand hover:bg-canvas`; `ghost`; `danger`. Keep the loading spinner and `aria-busy`.
- `Field`: render `<label htmlFor={id}>`, clone the single child with `id`, `aria-describedby` built from `${id}-hint` and `${id}-error`, and `aria-invalid={Boolean(error)}`; render hint and error paragraphs with those ids. Export `controlClass = 'min-h-11 w-full rounded-control border border-control bg-surface px-3 text-base text-ink outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/20'`.
- `Notice`: use semantic tokens and no emoji. Error uses `role="alert"`; info/success/warning use `role="status"` unless a `role` prop overrides. Title is a `<p className="mb-1 font-semibold">`.
- `StatusStamp`: `<span className="inline-flex items-center gap-2 rounded-[4px] border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ...">` with a 6 px dot; map pending/confirmed/proposed/rejected/cancelled to amber/emerald/sky/red/slate; use `statusLabels` and `statusTone`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/ui`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui
git commit -m "feat: add shared UI primitives"
```

---

### Task 3: PageHeader, Section, EmptyState, Receipt and SlotButton

**Files:**
- Create: `src/components/ui/PageHeader.tsx`
- Create: `src/components/ui/Section.tsx`
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/Receipt.tsx`
- Create: `src/components/ui/SlotButton.tsx`
- Test: `src/components/ui/PageHeader.test.tsx`, `Section.test.tsx`, `EmptyState.test.tsx`, `Receipt.test.tsx`, `SlotButton.test.tsx`

**Interfaces:**
- `PageHeader({ kicker, title, description, actions, className })`
- `Section({ title, description, actions, children, className })`
- `EmptyState({ title, children, action })`
- `Receipt({ title, rows, footer, className })` where `rows: Array<{ label: string; value: ReactNode }>`
- `SlotButton({ selected = false, className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean })`

- [ ] **Step 1: Write the failing tests**

```tsx
// PageHeader
render(<PageHeader kicker="Consultorio" title="Citas agendadas" actions={<button>Acción</button>} />);
expect(screen.getByRole('heading', { name: 'Citas agendadas' })).toBeInTheDocument();
expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();

// Receipt
render(<Receipt title="Resumen" rows={[{ label: 'Servicio', value: 'Limpieza' }]} />);
expect(screen.getByText('Servicio')).toBeInTheDocument();
expect(screen.getByText('Limpieza')).toBeInTheDocument();

// SlotButton
render(<SlotButton selected>09:00</SlotButton>);
expect(screen.getByRole('button', { name: '09:00' })).toHaveAttribute('aria-pressed', 'true');
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/components/ui/PageHeader.test.tsx src/components/ui/Receipt.test.tsx src/components/ui/SlotButton.test.tsx`
Expected: FAIL for missing modules.

- [ ] **Step 3: Implement**

- `PageHeader`: `<header>` with optional kicker micro-label, `<h1>` in `font-display text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-[-0.03em] text-heading`, description in `text-muted`, actions in a flex row; stack on mobile.
- `Section`: `<section>` with a top border `border-t border-line pt-6`, optional heading row (title in `font-display text-xl font-semibold text-heading`, description, actions) and children.
- `EmptyState`: centered block with optional icon slot, `<h2>`/`<h3>` title, body and action; no shadow.
- `Receipt`: white panel `rounded-panel border border-line bg-surface`, rows as a `<dl>` with label left/muted and value right/ink; footer separated by a top rule.
- `SlotButton`: 44 px, `rounded-control border`, selected `bg-brand text-white border-brand`, unselected `bg-surface text-ink hover:border-accent`; `aria-pressed={selected}`; forward `disabled`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/ui`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui
git commit -m "feat: add layout and receipt primitives"
```

---

### Task 4: Role-based navigation and the app shell

**Files:**
- Create: `src/lib/headerLinks.ts`
- Create: `src/lib/headerLinks.test.ts`
- Create: `src/components/ui/NavMenu.tsx`
- Create: `src/components/ui/NavMenu.test.tsx`
- Create: `src/components/layout/SiteHeader.tsx`
- Create: `src/components/layout/SiteFooter.tsx`
- Modify: `src/routes/App.tsx`

**Interfaces:**
- `headerLinks(user: Pick<CognitoProfile, 'role'> | null): HeaderGroups`
- `HeaderGroups = { primary: HeaderLink[]; clinic: HeaderLink[]; platform: HeaderLink[]; account: HeaderLink[] }`
- `HeaderLink = { to: string; label: string; end?: boolean }`
- `NavMenu({ label, groups, className = '', panelClassName = '' })` where `NavGroup = { label?: string; items: NavItem[] }` and `NavItem = HeaderLink`.
- `SiteHeader()` uses `useAuth()`, `headerLinks`, `NavMenu`, `ThemeToggle`.
- `SiteFooter()`.

- [ ] **Step 1: Write the failing header-links test**

```ts
expect(headerLinks(null).primary.map((l) => l.label)).toEqual([
  'Consultorios',
  'Registrar consultorio',
  'Crear cuenta',
]);
expect(headerLinks(null).account.map((l) => l.label)).toEqual(['Iniciar sesión']);

expect(headerLinks({ role: 'PACIENTE' }).primary.map((l) => l.label)).toEqual([
  'Consultorios',
  'Mis citas',
  'Avisos',
]);
expect(headerLinks({ role: 'PACIENTE' }).clinic).toEqual([]);

expect(headerLinks({ role: 'CLINIC_ADMIN' }).clinic.map((l) => l.label)).toEqual([
  'Citas',
  'Solicitudes',
  'Perfil y servicios',
  'Dentistas y horarios',
]);
expect(headerLinks({ role: 'CLINIC_ADMIN' }).primary.map((l) => l.label)).not.toContain('Mis citas');
expect(headerLinks({ role: 'CLINIC_ADMIN' }).primary.map((l) => l.label)).toContain('Avisos');

expect(headerLinks({ role: 'PLATFORM_ADMIN' }).primary.map((l) => l.label)).toEqual(['Consultorios']);
expect(headerLinks({ role: 'PLATFORM_ADMIN' }).platform.map((l) => l.label)).toEqual(['Revisar altas']);
expect(headerLinks({ role: 'CLINIC_ADMIN,PLATFORM_ADMIN' }).platform.map((l) => l.label)).toEqual([
  'Revisar altas',
]);
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/headerLinks.test.ts`
Expected: FAIL for the missing module.

- [ ] **Step 3: Implement `headerLinks`**

Use `isClinicAdmin` and `hasRole(role, 'PLATFORM_ADMIN')` from `src/lib/roles.ts` (there is no `isPlatformAdmin` helper). Exact groups:

| User | primary | clinic | platform | account |
|---|---|---|---|---|
| null | Consultorios (/clinics, end), Registrar consultorio (/registrar-consultorio), Crear cuenta (/registro) | [] | [] | Iniciar sesión (/iniciar-sesion) |
| patient | Consultorios, Mis citas (/mis-citas), Avisos (/notificaciones) | [] | [] | Mi cuenta (/mi-cuenta) |
| clinic | Consultorios, Avisos | Citas (/consultorio/citas), Solicitudes (/administrar-solicitudes), Perfil y servicios (/consultorio/configuracion), Dentistas y horarios (/administrar-dentistas) | [] | Mi cuenta |
| platform | Consultorios | [] | Revisar altas (/plataforma/consultorios) | Mi cuenta |
| clinic + platform | Consultorios, Avisos | the four clinic links | Revisar altas | Mi cuenta |

`Revisar altas` lives only in `platform`; never duplicate it in `primary`. `SiteHeader` renders the `platform` group as its own links after the clinic menu.

- [ ] **Step 4: Write the failing NavMenu test**

```tsx
render(
  <MemoryRouter>
    <NavMenu label="Menú" groups={[{ label: 'Explorar', items: [{ to: '/clinics', label: 'Consultorios' }] }]} />
  </MemoryRouter>,
);
const trigger = screen.getByRole('button', { name: 'Menú' });
fireEvent.click(trigger);
expect(screen.getByRole('link', { name: 'Consultorios' })).toBeInTheDocument();
fireEvent.keyDown(document, { key: 'Escape' });
expect(screen.queryByRole('link', { name: 'Consultorios' })).not.toBeInTheDocument();
expect(trigger).toHaveFocus();
```

- [ ] **Step 5: Implement `NavMenu` and the shell**

- `NavMenu`: `useId` for the panel id; trigger button with `aria-expanded` and `aria-controls`; panel with grouped links (`NavLink` from react-router-dom, `onClick` closes). Close on Escape and outside pointerdown; on Escape return focus to the trigger. Panel `rounded-panel border border-line bg-surface shadow-[var(--shadow-overlay)]`; on mobile the caller passes a full-width panel class.
- `SiteHeader`: 68 px desktop / 58 px mobile, sticky, white, bottom border. Brand `Dental<span>Connect</span>` in Outfit 800, 23 px, teal/aqua. Desktop nav: primary links, `NavMenu` for `clinic` if non-empty, platform links, account links, `ThemeToggle`. The last account link is outlined (`Iniciar sesión` or `Mi cuenta`). Mobile: brand + `NavMenu` "Menú" with groups Explorar/Mi cuenta/Consultorio/Plataforma built from the same data + `ThemeToggle`.
- `SiteFooter`: white, top border, brand, tagline, links (Consultorios, Registrar consultorio, Iniciar sesión or Mi cuenta). Stack on mobile.
- `App.tsx`: replace the inline header/footer with `<SiteHeader />` and `<SiteFooter />`; remove now-unused imports. Keep skip link, `NetworkStatus`, `FeedbackToast`, `Suspense`, routes and redirects exactly as they are.

- [ ] **Step 6: Run the tests and build**

Run: `npx vitest run src/lib/headerLinks.test.ts src/components/ui/NavMenu.test.tsx && npm test`
Expected: PASS. If any page test fails because the header now has different links, update the test to the new accessible names; do not remove assertions.

- [ ] **Step 7: Commit**

```bash
git add src/lib/headerLinks.ts src/lib/headerLinks.test.ts src/components/ui/NavMenu.tsx src/components/ui/NavMenu.test.tsx src/components/layout src/routes/App.tsx
git commit -m "feat: add role-based site shell"
```

---

### Task 5: ThemeToggle, FeedbackToast and NetworkStatus

**Files:**
- Modify: `src/theme/ThemeToggle.tsx`
- Modify: `src/components/FeedbackToast.tsx`
- Modify: `src/components/NetworkStatus.tsx`

**Interfaces:**
- ThemeToggle behavior unchanged: `aria-expanded`, options, Escape, focus return, persistence.
- FeedbackToast/NetworkStatus behavior unchanged.

- [ ] **Step 1: Replace inline SVGs with `Icon`**

In `ThemeToggle`, use `Icon name="sun" | "moon" | "monitor"` and `chevron-down`. Keep the trigger label and `aria-expanded`; style with `min-h-11 rounded-full border border-line bg-surface-alt px-3 text-heading` and the panel with `rounded-panel border border-line bg-surface shadow-[var(--shadow-overlay)]`.

- [ ] **Step 2: Restyle FeedbackToast and NetworkStatus**

Use `rounded-panel border border-line bg-surface shadow-[var(--shadow-overlay)]` for the toast; keep the existing live-region roles and close behavior. NetworkStatus uses the warning tokens, 44 px dismiss target and inline Icon `alert`.

- [ ] **Step 3: Run the existing tests**

Run: `npx vitest run src/theme/ThemeToggle.test.tsx src/components/NetworkStatus.test.tsx`
Expected: PASS. Update only class assertions if any exist; behavior must stay.

- [ ] **Step 4: Commit**

```bash
git add src/theme/ThemeToggle.tsx src/components/FeedbackToast.tsx src/components/NetworkStatus.tsx
git commit -m "feat: restyle theme and shell feedback"
```

---

## Phase 2 — Directory

### Task 6: Backend price in the clinic list

**Files (in `/mnt/c/Users/eliox/Desktop/DentalConnect/DentalConnect-back`):**
- Modify: `DentalConnect.Application/Contracts/ApplicationCore.cs`
- Modify: `DentalConnect.Infrastructure/Services/InfrastructureServices.cs`
- Modify: `DentalConnect.Tests/ApiTests.cs`

**Interfaces:**
- Produces `ClinicServiceSummaryDto(string Id, string Name, decimal PriceFrom)`.
- The clinic list JSON service items now include `priceFrom`; no other contract changes.

- [ ] **Step 1: Update the DTO and projection**

Change the record to `public record ClinicServiceSummaryDto(string Id, string Name, decimal PriceFrom);`. In `ListActiveAsync`, project `new ClinicServiceSummaryDto(cs.DentalService.Id, cs.DentalService.Name, cs.PriceFrom)`. Update the fake summary in `ApiTests.cs` to pass `s.PriceFrom`.

- [ ] **Step 2: Run the backend tests**

Run (in the back repo):
```bash
dotnet test DentalConnect.Tests/DentalConnect.Tests.csproj
```
Expected: PASS. If `dotnet` is unavailable in the current shell, run this task on the Windows side or as its own PR; do not merge the frontend task assuming it passed.

- [ ] **Step 3: Commit in the back repo**

```bash
git add DentalConnect.Application/Contracts/ApplicationCore.cs DentalConnect.Infrastructure/Services/InfrastructureServices.cs DentalConnect.Tests/ApiTests.cs
git commit -m "feat: include price in clinic list service summary"
```

---

### Task 7: Price helper, approved card and image fallback

**Files:**
- Create: `src/lib/clinicPrice.ts`
- Test: `src/lib/clinicPrice.test.ts`
- Modify: `src/components/ClinicCard.tsx`
- Test: `src/components/ClinicCard.test.tsx`
- Modify: `src/components/ContentImage.tsx`
- Test: `src/components/ContentImage.test.tsx`

**Interfaces:**
- `clinicFromPrice(services: ReadonlyArray<{ priceFrom?: number | null }>): number | undefined`
- `formatPriceFrom(amount: number): string` → `$650`, `$1,200` with `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })`.
- `ContentImage` gains `fallbackLabel?: string`.

- [ ] **Step 1: Write the failing price tests**

```ts
expect(clinicFromPrice([])).toBeUndefined();
expect(clinicFromPrice([{ priceFrom: 500 }, { priceFrom: 300 }])).toBe(300);
expect(clinicFromPrice([{ priceFrom: Number.NaN }, { priceFrom: -1 }])).toBeUndefined();
expect(clinicFromPrice([{ priceFrom: 0 }])).toBe(0);
expect(formatPriceFrom(650)).toBe('$650');
expect(formatPriceFrom(1200)).toBe('$1,200');
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/lib/clinicPrice.test.ts`
Expected: FAIL for the missing module.

- [ ] **Step 3: Implement the helper and card**

- `clinicPrice.ts`: ignore non-finite/negative values; return the minimum; `formatPriceFrom`.
- `ClinicCard`: keep the existing props (`clinic`, `from`, `priority`) and accessible link name `Ver consultorio ${clinic.name}`. Render the approved card: `article` with `h-full flex-col overflow-hidden rounded-card border border-line bg-surface` and no shadow/lift; 16:9 image; location micro-label; Outfit 19 px name; address; description clamped 2; service chips (max 3 + `y N más`); price `Desde $X` when `clinicFromPrice` is defined; full-width outline CTA text "Ver detalles" with `buttonStyles('outline','sm')` or equivalent. Pass `fallbackLabel` to `ContentImage` using the clinic initials (first letters of the first two name words).
- `ContentImage`: when `src` is missing or fails, render the fallback with `fallbackLabel ?? 'DC'`; keep `role="img"`, the alt-based aria-label, and the text "Imagen no disponible".

- [ ] **Step 4: Update the card/image tests**

`ClinicCard.test.tsx` add:
```tsx
expect(screen.getByText('$500')).toBeInTheDocument();
expect(screen.getByText(/Desde/)).toBeInTheDocument();
```
Add a second render with `imageUrl: null` and `services: []`; expect the clinic initials (e.g. "CS") and no "Desde".
`ContentImage.test.tsx` add a render with `src=null fallbackLabel="CS"`; expect `CS`.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/lib/clinicPrice.test.ts src/components/ClinicCard.test.tsx src/components/ContentImage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/clinicPrice.ts src/lib/clinicPrice.test.ts src/components/ClinicCard.tsx src/components/ClinicCard.test.tsx src/components/ContentImage.tsx src/components/ContentImage.test.tsx
git commit -m "feat: add clinic price and card fallback"
```

---

### Task 8: Directory page

**Files:**
- Modify: `src/pages/ClinicListPage.tsx`
- Test: `src/pages/ClinicListPage.test.tsx`

**Interfaces:**
- Consumes `ClinicCard`, `Button`, `Field`, `Notice`, `Skeleton`.
- Keeps URL filters `q`, `servicio`, pagination `getPageItems`, `PAGE_SIZE = 6`, geolocation and all error messages.

- [ ] **Step 1: Add the failing structural assertion**

In `ClinicListPage.test.tsx`, assert the approved card price is rendered for a clinic with `priceFrom`:
```tsx
expect((await screen.findAllByText('$500')).length).toBeGreaterThan(0);
```
Run: `npx vitest run src/pages/ClinicListPage.test.tsx`
Expected: FAIL because the current card has no price.

- [ ] **Step 2: Rewrite the page markup**

Keep all state, effects and handlers. Replace the gradient/pill hero with a left-aligned kicker + h1 + lede (`PageHeader` or equivalent) on the pearl canvas. Replace the rounded search card with the approved compact search card: white, 1 px border, 10 px radius, 14 px padding, no shadow; fields with micro labels, 44 px controls, teal button. Keep the labels `Nombre, zona o código postal` and `Servicio dental`, the button `Buscar`, `Usar mi ubicación`, the location hint, clear filters and pagination accessible names. Results: heading `Resultados`, count on the right, 3/2/1 card grid with 20 px gap, pagination with 44 px text buttons and a coral-text active underline. Loading: 6 card skeletons; error and empty with `Notice`; retry button.

- [ ] **Step 3: Run the directory tests**

Run: `npx vitest run src/pages/ClinicListPage.test.tsx src/components/ClinicCard.test.tsx`
Expected: PASS. Keep the existing class assertion `min-w-11` on page buttons or update it only if the button still has an equivalent 44 px class.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ClinicListPage.tsx src/pages/ClinicListPage.test.tsx
git commit -m "feat: redesign the clinic directory"
```

---

## Phase 3 — Detail and dentist profile

### Task 9: Clinic detail page

**Files:**
- Modify: `src/pages/ClinicDetailPage.tsx`
- Test: `src/pages/ClinicDetailPage.test.tsx`

**Interfaces:**
- Consumes `PageHeader`, `Section`, `Notice`, `Button`, `ContentImage`, `formatPriceFrom`/existing money formatter.
- Keeps the request links `Solicitar ${service.name} en ${clinic.name}` and `Ver perfil de ${dentist.firstName} ${dentist.lastName}`.

- [ ] **Step 1: Add the failing structural assertion**

The current page renders team members in a card list. Add a test that the services are a named list or table:
```tsx
expect(screen.getByRole('list', { name: 'Servicios disponibles' })).toBeInTheDocument();
```
Run: `npx vitest run src/pages/ClinicDetailPage.test.tsx`
Expected: FAIL because the current `ul` has no accessible name.

- [ ] **Step 2: Rewrite the page**

- Back link; `PageHeader` with location micro-label, h1, description.
- Two-column layout `lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]`; aside sticky at `top-24`.
- Image band `aspect-[21/9]` with `ContentImage`, `fallbackLabel` from the clinic name, radius 12.
- Contact facts as a definition list with `Icon` phone/mail/pin and 1 px rules.
- Services as a `<ul aria-label="Servicios disponibles">` of rows with name, description, duration, `Desde $X`, and the existing request link.
- Team as rows with a 64 px portrait, name, specialty and `Ver perfil` link; no card shadows.
- Aside: `Receipt`-style panel with the three steps, coral CTA and the note "Enviar la solicitud no confirma ni cobra la cita."; phone/email links.
- Loading skeletons, error `Notice` with retry and back, missing image fallback.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/pages/ClinicDetailPage.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ClinicDetailPage.tsx src/pages/ClinicDetailPage.test.tsx
git commit -m "feat: redesign the clinic detail page"
```

---

### Task 10: Dentist profile page

**Files:**
- Modify: `src/pages/DentistProfilePage.tsx`
- Test: `src/pages/DentistProfilePage.test.tsx`

**Interfaces:**
- Keeps the back link `Volver a ${clinic.name}` and the service action `Elegir ${service.name}`.
- Consumes `PageHeader`, `Section`, `ContentImage`, `Button`, `Notice`.

- [ ] **Step 1: Add a structural assertion**

Add:
```tsx
expect(screen.getByRole('heading', { name: 'Servicios activos' })).toBeInTheDocument();
```
The current page has this heading, so this test passes before the rewrite; use it as a regression guard while you restructure. The page behavior is already covered by the existing link test.

- [ ] **Step 2: Rewrite the page**

One-column article with a left portrait column on desktop (4:5, `ContentImage` with initials fallback), specialty micro-label, h1, license, biography, `Section` for services as rows (name, duration, description, `Elegir` button), clinic/contact aside and the request note. No shadows or card soup. Preserve loading, error and not-found states.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/pages/DentistProfilePage.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DentistProfilePage.tsx src/pages/DentistProfilePage.test.tsx
git commit -m "feat: redesign the dentist profile"
```

---

## Phase 4 — Appointment and patient screens

### Task 11: Appointment request page

**Files:**
- Modify: `src/pages/AppointmentRequestPage.tsx`
- Test: `src/pages/AppointmentRequestPage.test.tsx`

**Interfaces:**
- Consumes `Field`, `Button`, `SlotButton`, `Receipt`, `Section`, `Notice`, `StatusStamp`.
- Keeps `Enviar solicitud`, `Ver el estado de mi solicitud`, `Inicia sesión para agendar`, `Fecha de atención`, slot labels and all flow/error behavior.

- [ ] **Step 1: Add a failing structural assertion**

Add:
```tsx
expect(await screen.findByRole('region', { name: 'Resumen de la solicitud' })).toBeInTheDocument();
```
Run: `npx vitest run src/pages/AppointmentRequestPage.test.tsx`
Expected: FAIL because the current summary has no accessible region name.

- [ ] **Step 2: Rewrite the page**

Two columns on desktop (`1fr / 360px`). Form sections numbered 01–04 with top rules: service, dentist, date/time, patient data. Use `Field` and `controlClass` for inputs; `SlotButton` for slots; `Button` for actions. Summary is a `Receipt` inside a `<section aria-label="Resumen de la solicitud">` with the existing labels/values and a note. Keep the submit success panel with the existing links and folio. On mobile the summary follows the form and the CTA is full width.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/pages/AppointmentRequestPage.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AppointmentRequestPage.tsx src/pages/AppointmentRequestPage.test.tsx
git commit -m "feat: redesign the appointment request"
```

---

### Task 12: Proposal page

**Files:**
- Modify: `src/pages/AppointmentProposalPage.tsx`
- Test: `src/pages/AppointmentProposalPage.test.tsx`

**Interfaces:**
- Consumes `StatusStamp`, `Receipt`, `Notice`, `Button`, `Section`.
- Keeps `Horario original:`, `Horario propuesto:`, `Vence:`, `Responder propuesta`, `Aceptar horario propuesto`, `Rechazar propuesta`, `Sí, rechazar propuesta`, and all status texts.

- [ ] **Step 1: Run the existing proposal tests as the regression baseline**

Run: `npx vitest run src/pages/AppointmentProposalPage.test.tsx`
Expected: PASS. This page is a visual restyle; its 361-line test file already covers the comparison labels, expiration, accept/reject dialog and status changes. Keep those assertions intact while rewriting the markup.

- [ ] **Step 2: Rewrite the page**

Status stamp + heading; explanation; a comparison `Receipt`/two-column table for original vs proposed times; warning `Notice` for expiration; actions in a named `Section`/region; keep the reject confirmation dialog and all handlers. Use coral for the accept action and outline danger for reject. No card shadows.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/pages/AppointmentProposalPage.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AppointmentProposalPage.tsx src/pages/AppointmentProposalPage.test.tsx
git commit -m "feat: redesign the appointment proposal"
```

---

### Task 13: Patient appointments

**Files:**
- Modify: `src/pages/PatientAppointmentsPage.tsx`
- Test: `src/pages/PatientAppointmentsPage.test.tsx`

**Interfaces:**
- Consumes `PageHeader`, `StatusStamp`, `EmptyState`, `Skeleton`, `Notice`.
- Keeps `Próximas (N)`, `Historial (N)`, `Responder propuesta`, `Iniciar sesión para ver mis citas`, and all error texts.

- [ ] **Step 1: Add a failing structural assertion**

Add a list/region name:
```tsx
expect(await screen.findByRole('list', { name: 'Citas del paciente' })).toBeInTheDocument();
```
Run: `npx vitest run src/pages/PatientAppointmentsPage.test.tsx`
Expected: FAIL because the current list has no accessible name.

- [ ] **Step 2: Rewrite the page**

`PageHeader`; the Próximas/Historial toggle as text tabs with 44 px targets; rows (not cards) with `StatusStamp`, clinic, service, dentist, date/time, folio and actions. Keep the service name as an `h2` inside each row so the existing heading assertions and the screen-reader outline still work. `EmptyState` with a directory CTA; loading rows; error `Notice` with retry.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/pages/PatientAppointmentsPage.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PatientAppointmentsPage.tsx src/pages/PatientAppointmentsPage.test.tsx
git commit -m "feat: redesign patient appointments"
```

---

### Task 14: Notifications

**Files:**
- Modify: `src/pages/NotificationsPage.tsx`
- Test: `src/pages/NotificationsPage.test.tsx`

**Interfaces:**
- Consumes `PageHeader`, `Section`, `Notice`, `EmptyState`, `Button`.
- Keeps `1 aviso sin leer`, `Marcar como leído`, `Estás al día.`, `Ver solicitud`, `Revisar solicitud`, `Iniciar sesión`, and push behavior.

- [ ] **Step 1: Add a failing structural assertion**

Add:
```tsx
expect(await screen.findByRole('list', { name: 'Avisos' })).toBeInTheDocument();
```
Run: `npx vitest run src/pages/NotificationsPage.test.tsx`
Expected: FAIL because the current list has no accessible name.

- [ ] **Step 2: Rewrite the page**

`PageHeader`; push settings as a `Section` with the existing button/status; notification list as rows with unread dot, an `h2` title, body, timestamp, link and "Marcar como leído"; no cards; empty/error states. Keep clinic-mode links.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/pages/NotificationsPage.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/NotificationsPage.tsx src/pages/NotificationsPage.test.tsx
git commit -m "feat: redesign notifications"
```

---

## Phase 5 — Auth, account and clinic onboarding

### Task 15: Auth shell and auth pages

**Files:**
- Modify: `src/components/auth/AuthLayout.tsx`
- Modify: `src/components/auth/PasswordField.tsx`
- Modify: `src/pages/AuthPages.tsx`
- Modify: `src/pages/ClinicApplicationPage.tsx` (only the `AuthLayout` call; Task 16 rewrites the page)
- Delete: `src/pages/ClinicLoginPage.tsx`, `src/pages/ClinicLoginPage.test.tsx`
- Test: `src/pages/AuthPages.test.tsx`

**Interfaces:**
- `AuthLayout({ title, description, children, wide = false, footer })`; remove `visualTitle`, `visualText`, `hideVisual`.
- `PasswordField` keeps its props (`id`, `label`, `value`, `onChange`, `autoComplete`, `hint`, error behavior) and uses `Field`/`controlClass`.
- Auth pages keep all accessible names and behavior tests.

- [ ] **Step 1: Add a failing structural assertion**

Add to `AuthPages.test.tsx`:
```tsx
expect(screen.getByRole('main')).toHaveClass('bg-canvas');
```
Use a stable token class or a named region; the old split layout does not have it. Run: `npx vitest run src/pages/AuthPages.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Rewrite the auth shell and forms**

`AuthLayout`: single centered column, max 440 px (wide 720 px), on `bg-canvas`; brand above the sheet; white sheet `rounded-card border border-line` with no shadow; title Outfit, description muted, children, footer links. On mobile the sheet loses its side border and fills the width with padding.
Update every `AuthLayout` call (login, register, verify, account, recovery, clinic application) to the new props. Use `Field`/`controlClass` for all inputs; `Button` for actions; `Notice` for errors. Preserve the password toggle, requirements, remembered-session checkbox, OTP input and all existing links/labels.
`PasswordField`: use `controlClass` and keep its own label/hint/error markup (the show/hide button sits over the input, so `Field`'s single-child clone is not a fit); keep the show/hide button at 44 px with `Icon name="eye" | "eye-off"`; do not add a new dependency.

Delete `ClinicLoginPage.tsx` and its test now: it uses the old `AuthLayout` props and has no active route (`/consultorio/iniciar-sesion` redirects to `/iniciar-sesion`). Leaving it would break the build.

- [ ] **Step 3: Run the auth tests**

Run: `npx vitest run src/pages/AuthPages.test.tsx`
Expected: PASS. Update only structural assertions that were intentionally changed.

- [ ] **Step 4: Commit**

```bash
git add src/components/auth src/pages/AuthPages.tsx src/pages/AuthPages.test.tsx src/pages/ClinicApplicationPage.tsx
git rm src/pages/ClinicLoginPage.tsx src/pages/ClinicLoginPage.test.tsx
git commit -m "feat: redesign authentication"
```

---

### Task 16: Clinic application and platform review

**Files:**
- Modify: `src/pages/ClinicApplicationPage.tsx`
- Test: create `src/pages/ClinicApplicationPage.test.tsx`

**Interfaces:**
- Consumes `AuthLayout` (logged-out intro), `PageHeader`, `Section`, `Field`, `Button`, `Notice`, `StatusStamp`.
- Keeps the review actions, status texts and API calls.

- [ ] **Step 1: Add a failing smoke test**

Create a test that renders the logged-out page with `currentUser` mocked to resolve null and asserts the intro heading `Solicita el registro de tu consultorio` and the `Iniciar sesión` link. Add a second test with a `PLATFORM_ADMIN` user and a mocked queue item; assert the queue heading `Solicitudes por revisar` and the approve/reject buttons. Use the existing `AuthProvider` test pattern.
Run: `npx vitest run src/pages/ClinicApplicationPage.test.tsx`
Expected: FAIL until the page is restructured for the new test hooks.

- [ ] **Step 2: Rewrite the page**

- Logged-out: one-column `AuthLayout` with the three steps, login/create-account actions and the existing note.
- Logged-in applicant: `PageHeader` "Registro de consultorio"; form in a 2-column sheet with `Field`/`controlClass`; status panel with `StatusStamp`, review note, publish/admin actions.
- Platform admin: `PageHeader` "Solicitudes por revisar"; queue table with clinic, owner email, phone, address, status, reason input and approve/reject buttons; `Notice` for success/error. No cards with shadows.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/pages/ClinicApplicationPage.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ClinicApplicationPage.tsx src/pages/ClinicApplicationPage.test.tsx
git commit -m "feat: redesign clinic registration and review"
```

---

### Task 17: Admin shell and clinic settings

**Files:**
- Create: `src/components/layout/AdminShell.tsx`
- Test: `src/components/layout/AdminShell.test.tsx`, `src/pages/ClinicSettingsPage.test.tsx`
- Modify: `src/pages/ClinicSettingsPage.tsx`

**Interfaces:**
- `AdminSection = 'appointments' | 'requests' | 'profile' | 'team'`
- `AdminSectionNav({ active }: { active: AdminSection })`
- `AdminShell({ title, description, actions, clinicName, active, children })`; presentational only, no guard/fetch.
- `ClinicSettingsPage` keeps all form/service logic and API calls.

- [ ] **Step 1: Write the failing AdminShell test**

```tsx
render(
  <MemoryRouter>
    <AdminShell title="Perfil y servicios" active="profile">
      <p>Contenido</p>
    </AdminShell>
  </MemoryRouter>,
);
expect(screen.getByRole('heading', { name: 'Perfil y servicios' })).toBeInTheDocument();
const activeLink = screen.getByRole('link', { name: 'Perfil y servicios' });
expect(activeLink).toHaveAttribute('aria-current', 'page');
expect(screen.getByText('Consultorio')).toBeInTheDocument();
```

- [ ] **Step 2: Implement AdminShell**

`AdminSectionNav` renders four links with 44 px height, `aria-current="page"` for the active section and a coral-text/aqua active underline. `AdminShell` renders `PageHeader` with kicker `clinicName ?? 'Consultorio'`, the nav and children; no auth guard, no fetch. Keep the nav scrollable on mobile.

- [ ] **Step 3: Rewrite ClinicSettingsPage**

Wrap in `AdminShell` with `active="profile"` and the clinic name when available. Sections: public information, location, image, services. Use `Field`/`controlClass`, `Button`, `Notice`, `Section`. Services as a table/list with offered checkbox, price input and save per row; add-service row. Keep all API calls and error handling. Remove `shadow-sm` and rounded-card soup.

- [ ] **Step 4: Run the tests**

Add `ClinicSettingsPage.test.tsx` as a smoke test: mock `currentUser` as `CLINIC_ADMIN` and the clinic API response, render the page inside `AuthProvider`/`MemoryRouter`, and assert the `Perfil y servicios` heading, the `Información pública` section and the `Servicios del consultorio` section. Run: `npx vitest run src/components/layout/AdminShell.test.tsx src/pages/ClinicSettingsPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AdminShell.tsx src/components/layout/AdminShell.test.tsx src/pages/ClinicSettingsPage.tsx src/pages/ClinicSettingsPage.test.tsx
git commit -m "feat: add admin shell and redesign clinic settings"
```

---

### Task 18: Dentists and schedules

**Files:**
- Modify: `src/pages/DentistManagementPage.tsx`
- Test: create `src/pages/DentistManagementPage.test.tsx` (smoke)

**Interfaces:**
- Consumes `AdminShell`, `Section`, `Field`, `Button`, `StatusStamp`, `Notice`, `Icon`.
- Keeps the Equipo/Horarios sections, all forms, weekly schedule/block actions and API calls.

- [ ] **Step 1: Add a failing smoke test**

Mock auth as `CLINIC_ADMIN` and the clinic/dentist API calls; render the page and assert the `Dentistas y horarios` heading, the `Equipo dental` and `Horarios` section controls, and the `Nuevo dentista` form heading. Run: `npx vitest run src/pages/DentistManagementPage.test.tsx`
Expected: FAIL until the new headings/structure exist.

- [ ] **Step 2: Rewrite the page**

Wrap in `AdminShell active="team"` with clinic name. Replace the numbered 2×2 nav with an accessible segmented control (buttons with `aria-pressed`) or text tabs for Equipo/Horarios. Dentist list as rows with name, specialty, license, `StatusStamp`, actions; form in a `Section`/panel with `Field` and `Button`. Schedule: two columns on desktop (weekly hours, blocks), stacked on mobile; `Field` for day/time/date; lists with delete buttons and `Icon` (no emoji). Keep all handlers and disabled states.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/pages/DentistManagementPage.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DentistManagementPage.tsx src/pages/DentistManagementPage.test.tsx
git commit -m "feat: redesign dentist and schedule management"
```

---

### Task 19: Scheduled appointments

**Files:**
- Modify: `src/pages/ClinicAppointmentsPage.tsx`
- Test: `src/pages/ClinicAppointmentsPage.test.tsx`

**Interfaces:**
- Consumes `AdminShell`, `PageHeader`, `Section`, `StatusStamp`, `Notice`, `EmptyState`, `Icon`.
- Keeps the confirmed-only query, filters, patient contact, management link `/administrar-solicitudes?appointmentId=...`, and all error/retry behavior. The patient-name test moves from `heading` to a table cell.

- [ ] **Step 1: Add a failing structural assertion**

Add:
```tsx
expect(await screen.findByRole('table', { name: 'Citas agendadas' })).toBeInTheDocument();
```
Run: `npx vitest run src/pages/ClinicAppointmentsPage.test.tsx`
Expected: FAIL because the current page renders cards, not a table.

- [ ] **Step 2: Rewrite the page**

Wrap in `AdminShell active="appointments"`. Keep the current date-range filters (no new search field) in a compact bar; table with `<caption className="sr-only">Citas agendadas</caption>` or `aria-label="Citas agendadas"`, columns patient, service, dentist, date/time, status stamp and actions; mobile stacked rows with labels. Keep the confirmed-only query and the existing management link. Loading rows, error `Notice` with retry, empty state.

- [ ] **Step 3: Update the table assertions and run**

The existing test finds the patient name as a `heading`. In a table, change that assertion to a cell or row (for example `screen.getByRole('cell', { name: /Ana Pérez/ })`) while keeping the phone link and `Gestionar en solicitudes` link assertions. Run: `npx vitest run src/pages/ClinicAppointmentsPage.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ClinicAppointmentsPage.tsx src/pages/ClinicAppointmentsPage.test.tsx
git commit -m "feat: redesign scheduled appointments"
```

---

### Task 20: Appointment requests inbox

**Files:**
- Modify: `src/pages/AppointmentManagementPage.tsx`
- Test: `src/pages/AppointmentManagementPage.test.tsx`

**Interfaces:**
- Consumes `AdminShell`, `Section`, `StatusStamp`, `Notice`, `Field`, `Button`, `SlotButton`, `Icon`.
- Keeps confirm/propose/reject API calls, filters, slot loading, rejection reason validation, folio, and all existing accessible names.

- [ ] **Step 1: Add a failing structural assertion**

Add:
```tsx
expect(await screen.findByRole('list', { name: 'Solicitudes de cita' })).toBeInTheDocument();
```
Run: `npx vitest run src/pages/AppointmentManagementPage.test.tsx`
Expected: FAIL because the current request list has no accessible name.

- [ ] **Step 2: Rewrite the page**

Wrap in `AdminShell active="requests"`. Desktop split: left list (360 px) with rows (patient, service, date, folio, status stamp), right detail with contact rows, appointment facts, proposal notice, and actions. Use `Field`/`SlotButton` for the proposal date/slots and rejection reason; `Button` variants; no emoji; `Icon` for contact. Mobile: list then detail with a "Volver a solicitudes" control. Keep all handlers, loading/error states and the confirmed/proposed/rejected behavior.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/pages/AppointmentManagementPage.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AppointmentManagementPage.tsx src/pages/AppointmentManagementPage.test.tsx
git commit -m "feat: redesign appointment request inbox"
```

---

## Phase 6 — Cleanup and final verification

### Task 21: Remove legacy CSS and StatusBadge

**Files:**
- Modify: `src/styles.css`
- Delete: `src/components/ui/StatusBadge.tsx` after replacing its last usage
- Modify: any page still importing `StatusBadge` (should be none after Tasks 12, 13 and 19)

**Interfaces:**
- No page uses legacy classes: `panel`, `btn`, `premium-form`, `premium-input`, `input-group`, `management-layout`, `management-section-nav`, `schedule-grid`, `schedule-panel`, `auth-layout`, `auth-content`, `auth-form-box`, `alert`, `badge`, `request-list`, `request-card`, `detail-panel`, `card-grid`, `site-header`, `site-footer`, `hero`, `search-bar`, `directory`, `dashboard-page`, `surface-card`. New Tailwind names such as `rounded-panel` and `rounded-card` are allowed.
- `styles.css` keeps imports, `@theme`, dark tokens, base globals and utilities; no `@layer legacy`.

- [ ] **Step 1: Confirm no legacy token usage**

Run a token-boundary search so `rounded-panel`/`rounded-card` do not count as legacy:
```bash
grep -RInE '(^|[ "`])(panel|btn|premium-form|premium-input|input-group|management-layout|management-section-nav|schedule-grid|schedule-panel|auth-layout|auth-content|auth-form-box|alert|badge|request-list|request-card|detail-panel|card-grid|site-header|site-footer|hero|search-bar|directory|dashboard-page|surface-card)([ "`]|$)' src --include='*.tsx' --include='*.css'
```
Expected: no legacy class matches. Ignore `role="alert"` and the allowed `rounded-panel`/`rounded-card` names; inspect any hit before deleting CSS.

- [ ] **Step 2: Delete the legacy layer**

Remove the entire `@layer legacy { ... }` block and the legacy component rules from `src/styles.css`. Change the layer order to `@layer theme, base, utilities;`. Keep:
- `@theme`, `@custom-variant dark`, base body/heading/focus/scrollbar, `.skip-link`, `.sr-only`, reduced motion.
- The `.dark` token block must remain outside the deleted layer.

- [ ] **Step 3: Delete the replacement badge**

Delete `StatusBadge.tsx` after confirming no imports. Remove unused imports.

- [ ] **Step 4: Verify the cleanup**

Run:
```bash
grep -RInE "StatusBadge|@layer legacy" src --include='*.tsx' --include='*.css'
grep -RInE "✉|📞|📅|✅|⚠️|✓" src
```
Expected: no matches (except legitimate text, if any; explain each).

- [ ] **Step 5: Run the full suite**

Run:
```bash
npm run test:contrast
npm run lint
npm run build
npm test
npm test
npm test
```
Expected: all pass three times. If `ClinicAppointmentsPage` flakes, stop and fix the shared-state cause before merging.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css src/pages src/components
git commit -m "refactor: remove legacy styles and status badge"
```

---

### Task 22: Final visual and accessibility verification

**Files:** none unless a fix is needed.

- [ ] **Step 1: Start the app and capture the matrix**

Run `npm run dev`, then check the following at 360, 390, 768 and 1280 px in light and dark:
- `/clinics` (cards, search, empty/error, pagination)
- `/clinics/:id`, `/clinics/:id/dentistas/:id`
- `/clinics/:id/solicitar`, `/mi-solicitud`, `/mis-citas`, `/notificaciones`
- `/iniciar-sesion`, `/registro`, `/verificar-correo`, `/recuperar-contrasena`, `/mi-cuenta`
- `/registrar-consultorio`, `/plataforma/consultorios`
- `/consultorio/configuracion`, `/administrar-dentistas`, `/consultorio/citas`, `/administrar-solicitudes`

- [ ] **Step 2: Check the rules**

No horizontal scroll; 44 px targets; focus visible on every control; no emoji; no content shadows; no gradient hero; dark mode readable; `prefers-reduced-motion` disables transitions; the mobile menu closes with Escape and returns focus.

- [ ] **Step 3: Check the backend price rollout**

With the backend change deployed, the card shows `Desde $X`; without it, the line is hidden and the card still renders. Verify both by mocking/omitting `priceFrom` in a test or dev response.

- [ ] **Step 4: Final commit if fixes were needed**

```bash
git add <fixed files>
git commit -m "fix: address final visual and accessibility findings"
```

---

## Self-Review

- **Spec coverage:** every active route in the spec's route map has a task: directory (8), detail (9), dentist (10), request (11), proposal (12), patient appointments (13), notifications (14), auth/account (15), application/platform (16), settings (17), dentists (18), clinic appointments (19), requests (20), shell (4/5), cleanup (21), final verification (22). The backend price field is Task 6. The dark coral token and 44 px buttons are in Tasks 1–2; the pre-auth registration is Task 16; confirmed-only appointments is Task 19; `ClinicLoginPage` removal is Task 15.
- **Type consistency:** `HeaderLink`/`HeaderGroups` are used by `headerLinks`, `NavMenu`, `SiteHeader`; `clinicFromPrice`/`formatPriceFrom` by `ClinicCard`; `controlClass`/`Field` by every form; `AdminSection` by `AdminShell`/`AdminSectionNav` and the admin pages; `StatusStamp` replaces `StatusBadge`.
- **Review Focus:** photo fallback (Tasks 7/9/10), dark coral (Task 1/2/contrast), mobile menu (Task 4), explicit states (Tasks 8–10, 13–14, 18–20), admin actions (Tasks 18–20).
- **Proportion:** page tasks point to the design doc for exact visual values and name only the structural/test decisions; primitives carry signatures and tests. No task transcribes a full page.
