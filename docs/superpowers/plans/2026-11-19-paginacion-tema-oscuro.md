# Paginación escalable, modo oscuro y dropdown de tema — plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer la paginación del catálogo usable con más de 100 registros, corregir los restos de tema claro en modo oscuro y convertir el selector de tema en un dropdown con iconos.

**Architecture:** Tres cambios independientes sobre el front existente: un helper puro de ventana de páginas consumido por `ClinicListPage`; un dropdown accesible en `ThemeToggle` con los SVG que ya existen; y un barrido de colores literales del CSS legado hacia los tokens semánticos ya definidos, más splash oscuro en `index.html`. Sin dependencias nuevas.

**Tech Stack:** React 19, TypeScript, Vite 6, Vitest 4, Testing Library, Tailwind 4 + CSS legado.

**Spec:** `docs/superpowers/specs/2026-11-19-paginacion-tema-oscuro-design.md`

## Global Constraints

- No agregar dependencias.
- Mantener los tokens y la arquitectura híbrida Tailwind + CSS legado.
- Objetivos táctiles de 44 px y foco visible.
- Conservar `localStorage` (`dentalconnect-theme`), `matchMedia` y la aplicación sin flash.
- Colores de marca/estado intencionales se conservan: gradientes de marca, blanco sobre primario, puntos de estado y botón verde de aceptar.

## Review Focus

- Página actual fuera de rango tras filtrar: el componente ya la limita con `Math.min`; los tests del helper cubren los bordes de la ventana.
- `totalPages` de 1 a 7: no debe aparecer ningún `…`.
- Dropdown: clic fuera, Escape y foco de retorno; no debe quedar abierto tras elegir.
- Modo oscuro: ningún literal claro sin contraparte en `styles.css` ni en el splash de `index.html`.
- Contraste: los pares nuevos deben pasar `npm run test:contrast` en claro y oscuro.

---

### Task 1: Ventana de páginas y paginación del catálogo

**Files:**
- Create: `src/lib/pagination.ts`
- Create: `src/lib/pagination.test.ts`
- Modify: `src/pages/ClinicListPage.tsx:1-20,155-158,308-352`
- Modify: `src/styles.css` (botón de puntos suspensivos si hace falta)

**Interfaces:**
- Produces: `getPageItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { getPageItems } from './pagination';

describe('getPageItems', () => {
  it('shows every page when there are seven or fewer', () => {
    expect(getPageItems(1, 1)).toEqual([1]);
    expect(getPageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('opens with a five-page window near the start', () => {
    expect(getPageItems(1, 17)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 17]);
  });

  it('centers the window in the middle', () => {
    expect(getPageItems(9, 17)).toEqual([1, 'ellipsis', 8, 9, 10, 'ellipsis', 17]);
  });

  it('closes with a five-page window near the end', () => {
    expect(getPageItems(17, 17)).toEqual([1, 'ellipsis', 13, 14, 15, 16, 17]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pagination.test.ts`
Expected: FAIL, `getPageItems` is not exported.

- [ ] **Step 3: Implement `getPageItems` in `src/lib/pagination.ts`**

