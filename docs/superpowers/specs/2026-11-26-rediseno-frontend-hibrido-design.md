# Rediseño del frontend: marca DentalConnect con la claridad de B

**Fecha:** 26 de noviembre de 2026
**Estado:** borrador para aprobación
**Alcance:** frontend `DentalConnect-front`, todas las pantallas
**Referencias:** `PRODUCT.md`, `specs/tec-09-pruebas-integrales-permisos-accesibilidad/screenshots/`

## Intención

La app funciona, pero se ve "generada": hero con degradado y píldora, tarjetas idénticas con sombra, el mismo ritmo de "eyebrow → título → párrafo → panel" en todas las pantallas, emojis como iconos y dos sistemas visuales conviviendo (Tailwind para pacientes, CSS legado para auth y administración).

El rediseño conserva lo que ya identifica a DentalConnect —teal profundo, aqua, coral, Outfit/Inter, logotipo, fotografía de consultorios y la tarjeta de resultados— y le quita los tics de plantilla. La estructura toma de la dirección B: búsqueda compacta, jerarquía tipográfica, reglas finas, densidad de tabla donde hace falta y una sola retícula. El resultado debe sentirse como un directorio de salud cuidado, no como un marketplace genérico.

## Objetivos

- Un solo sistema visual para paciente, auth, administración de consultorio y administración de plataforma.
- Conservar la marca y la tarjeta de resultados del directorio.
- Sustituir decoración por estructura: sin degradados, sin sombras en contenido, sin píldoras decorativas, sin emojis de interfaz.
- Hacer escaneable el directorio y las pantallas de gestión: filas, tablas, estados explícitos y acciones claras.
- WCAG 2.2 AA, responsive real en 360, 390, 768 y 1280 px, modo claro y oscuro.
- Eliminar el CSS legado y las clases duplicadas al terminar; dejar un solo camino de estilos.
- Mantener rutas, autenticación, API, PWA y comportamiento del tema sin cambios de contrato.

## No objetivos

- Reseñas, calificaciones, mapas, pagos, seguros o comparación de precios finales.
- Cambios en el backend fuera del campo aditivo `priceFrom` en el resumen de servicios del listado de consultorios.
- Renombrar la marca o cambiar la paleta base.
- App nativa o rediseño de la lógica de Cognito.
- Fuentes nuevas o dependencias nuevas.

## Antiobjetivos

- Un segundo sistema de diseño "para las pantallas nuevas".
- Un rediseño que solo cambie colores y radios.
- Sopa de tarjetas, sombras, degradados y píldoras como solución por defecto.
- Datos inventados: calificaciones, testimonios, disponibilidad o precios que la API no devuelve.
- Emojis como iconos de interfaz o animación decorativa.
- Romper flujos de administración que hoy funcionan.

## Restricciones

- React 19, Vite 6, TypeScript, Tailwind 4.3.5, Vitest 4; sin dependencias nuevas.
- Fuentes actuales autoalojadas: Outfit e Inter.
- Rutas y roles actuales: paciente, administrador de consultorio, administrador de plataforma.
- `npm run test`, `npm run lint`, `npm run build` y `npm run test:contrast` deben quedar en verde.
- Los objetivos táctiles mínimos son de 44 px y el foco debe ser visible.
- El modo oscuro se conserva con los tokens semánticos existentes.
- La API solo recibe un cambio aditivo aprobado: `priceFrom` en el resumen de servicios del listado de consultorios. El resto del contrato no cambia.

## Estado de partida

Verificado el 26 de noviembre de 2026 antes de escribir este documento:

- `npm run build`: pasa.
- `npm run test:contrast`: los 32 pares pasan.
- `npm test`: 119 de 122 pruebas pasan. Tres fallos en `ClinicAppointmentsPage.test.tsx` aparecen solo al correr la suite completa; el archivo pasa aislado. Es una fragilidad de pruebas preexistente que se estabiliza en la fase 1 y se verifica en la fase 7.
- `npm run lint`: falla por los scripts de `.agents/skills/impeccable` (herramientas locales, no código de la app). En la fase 1 se agrega `.agents/` a los ignores de ESLint para que el lint mida solo el producto.

## Enfoques considerados

