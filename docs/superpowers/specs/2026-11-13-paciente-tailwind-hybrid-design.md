# Experiencia del paciente: diseño híbrido Tailwind + CSS legado

**Fecha:** 13 de noviembre de 2026
**Estado:** aprobado por el usuario
**Alcance:** frontend `DentalConnect-front`

## Intención

Que una persona pueda encontrar un consultorio y enviar una solicitud de cita sin llamadas, sin perder lo que ya eligió y sabiendo siempre qué sigue. La app debe verse moderna y consistente con la identidad dental del proyecto, sin reescribir las pantallas administrativas que ya funcionan.

## Objetivos

- Recorrido del paciente completo: directorio, ficha del consultorio, perfil del dentista, solicitud y respuesta a propuesta.
- Estados explícitos: carga, vacío, error con reintento, envío y éxito.
- Accesibilidad WCAG 2.2 AA: teclado, foco visible, etiquetas, HTML semántico, contraste y mensajes comprensibles.
- Responsive real en 360, 768 y 1280 px.
- Consistencia visual entre las pantallas migradas y el resto de la app.

## No objetivos

- PWA instalable, manifest o service worker.
- Cambios de contrato con la API.
- Pagos, reseñas, mapas o modo oscuro.
- Reescribir los flujos administrativos; solo se conservan y se completan sus estilos.

## Antiobjetivos

- Cuadrícula de tarjetas idénticas como único patrón visual.
- Iconos emoji como lenguaje de interfaz.
- Errores ocultos en `alert()` o toasts.
- Datos inventados (por ejemplo, calificaciones que la API no devuelve).
- Animaciones decorativas o movimiento sin `prefers-reduced-motion`.

## Restricciones

- React 19, Vite 6, TypeScript, Vitest y CSS existente.
- El back no requiere cambios para este alcance.
- La identidad visual vigente se conserva: teal profundo `#003B4A`, aqua `#007C83`, coral `#B6412C`, fondos perla y tipografía Outfit/Inter.
- Tailwind se usa solo en las pantallas del paciente. El CSS legado se conserva para administración y auth.

## Enfoques considerados

1. **Base de diseño propia + flujo del paciente.** Menor riesgo, pero el repo ya tenía un rediseño CSS avanzado.
2. **Tailwind para toda la app.** Sistema uniforme, pero descarta el rediseño reciente y reescribe ocho pantallas.
3. **Híbrido (elegido).** Conservar la rama `Emanuel/diseno-accesible`, migrar a Tailwind solo el recorrido del paciente y completar el CSS legado donde haga falta.

El híbrido se eligió porque el repositorio ya contenía un rediseño CSS y una rama de accesibilidad; reemplazarlos habría sido trabajo perdido. La deuda aceptada es que conviven dos sistemas de estilos, delimitados por capas CSS.

## Dirección visual

- **Paleta:** la del proyecto, no una nueva. Contraste medido: `#003B4A` sobre blanco 12.18:1, `#007C83` 4.99:1, blanco sobre `#B6412C` 5.55:1, `#425466` 7.80:1.
- **Tipografía:** Outfit para títulos, Inter para cuerpo, autoalojadas con Fontsource.
- **Layout:** búsqueda como primer objeto; resultados en lista editorial con hairlines; ficha con rail de solicitud; solicitud con stepper y resumen fijo.
- **Movimiento:** una entrada en el hero y transiciones de estado; nada más.

## Arquitectura

- `styles.css` declara el orden `theme, base, legacy, utilities`; Tailwind ocupa tema, preflight y utilidades; todo el CSS existente se envuelve en `@layer legacy` para que las utilidades del paciente ganen sin romper administración.
- `src/components/ui/` concentra botón, aviso, badge de estado, skeleton y la imagen con respaldo.
- `src/lib/appointments.ts` concentra zona horaria, formatos y etiquetas de estado.
- Las pantallas del paciente se reescriben con utilidades Tailwind y los componentes compartidos.
- Los filtros del directorio viven en la URL para conservar la búsqueda al ir y volver.

## Riesgos

- Convivencia de capas CSS: se verifica con build y revisión visual de administración.
- Fuentes autoalojadas: subsets latinos y `font-display: swap`.
- Tests existentes desactualizados: se actualizan al UI final, sin relajar aserciones de comportamiento.