```ts
export function getPageItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pagination.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire it into `ClinicListPage`**

- Import `useRef` and `getPageItems`.
- `const resultsRef = useRef<HTMLElement>(null)`.
- `goToPage(next)` sets the page and calls `resultsRef.current?.scrollIntoView({ block: 'start' })`.
- Replace `Array.from({ length: totalPages }...)` with `getPageItems(currentPage, totalPages)`; render `…` as a non-interactive `<span aria-hidden="true">…</span>`.
- All pagination buttons call `goToPage`.
- Add `ref={resultsRef}` to the results `<section>`.

- [ ] **Step 6: Run catalog tests and lint**

Run: `npx vitest run src/pages/ClinicListPage.test.tsx src/lib/pagination.test.ts && npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pagination.ts src/lib/pagination.test.ts src/pages/ClinicListPage.tsx src/styles.css
git commit -m "feat: window catalog pagination for large result sets"
```

---

### Task 2: Dropdown de tema con iconos

**Files:**
- Modify: `src/theme/ThemeToggle.tsx`
- Modify: `src/styles.css:888-898,981`
- Modify: `src/theme/ThemeToggle.test.tsx`

**Interfaces:**
- Consumes: `useTheme()` → `{ preference, setPreference }`; `ThemePreference`.
- Produces: `ThemeToggle` sin props.

- [ ] **Step 1: Update the failing tests**

```tsx
it('switches to dark, persists it and closes the menu', async () => {
  renderToggle();
  fireEvent.click(screen.getByRole('button', { name: /Tema de la interfaz/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Oscuro' }));

  await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
  expect(window.localStorage.getItem(themeStorageKey)).toBe('dark');
  expect(screen.queryByRole('button', { name: 'Oscuro' })).not.toBeInTheDocument();
});

it('closes with Escape and returns focus to the trigger', () => {
  renderToggle();
  const trigger = screen.getByRole('button', { name: /Tema de la interfaz/i });
  fireEvent.click(trigger);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('button', { name: 'Oscuro' })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it('closes when clicking outside', () => {
  renderToggle();
  fireEvent.click(screen.getByRole('button', { name: /Tema de la interfaz/i }));
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('button', { name: 'Oscuro' })).not.toBeInTheDocument();
});
```

Keep the light/system behavior assertions, opening the menu before each selection.

Run: `npx vitest run src/theme/ThemeToggle.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Implement the dropdown**

- `useState(false)` y `useRef<HTMLDivElement>` / `useRef<HTMLButtonElement>`.
- `useEffect` con `pointerdown` en `document` para cerrar fuera y `keydown` para Escape (cerrar y `triggerRef.current?.focus()`).
- Trigger: icono + etiqueta de la preferencia actual + chevron, `aria-expanded`, `aria-label={`Tema de la interfaz: ${label}`}`.
- Panel: `role="group" aria-label="Tema de la interfaz"` con un botón por opción, icono + etiqueta, `aria-pressed`, `onClick` que aplica y cierra.
- Mantener los componentes `Sun`, `Moon`, `Monitor` y agregar el chevron inline.

- [ ] **Step 3: Replace the `.theme-toggle` styles**

Remove `.theme-toggle` rules and `.dark .theme-toggle`. Add `.theme-menu`, `.theme-menu-trigger`, `.theme-menu-panel` using `--color-surface`, `--color-surface-alt`, `--color-border`, `--color-heading`, `--color-primary-soft`, `--radius-md`, `--shadow-lg`; panel `position: absolute`, `right: 0`, `z-index` alto. En `max-width: 620px` oculta la etiqueta del trigger (el `aria-label` conserva el nombre).

- [ ] **Step 4: Run tests and lint**

Run: `npx vitest run src/theme && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/theme/ThemeToggle.tsx src/theme/ThemeToggle.test.tsx src/styles.css
git commit -m "feat: add icon theme dropdown"
```

---

### Task 3: Barrido de modo oscuro y splash

**Files:**
- Modify: `src/styles.css`
- Modify: `index.html:52-130`
- Modify: `scripts/check-contrast.mjs`

- [ ] **Step 1: Replace literals with semantic tokens**

| Selector | Cambio |
|---|---|
| `:focus-visible` | `outline-color: var(--color-accent)` |
| `button:disabled` | `color: var(--color-text-subtle); background: var(--color-line); border-color: var(--color-border-strong)` |
| `.btn-danger:hover`, `.danger-btn:hover` | `background: var(--color-danger-soft)` |
| `.button-retry:hover` | `background: var(--color-danger-soft)` |
| `.reject-btn` (ambas reglas) | `border-color: var(--color-danger-border); color: var(--color-danger-text)`; hover `border-color: var(--color-danger)` |
| `.disabled-step` | `background: var(--color-surface-soft); color: var(--color-text-muted)` |
| `input[aria-invalid]` | `border-color: var(--color-danger-text)` |
| `.account-profile-form input` | `color: var(--color-text-main)` |
| `.account-profile-form .form-error` | `color: var(--color-danger-text)` |
| `.account-profile-form .form-success` | `color: var(--color-success-text)` |
| `.proposal-header` | gradiente con `--color-surface` y `--color-surface-alt` |
| `.hero` | gradiente con `--color-surface-soft`, `--color-bg`, `--color-primary-soft` |
| `.eyebrow`, `.search`, `.service-pill`, `.badge-distance`, `.account-role`, `.icon-btn.danger`, `.location-button`, `.pagination-button`, `.status-badge.inactive` | reemplazar literales por `--color-border` / `--color-border-strong` / `--color-control` / `--color-danger-border` según corresponda |

Delete the `.dark` overrides that become redundant. Keep `.dark` overrides for `.skeleton`, `.notice`, `.service-card .price`, `.media-placeholder`, `.auth-visual` and status dots/gradients that cannot use a single token.

- [ ] **Step 2: Verify no fixed light backgrounds remain**

Run: `grep -nE '#[0-9A-Fa-f]{3,8}' src/styles.css | awk -F: '$1 < 900'`
Expected: only brand/status/intentional literals remain (primary gradients, white on primary, status dot colors, accept button green, service price). No `#FFF`/`#F5F8FA`/`#FDE9E7`/`#F0F3F5` backgrounds in legacy rules.

- [ ] **Step 3: Dark splash in `index.html`**

After the light `.splash-screen` rules, add:

```css
.dark body { background-color: #08181d; }
.dark .splash-screen { background-color: #08181d; }
.dark .splash-logo { color: #e6f4f1; }
.dark .splash-loader { border-color: rgba(125, 211, 199, 0.2); border-top-color: #7dd3c7; }
```

- [ ] **Step 4: Extend contrast pairs**

Add to `scripts/check-contrast.mjs`: `light danger text on white`, `light success text on white`, `dark danger text on surface` (ya existe), `dark success text on surface` (ya existe), `light accent focus on canvas` y `dark accent focus on canvas` (ya existe). Run:

`npm run test:contrast`
Expected: all pairs pass.

- [ ] **Step 5: Full verification**

Run: `npm run test && npm run lint && npm run build && npm run test:contrast`
Expected: all pass; build emits the PWA artifacts.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css index.html scripts/check-contrast.mjs
git commit -m "fix: remove light-only colors from dark theme"
```

---

## Manual check after both tasks

- `npm run dev`, abrir `/clinics` en claro y oscuro.
- Con más de 17 páginas simuladas, verificar `1 2 3 4 5 … N` y el salto al cambiar de página.
- Abrir el dropdown con teclado y ratón, elegir los tres temas, recargar y confirmar persistencia.
- Revisar cuenta, auth, admin y citas en oscuro: sin texto ilegible ni fondos blancos.