1. **A · Editorial.** Papel cálido, serif Newsreader, filas con miniaturas. Muy distintivo, pero el usuario quiere conservar la marca actual y las tarjetas.
2. **B · Cívico.** Tabla, off-white, negro, verde señal, sin fotografía. Máxima claridad, pero frío y sin la calidez de la marca.
3. **C · Boutique.** Crema, bosque, arcilla, Fraunces, fotografía grande. Cálido, pero se acerca a spa y repite el patrón de tarjetas.
4. **Híbrido (elegido).** Marca actual + estructura de B + tarjeta actual de resultados. Conserva lo que el usuario reconoce y elimina los tics de plantilla con la retícula y la jerarquía de B.

Para la implementación:

1. Mantener el híbrido Tailwind + CSS legado y solo maquillar administración. Menor riesgo inmediato, pero deja la causa del problema.
2. **Migrar todas las pantallas a Tailwind + componentes compartidos y borrar el CSS legado (elegido).** Más trabajo, pero es la única forma de que la app se sienta como una sola y de que el rediseño no derive.
3. Reescribir con otro stack. No hay razón; agrega riesgo sin cambiar el producto.

## Dirección aprobada

- **Marca:** se conservan nombre, logotipo, teal `#003B4A`, aqua `#007C83`, coral `#B6412C`, fondos perla, Outfit/Inter y fotografía de consultorios.
- **Directorio:** hero sin degradado ni píldora; búsqueda compacta en una tarjeta blanca de borde fino; resultados en la cuadrícula de tarjetas actual (3/2/1 columnas) con la tarjeta refinada.
- **Resto de la app:** estructura de registro y tabla al estilo B: filas, reglas finas, encabezados micro, densidad, acciones a la derecha. Sin tarjetas para contenido que se escanea.
- **Acento:** teal para acciones primarias de navegación y búsqueda; coral para acciones de cita y enlaces de avance; danger para lo destructivo.
- **Superficies:** blancas sobre perla, borde de 1 px, sin sombra; una sombra suave solo para menús flotantes y toasts.

### La tarjeta aprobada

- Imagen 16:9, `object-cover`, radio 4 px; si no hay imagen, placeholder con iniciales del consultorio y trama de líneas finas (sin gradiente).
- Cuerpo: ubicación en micro-etiqueta aqua; nombre en Outfit 19 px/600; dirección en 11.5 px; descripción a 2 líneas; hasta 3 servicios como chips planos aqua + "y N más".
- Pie: "Desde $X" con número tabular; botón de ancho completo "Ver detalles" con borde aqua de 1 px, radio 6 px y 44 px de alto.
- Sin sombra, sin `translateY` al hover; el hover cambia solo el borde a aqua.
- La cuadrícula usa 3 columnas a ≥1100 px, 2 a ≥700 px, 1 abajo; gap de 20 px.

### La búsqueda aprobada

- Tarjeta blanca, borde de 1 px, radio 10 px, padding 14 px; sin sombra.
- Campos con etiqueta micro, control de 44 px y radio 6 px; botón teal de 44 px.
- "Usar mi ubicación" como acción de texto con icono; el mensaje de ubicación va en la misma línea, a la derecha en escritorio.
- En móvil los campos se apilan y el botón ocupa todo el ancho.

## Sistema visual

### Tokens de color (claro)

| Token | Valor | Uso |
|---|---|---|
| `canvas` | `#F5F8FA` | Fondo de la app |
| `surface` | `#FFFFFF` | Tarjetas, tablas, formularios |
| `surface-soft` | `#E7F1F3` | Chips, encabezados de tabla, hover suave |
| `ink` | `#0F172A` | Texto principal |
| `muted` | `#425466` | Texto secundario |
| `subtle` | `#596B7A` | Metadatos, placeholders |
| `heading` | `#003B4A` | Títulos y botón primario |
| `accent` | `#007C83` | Acento, bordes de foco, iconos |
| `accent-strong` | `#005B63` | Texto aqua sobre claro |
| `coral` | `#B6412C` | Botones de cita con texto blanco |
| `coral-text` | `#B6412C` claro / `#E89880` oscuro | Enlaces de avance, subrayados y bordes de acento |
| `line` | `#E2E8F0` | Reglas y bordes |
| `line-strong` | `#CBD5E1` | Bordes de énfasis |
| `control` | `#5F7484` | Borde de controles |
| `danger` / `danger-text` | `#A72B24` / `#991B1B` | Errores y acciones destructivas |
| `success` / `success-text` | `#087443` / `#065F46` | Confirmaciones |
| `warning-text` | `#9A3412` | Pendientes y vencimientos |

