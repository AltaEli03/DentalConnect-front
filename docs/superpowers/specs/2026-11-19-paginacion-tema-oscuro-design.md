# Paginación escalable, modo oscuro y dropdown de tema — diseño

**Fecha:** 19 de noviembre de 2026
**Estado:** propuesto
**Repo:** `DentalConnect-front`

## Intención

El catálogo ya pagina, pero pinta todos los números de página: con 100 consultorios son 17 botones y con más registros la fila se vuelve inmanejable. Además, el tema oscuro arrastra colores claros fijos del CSS legado, lo que produce texto ilegible y fondos blancos. El selector de tema, hoy tres botones, debe ser un dropdown.

## Objetivos

- Paginación legible con cualquier cantidad de registros (100, 1 000 o más), sin cambiar la API.
- Modo oscuro sin texto ilegible ni superficies claras accidentales en catálogo, cuenta, auth, admin y citas.
- Splash de arranque acorde al tema guardado.
- Selector de tema como dropdown accesible, con iconos y persistente.

## No objetivos

- Paginación en servidor o cambios al back.
- Selector de tamaño de página o "ir a página".
- Rediseño visual general ni nuevos componentes de diseño.
- Cambiar el modelo de tema (claro/oscuro/sistema, `localStorage`, sin flash).

## Restricciones

- React 19, Vite 6, Tailwind 4.3.5, Vitest 4; sin dependencias nuevas.
- Mantener la arquitectura híbrida Tailwind + CSS legado y sus tokens semánticos.
- Conservar accesibilidad: foco visible, nombres accesibles, objetivos táctiles de 44 px, contraste medido con `npm run test:contrast`.

## Enfoques considerados

1. **Ventana de páginas + dropdown propio con iconos + barrido de tokens** (elegido). Ataca la causa del modo oscuro y conserva los iconos que el usuario pidió.
2. Parchar solo las pantallas reportadas. Más rápido, pero deja colores claros fijos en el resto del CSS legado.
3. `<select>` nativo. Accesible sin código extra, pero no admite SVG dentro de las opciones: se perderían los iconos.
4. Selector de tamaño de página y paginación en servidor. No fueron pedidos; el back devuelve el catálogo completo y el filtrado es local.

## Decisiones

### Paginación (`src/pages/ClinicListPage.tsx`)

- Nuevo helper puro `src/lib/pagination.ts` con `getPageItems(currentPage, totalPages)`.
- `totalPages <= 7`: se muestran todas.
- Con más páginas: primera y última siempre visibles, ventana de 3 alrededor de la actual y `'ellipsis'` donde haya salto. Casos de borde resueltos con ventana fija de 5 al inicio/final para evitar puntos suspensivos inútiles.
- Se conservan Anterior/Siguiente y el resumen "Mostrando X–Y de N".
- Al cambiar de página se hace `scrollIntoView` de la sección de resultados, para no dejar al usuario al final de una lista que ya cambió.
- `PAGE_SIZE` sigue en 6.

### Modo oscuro (`src/styles.css`, `index.html`)

- Todo literal con equivalente semántico pasa a token (`--color-surface`, `--color-danger-soft`, `--color-text-main`, `--color-border`, etc.). Se eliminan los overrides `.dark` que dejen de ser necesarios.
- Se conservan literales solo donde son intencionales: gradientes de marca, blanco sobre primario, puntos de estado y botón verde de aceptar.
- Casos detectados que hoy no tienen contraparte oscura: `.reject-btn`, `.disabled-step`, `.button-retry:hover`, `.danger-btn:hover`, `.account-profile-form .form-error/.form-success`, `input[aria-invalid]` y el foco global.
- `var(--color-text)` no existe: se corrige a `var(--color-text-main)`.
- Splash de `index.html`: fondo, logo y texto cambian con `.dark` antes de que React monte; se mantiene el splash claro para el tema claro.
- Se amplía `scripts/check-contrast.mjs` con los pares nuevos que lo requieran y se ejecuta en ambos temas.

### Dropdown de tema (`src/theme/ThemeToggle.tsx`, `src/styles.css`)

- Botón disparador con el icono y la etiqueta del tema actual, `aria-expanded` y `aria-haspopup`, y panel desplegable con las tres opciones (sol/luna/monitor) como botones `aria-pressed`.
- Cierra al elegir, al hacer clic fuera y con Escape; con Escape el foco vuelve al disparador. Objetivos táctiles de 44 px y tokens de superficie.
- Sustituye el grupo de tres botones y sus reglas `.theme-toggle`.
- Se actualiza `ThemeToggle.test.tsx`: abre el dropdown, elige una opción, verifica persistencia, cierre y foco.

## Riesgos

- El CSS legado es grande; el barrido es mecánico y se apoya en los tokens existentes. Cualquier color sin token claro se resuelve con un override `.dark` puntual, no con un token nuevo.
- La verificación visual final requiere abrir la app; mientras tanto se cubre con tests, lint, build y el script de contraste.
- El dropdown propio suma manejo de foco, Escape y clic-fuera; se cubre con tests para no degradar la accesibilidad que daba el grupo de botones.

## Verificación

- `npm run test` (incluye `pagination.test.ts` y `ThemeToggle.test.tsx` actualizado).
- `npm run lint`, `npm run build`, `npm run test:contrast`.
- Revisión estática de que no queden fondos blancos ni textos claros fijos sin override en `styles.css` e `index.html`.