Contraste medido: `#003B4A` sobre blanco 12.18:1, `#007C83` 4.99:1, blanco sobre `#B6412C` 5.55:1, `#425466` 7.80:1, `#005B63` sobre perla 4.99:1. En oscuro, `#E89880` sobre `#102A30` da 6.62:1 y sobre `#163840` 5.52:1; `#B6412C` directo sobre oscuro no alcanza 4.5:1 y por eso no se usa como texto. Cualquier combinación nueva se agrega a `scripts/check-contrast.mjs` antes de usarse.

### Modo oscuro

Se conservan los tokens actuales de `.dark` (`#08181D`, `#102A30`, `#163840`, `#EAF2F4`, `#B7C9CE`, `#7DD3C7`, etc.) y se agrega `--color-coral-text: #E89880` para enlaces y subrayados. Los componentes nuevos usan solo tokens semánticos; no se agregan overrides por clase. Toda pantalla se revisa en ambos temas.

### Tipografía

- **Outfit Variable**: títulos, nombres de consultorio, cifras grandes. Pesos 600/700/800.
- **Inter Variable**: cuerpo, interfaz, metadatos. Pesos 400/500/600.
- Escala:
  - Display 1: `clamp(2.25rem, 4.5vw, 3.375rem)`, 700, línea 1.03, tracking -0.04em.
  - Display 2: `clamp(1.75rem, 3vw, 2.25rem)`, 700, línea 1.1, tracking -0.03em.
  - Display 3: 1.5rem, 700, línea 1.2, tracking -0.02em.
  - Título de tarjeta: 1.1875rem, 600, línea 1.2, tracking -0.015em.
  - Cuerpo: 1rem, 400, línea 1.65.
  - Interfaz: 0.875rem, 400/500.
  - Pequeño: 0.75rem.
  - Micro-etiqueta: 0.625rem, 600, mayúsculas, tracking 0.11–0.14em.
- Números tabulares en precios, horas, folios y paginación.

### Forma, espacio y movimiento

- Radios: tarjeta 12 px, panel 10 px, control 6 px, chip/miniatura 4 px. Sin píldoras decorativas.
- Espaciado base de 4 px; se usan 8, 12, 16, 20, 24, 32, 40, 48 y 64.
- Ancho máximo de contenido: 1180 px; gutters 20 px en móvil y 32 px en escritorio.
- Sin sombras en tarjetas, tablas o paneles. Solo menús flotantes y toasts usan `0 16px 40px -24px rgb(0 59 74 / 0.35)`.
- Transiciones de 140–180 ms solo en color, borde y fondo. Nada de `translateY` ni `scale`. `prefers-reduced-motion` desactiva todo.
- Foco: anillo de 3 px en aqua con offset 2 px; en campos, borde aqua + anillo suave de 3 px.

### Iconografía

- Set propio en SVG inline, trazo 1.6, `currentColor`, tamaños 16/20 px, `aria-hidden`.
- Iconos necesarios: buscar, ubicación, teléfono, correo, reloj, calendario, flecha derecha, chevron, sol, luna, monitor, menú, cerrar, check, alerta.
- Se eliminan los emojis `✉️`, `📞`, `📅`, `✓`, `⚠️`, `✅` de la interfaz y del CSS. Los estados usan iconos o texto, no emojis.

### Voz y copy

- Español de México, frases cortas, sin exclamaciones.
- "Consultorio" para el negocio; "solicitud" para la petición; "cita" para lo confirmado.
- Sin afirmaciones no verificables. El copy del mockup "Sin llamadas y sin datos de más" se sustituye por "Solicita tu cita en línea."
- Los errores dicen qué pasó y qué hacer; los estados vacíos ofrecen la siguiente acción.

## Componentes compartidos

| Componente | Especificación |
|---|---|
| `Button` | Variantes `primary` (teal), `outline` (borde control), `ghost`, `danger`, `coral` para citas. Tamaños `sm` y `md`: ambos con 44 px de alto; `sm` reduce padding horizontal y tipografía, nunca el objetivo táctil. `loading` con spinner y `aria-busy`. Foco visible. |
| `Field` | Label visible, `hint`, `error` con `aria-describedby` e `aria-invalid`. Envuelve input, select o textarea. Altura mínima 44 px. |
| `Notice` | Tonos info/success/error/warning. Título opcional, `role` adecuado y acción opcional. Sin emoji. |
| `StatusStamp` | Sello rectangular de 4 px de radio, 11 px mayúsculas, punto de color y texto. Tonos pending/confirmed/proposed/rejected/cancelled. No es una píldora. |
| `PageHeader` | Kicker, título, descripción y acciones. Se usa en todas las páginas. |
| `Section` | Título, descripción opcional, regla superior y contenido. Evita paneles anidados. |
| `EmptyState` | Icono, título, texto y acción. Sin tarjeta con sombra. |
| `Skeleton` | Bloques con `animate-pulse` y `motion-reduce:animate-none`; usado en tarjetas y filas. |
| `NavMenu` | Disclosure accesible para el menú móvil y el grupo "Consultorio" en escritorio. `aria-expanded`, Escape cierra y devuelve foco, clic fuera cierra. |
| `ClinicCard` | La tarjeta aprobada. Conserva `ContentImage`, distancia y servicios; agrega precio mínimo. |
| `AdminSectionNav` | Navegación horizontal de secciones del consultorio; `aria-current="page"`, 44 px, subrayado aqua. |
| `Receipt` | Panel de resumen de cita: filas etiqueta/valor, borde fino, radio 10 px, sin sombra. |
| `SlotButton` | Botón de horario de 44 px, borde 1 px, radio 6 px, seleccionado con fondo teal. |

No se crea un componente `Card` genérico para contenido. Las tarjetas se reservan al directorio y a la tarjeta de consultorio; la administración usa secciones, tablas y filas.

## App shell y navegación

- **Header:** 68 px en escritorio, 58 px en móvil, sticky, fondo blanco, borde inferior de 1 px. Logotipo de 23 px; navegación de 13 px; botón "Mi cuenta" o "Iniciar sesión" con borde; toggle de tema con objetivo táctil de 44 px.
- **Enlaces visibles en escritorio por rol:**

| Estado | Enlaces |
|---|---|
| Sin sesión | Consultorios · Registrar consultorio · Crear cuenta · Iniciar sesión (borde) · tema |
| Paciente | Consultorios · Mis citas · Avisos · Mi cuenta (borde) · tema |
| Consultorio | Consultorios · Consultorio (menú) · Avisos · Mi cuenta · tema |
| Plataforma | Consultorios · Revisar altas · Mi cuenta · tema |
| Consultorio + plataforma | Consultorios · Consultorio (menú) · Revisar altas · Avisos · Mi cuenta · tema |

  El menú "Consultorio" contiene Citas, Solicitudes, Perfil y servicios y Dentistas y horarios. "Registrar consultorio" y "Crear cuenta" son enlaces de captación y solo aparecen sin sesión; el pie conserva "Registrar consultorio". "Mis citas" es solo para pacientes. Un administrador de consultorio sí ve "Avisos" porque la página de notificaciones tiene modo consultorio.

- **Móvil:** brand + botón "Menú" de 44 px + toggle de tema. El panel ocupa todo el ancho bajo el header, con filas de 44 px agrupadas en Explorar, Mi cuenta, Consultorio y Plataforma según el rol; Escape y clic fuera cierran; el foco vuelve al botón.
- **Footer:** fondo blanco, borde superior, brand de 18 px, tagline de 11.5 px y enlaces de 12 px. En móvil se apila.
- **Skip link**, `NetworkStatus` y `FeedbackToast` se conservan; se restilizan con los tokens nuevos.

## Pantallas

### Mapa de rutas cubiertas

Todas las rutas activas de `src/routes/App.tsx` están cubiertas. Las redirecciones no tienen diseño propio; `ClinicLoginPage` no tiene ruta activa y se elimina.

| Ruta | Pantalla | Fase |
|---|---|---|
| `/clinics` | Directorio | 2 |
| `/clinics/:id` | Detalle del consultorio | 3 |
| `/clinics/:clinicId/dentistas/:dentistId` | Perfil del dentista | 3 |
| `/clinics/:clinicId/solicitar` | Solicitud de cita | 4 |
| `/mi-solicitud`, `/mi-solicitud/:appointmentId` | Mi solicitud / propuesta | 4 |
| `/mis-citas` | Mis citas | 4 |
| `/notificaciones` | Avisos | 4 |
| `/registro` | Crear cuenta | 5 |
| `/verificar-correo` | Verificar correo | 5 |
| `/iniciar-sesion` | Iniciar sesión | 5 |
| `/recuperar-contrasena` | Recuperar contraseña | 5 |
| `/mi-cuenta` | Mi cuenta | 5 |
| `/registrar-consultorio` | Registro de consultorio (introducción sin sesión + formulario/estado con sesión) | 5 |
| `/plataforma/consultorios` | Revisión de altas (administrador de plataforma) | 5 |
| `/consultorio/configuracion` | Perfil y servicios | 6 |
| `/administrar-dentistas` | Dentistas y horarios | 6 |
| `/consultorio/citas` | Citas agendadas | 6 |
| `/administrar-solicitudes` | Solicitudes de cita | 6 |
| `/`, `/consultorio/iniciar-sesion`, `*` | Redirecciones, sin pantalla propia | — |

También se rediseñan los estados del shell: splash de arranque, aviso de red, toast de feedback, menú de tema, skip link y footer. El header y el footer son parte de la fase 1.

### 1. Directorio (`/clinics`)

- Hero: kicker "Directorio dental" con línea aqua, h1 Outfit, descripción de una línea. Sin degradado ni píldora.
- Búsqueda: la tarjeta compacta aprobada. Filtros en URL (`q`, `servicio`), botón de ubicación, mensaje de ubicación, "Limpiar filtros" como enlace de texto.
- Resultados: encabezado "Resultados" + conteo; cuadrícula de tarjetas aprobada; paginación de 44 px con subrayado coral en la página activa.
- Estados: carga con 6 skeletons de tarjeta; error con `Notice` y "Reintentar"; vacío con `Notice` y acción para limpiar filtros; "cerca de ti" con distancia en la tarjeta.
- Móvil: una columna; búsqueda apilada; header con menú.

### 2. Detalle del consultorio (`/clinics/:id`)

- Enlace "Volver al directorio"; `PageHeader` con ubicación, nombre y descripción.
- Dos columnas en escritorio (`1.4fr / 0.6fr`): contenido y rail sticky a 88 px.
- Contenido: banda de imagen 21:9 con radio 12 px; si no hay imagen, placeholder con iniciales. Datos de contacto en una lista de definición con iconos y reglas finas. Servicios en filas: nombre, descripción, duración, "Desde $X" y CTA "Solicitar"; en móvil se apilan. Equipo en filas con retrato de 64 px, nombre, especialidad y enlace; no tarjetas con sombra.
- Rail: panel "Solicita tu cita" con los tres pasos y CTA coral; nota "Enviar la solicitud no confirma ni cobra la cita."; teléfono y correo como enlaces.
- Estados: carga con skeletons, error con reintento y volver, sin imágenes con placeholder.

### 3. Perfil del dentista (`/clinics/:clinicId/dentistas/:dentistId`)

- Artículo con retrato 4:5 o 1:1, especialidad en micro-etiqueta, nombre, biografía y servicios activos.
- Rail con consultorio, contacto y CTA de solicitud. Sin tarjetas con sombra.

### 4. Solicitud de cita (`/clinics/:clinicId/solicitar`)

- `PageHeader` con consultorio y servicio; dos columnas: formulario y recibo sticky.
- Secciones numeradas 01–04 con regla superior, sin tarjetas: servicio, dentista, horario, datos del paciente. Campos con `Field`; horarios con `SlotButton`; nota de zona horaria.
- Recibo: filas etiqueta/valor (servicio, dentista, fecha, consultorio), CTA "Enviar solicitud" teal y nota de que no confirma ni cobra.
- Éxito: panel de confirmación con folio, fecha, estado y enlaces a "Mis citas" y "Volver al directorio".
- Móvil: el recibo va después del formulario; CTA a ancho completo.

### 5. Mi solicitud / propuesta (`/mi-solicitud`, `/mi-solicitud/:appointmentId`)

- Estado con `StatusStamp`; explicación breve.
- Comparación de horario original y propuesto en dos columnas con reglas; vencimiento con `Notice` warning; acciones "Aceptar" (teal) y "Rechazar" (outline danger). En móvil se apilan.
- El detalle de la cita se muestra como recibo, no como tarjeta decorativa.

### 6. Mis citas (`/mis-citas`)

- `PageHeader`; lista de filas con `StatusStamp`, consultorio, servicio, dentista, fecha/hora, folio y acciones.
- Vacío con CTA al directorio; carga con skeletons de fila; error con reintento. Sin tarjetas con sombra.

### 7. Avisos (`/notificaciones`)

- `PageHeader`; sección de avisos push en este dispositivo con botón de activación y estado; lista de filas con punto de no leído, título, cuerpo, fecha y enlace.
- Vacío y error con `Notice`; sin tarjetas decorativas.

### 8. Auth (`/registro`, `/verificar-correo`, `/iniciar-sesion`, `/recuperar-contrasena`)

- Una columna centrada, sin split-screen ni degradado. Fondo perla; formulario en una hoja blanca de 12 px de radio, borde de 1 px y sin sombra; ancho 440 px (720 px en registro).
- Logotipo, título Outfit, campos `Field`, botón primario de ancho completo, enlaces de apoyo y errores con `Notice`.
- Conservar el toggle de contraseña, los requisitos y el checkbox de sesión recordada.
- Móvil: la hoja ocupa el ancho con padding; sin bordes laterales si el espacio es mínimo.

### 9. Mi cuenta (`/mi-cuenta`)

- `PageHeader`; hoja de perfil con correo de solo lectura y datos editables; secciones "Datos de contacto" y "Cuenta"; mensajes de éxito/error con `Notice`. Sin tarjetas con sombra.

### 10. Registro de consultorio (`/registrar-consultorio`, `/plataforma/consultorios`)

- Sin sesión, la ruta conserva la pantalla de introducción (pasos, iniciar sesión, crear cuenta) en una columna centrada con `AuthLayout` restilizado; no redirige.
- Con sesión: `PageHeader`; formulario en hoja de 2 columnas; estado de la solicitud como panel con `StatusStamp`; nota de revisión.
- Administrador de plataforma: cola de revisión como tabla con consultorio, correo, teléfono, dirección, estado y acciones aprobar/rechazar; motivo de rechazo en campo de texto; `Notice` de resultado.

### 11. Administración del consultorio

- **Shell común:** `AdminSectionNav` horizontal con Citas, Solicitudes, Perfil y servicios, Dentistas y horarios. `PageHeader` con el nombre del consultorio como kicker. Sin navegación numerada en tarjetas. `AdminShell` es un wrapper presentacional (`title`, `description`, `actions`, `clinicName?`, `children`); no hace guardia de rol ni fetching. Cada página conserva su guardia y sus datos; si no conoce el nombre del consultorio, el kicker es "Consultorio" y no se agrega una petición nueva al shell.
- **Perfil y servicios (`/consultorio/configuracion`):** formulario por secciones (información pública, ubicación, imagen, servicios). Servicios en tabla con checkbox "Ofrecido", precio editable y guardar por fila; alta de servicio en una fila de formulario. Sin sombras.
- **Dentistas y horarios (`/administrar-dentistas`):** tabs "Equipo" y "Horarios". Equipo: lista de filas con nombre, especialidad, cédula, estado y acciones; formulario en panel lateral o debajo. Horarios: dos columnas (jornada semanal, bloqueos) con reglas, inputs de hora y listas; sin tarjetas con sombra.
- **Citas agendadas (`/consultorio/citas`):** solo citas confirmadas, como hoy; filtros de fecha, sin filtro de estado ni búsqueda nueva. Pendientes y propuestas viven en Solicitudes. Tabla con paciente, servicio, dentista, fecha/hora, sello "Confirmada" y acciones. Móvil: filas apiladas.
- **Solicitudes (`/administrar-solicitudes`):** split view en escritorio: lista de solicitudes (paciente, servicio, fecha, folio, sello) y detalle. Detalle con contacto, datos de la cita, propuesta si existe, y acciones: confirmar (teal), proponer horario (outline + fecha + slots), rechazar (danger + motivo). Sin emojis; iconos SVG. Móvil: lista y detalle apilados con enlace "Volver a solicitudes".

### 12. Estados transversales

- **Carga:** skeletons con la forma del contenido; `role="status"` y texto sr-only.
- **Error:** `Notice` error, título, mensaje y reintento; nunca `alert()`.
- **Vacío:** `EmptyState` con la siguiente acción.
- **Éxito:** `Notice` success o panel de confirmación; `role="status"`.
- **Acceso restringido:** `Notice` error con enlace a iniciar sesión o al directorio.
- **Focus y teclado:** todos los flujos se pueden completar sin ratón; el foco vuelve al disparador al cerrar menús.

## Arquitectura y migración

### Estructura

```text
src/components/ui/Button.tsx          (actualizar)
src/components/ui/Field.tsx           (nuevo)
src/components/ui/Notice.tsx          (actualizar)
src/components/ui/StatusStamp.tsx     (nuevo)
src/components/ui/PageHeader.tsx      (nuevo)
src/components/ui/Section.tsx         (nuevo)
src/components/ui/EmptyState.tsx      (nuevo)
src/components/ui/Skeleton.tsx        (actualizar)
src/components/ui/icons.tsx           (nuevo)
src/components/ui/NavMenu.tsx         (nuevo)
src/components/layout/SiteHeader.tsx  (nuevo)
src/components/layout/SiteFooter.tsx  (nuevo)
src/components/layout/AdminShell.tsx  (nuevo)
src/components/ClinicCard.tsx         (actualizar)
src/components/ContentImage.tsx       (actualizar placeholder)
src/components/auth/AuthLayout.tsx    (actualizar; retirar el split-screen)
src/theme/ThemeToggle.tsx             (actualizar a los tokens nuevos)
src/components/FeedbackToast.tsx      (actualizar)
src/components/NetworkStatus.tsx      (actualizar)
src/routes/App.tsx                    (usar SiteHeader/SiteFooter)
src/styles.css                        (tokens + base; borrar @layer legacy al final)
```

### CSS

- Actualizar en `@theme`: `--radius-card: 0.75rem`, `--radius-panel: 0.625rem`, `--radius-control: 0.375rem`, `--radius-chip: 0.25rem`.
- Eliminar el uso de `shadow-sm/md` en contenido; conservar una sombra de overlay para menús y toasts.
- Migrar todas las páginas a utilidades Tailwind y componentes.
- Borrar `@layer legacy` completo cuando ninguna página use sus clases. Verificar con búsquedas de `panel`, `btn`, `premium-`, `management-`, `schedule-`, `auth-`, `alert`, `badge`, `request-`, `detail-`, `card-grid`, `clinic-card`, `site-header`, `site-footer`, `hero`, `search-bar`, `directory`, `dashboard-`.
- `styles.css` final conserva imports, `@theme`, variante dark, base global (body, headings, focus, scrollbar, skip-link, sr-only, reduced motion) y nada de componentes.
- `index.html`: conservar splash y `theme-init.js`; actualizar el wordmark y el fondo si hace falta; mantener `theme-color`.

### Datos y lógica

- No cambiar `services/api.ts`, `clinicApi.ts`, `appointments.ts`, `roles.ts`, `pagination.ts` ni los contratos.
- Reutilizar `format`/`money` existentes; centralizar el precio mínimo de la tarjeta en una función pura (`clinicFromPrice`) con prueba.

#### Precio en la tarjeta

El listado `GET /api/clinics` hoy devuelve `ClinicServiceSummaryDto(Id, Name)` sin `priceFrom`; el detalle sí lo devuelve. Se aprueba el cambio aditivo:

- En `DentalConnect-back/DentalConnect.Application/Contracts/ApplicationCore.cs`, `ClinicServiceSummaryDto` pasa a `(string Id, string Name, decimal PriceFrom)`.
- En `DentalConnect-back/DentalConnect.Infrastructure/Services/InfrastructureServices.cs`, la proyección del listado incluye `cs.PriceFrom`.
- En `DentalConnect-back/DentalConnect.Tests/ApiTests.cs`, la expectativa del resumen incluye el precio.
- En el frontend, `Service` ya declara `priceFrom`; `ClinicCard` calcula el mínimo de los servicios con precio válido y muestra "Desde $X". Si el campo no llega (API aún sin desplegar) o no hay precios, la línea se oculta.
- Prueba pura `clinicFromPrice` para mínimo, lista vacía y precios inválidos.

No se hacen peticiones N+1 ni se pide el detalle de cada tarjeta. El frontend puede desplegarse antes o después del backend sin romper la tarjeta: el precio aparece cuando el campo existe.
- `ContentImage` conserva la carga diferida y el respaldo; el respaldo visual pasa a iniciales y trama.
- Los filtros del directorio siguen en la URL; la paginación conserva `getPageItems`.
- El tema y el splash no cambian de comportamiento.

### Pruebas

- Actualizar aserciones de clase en `Button.test.tsx` y `ClinicListPage.test.tsx` si cambian las utilidades; no relajar aserciones de comportamiento.
- Agregar pruebas para: `Field` (label/error/`aria-describedby`), `StatusStamp` (etiquetas), `NavMenu` (abre, Escape, foco), `ClinicCard` (precio mínimo y ausencia de precio), `AdminSectionNav` (`aria-current`).
- Conservar las pruebas de flujo existentes: directorio, detalle, solicitud, propuesta, auth, admin.
- No probar colores o sombras; probar semántica y comportamiento.

## Fases

Cada fase es un PR independiente y deja la app compilando y con pruebas verdes.

1. **Fundaciones.** Tokens, radios, tipografía, `Button`, `Field`, `Notice`, `StatusStamp`, `PageHeader`, `Section`, `EmptyState`, iconos, `SiteHeader`, `SiteFooter`, `NavMenu`, `AdminShell`. Sin rediseñar páginas todavía. Pruebas de primitivas.
2. **Directorio.** Cambio aditivo de backend (`priceFrom` en el listado), `ClinicCard` aprobada con fallback si el campo no llega, búsqueda compacta, hero, resultados, paginación, estados. Pruebas de `clinicFromPrice`, tarjeta y directorio.
3. **Detalle y dentista.** `ClinicDetailPage`, `DentistProfilePage`; servicios y equipo en filas; rail sticky.
4. **Cita y paciente.** `AppointmentRequestPage`, `AppointmentProposalPage`, `PatientAppointmentsPage`, `NotificationsPage`.
5. **Auth y consultorio.** `AuthPages`, `ClinicApplicationPage`, `ClinicSettingsPage`.
6. **Administración.** `DentistManagementPage`, `ClinicAppointmentsPage`, `AppointmentManagementPage`; shell y navegación.
7. **Limpieza y verificación.** Borrar CSS legado y `ClinicLoginPage` (sin ruta activa); revisar modo oscuro, contraste, 360/390/768/1280; `grep` de emojis y clases legadas; pruebas, lint y build finales.

## Riesgos

- **Regresiones en administración.** Es la parte más compleja y con más estado. Mitigación: fases, pruebas de flujo y revisión manual de cada acción.
- **Borrado del CSS legado.** Puede dejar estilos huérfanos. Mitigación: borrar al final, después de migrar todas las páginas, y verificar con búsquedas.
- **Modo oscuro.** Los componentes nuevos deben usar tokens; se mide con `test:contrast` y se revisa visualmente.
- **Header con muchos enlaces.** El menú "Consultorio" y el disclosure móvil agregan estado y foco; se prueban con teclado.
- **Cambio aditivo de backend.** `priceFrom` en el listado requiere un PR en `DentalConnect-back` y coordinación de despliegue. El frontend muestra el precio solo si el campo llega; si no, lo oculta, así que puede desplegarse antes o después sin romper la tarjeta.
- **La tarjeta sigue siendo una cuadrícula.** Es una decisión del usuario; el riesgo de volver a parecer plantilla se controla con la jerarquía, la ausencia de sombras y la densidad de la información.
- **Imágenes variables.** El placeholder de iniciales evita fotos rotas y mantiene la dignidad de la tarjeta.
- **Pruebas que fijan clases.** Se actualizan de forma deliberada; no se eliminan aserciones de comportamiento.

## Verificación

- `npm run test`, `npm run lint`, `npm run build`, `npm run test:contrast`.
- Recorrido manual con el servidor de desarrollo en 360, 390, 768 y 1280 px, en claro y oscuro.
- Teclado: menú, tema, búsqueda, filtros, tarjetas, formularios, slots, acciones de administración.
- `prefers-reduced-motion`: sin transiciones ni animaciones decorativas.
- Búsquedas de control: sin emojis de interfaz; sin clases legadas en páginas; sin `shadow-` en tarjetas/paneles; sin `bg-gradient` en el directorio.
- Cada pantalla con carga, error, vacío y éxito cuando aplique.

## Decisiones tomadas y pendientes

**Tomadas:**

- Tarjetas solo para los resultados del directorio; tablas, filas y secciones para el resto.
- Sin split-screen en auth.
- Navegación de administración horizontal con `AdminSectionNav`, no sidebar.
- Coral para acciones de cita; teal para acciones primarias de navegación y búsqueda.
- Precio "Desde" en la tarjeta, calculado del mínimo de servicios; se oculta si no hay precio válido. Se aprueba el cambio aditivo de backend (`priceFrom` en el resumen del listado) y el frontend tolera que el campo aún no llegue.
- Header con menú "Consultorio" para roles de clínica y disclosure en móvil.
- Citas agendadas se queda confirmada-solo; las solicitudes pendientes/propuestas viven en Solicitudes.
- `Button` `sm` y `md` comparten 44 px de alto; `sm` reduce padding horizontal, no el objetivo táctil.
- Sin sesión, `/registrar-consultorio` conserva su pantalla de introducción en una columna; no redirige.
- `ClinicLoginPage` se elimina: no tiene ruta activa (la ruta `/consultorio/iniciar-sesion` redirige a `/iniciar-sesion`) y solo su propia prueba lo usa; la prueba se retira con la página.

**Para el builder:**

- API exacta de `Field` y `Table` (composición vs props), organización de utilidades de tabla y nombres de helpers.
- Cómo dividir el formulario de solicitud en secciones sin duplicar estado.
- Estrategia de pruebas de `NavMenu` y `AdminShell`.
- Orden de borrado de reglas legadas dentro de la fase 7.
