# Evidencia de aceptación: accesibilidad, PWA y recorridos públicos

## Alcance y entorno

- Fecha de revisión: 20 de noviembre de 2026.
- Frontend publicado: <https://main.d63zai2tg2i2u.amplifyapp.com/clinics/>
- API publicada: <https://d3eod9k2xa8i16.cloudfront.net/api/health>
- API health esperado y observado: HTTP 200, `{"status":"ok","service":"DentalConnect API"}`.
- El catálogo de demostración contiene perfiles ficticios y datos de contacto reservados para pruebas (`.invalid`). No representa negocios reales.

## Recorridos comprobados en producción

| Recorrido | Resultado |
| --- | --- |
| Catálogo de clínicas | La página abre desde Amplify y consulta el catálogo del API. Muestra 2,006 perfiles de demostración y pagina seis por vista. |
| Búsqueda por zona y servicio | `Atotonilco de Tula` + `Ortodoncia` devolvió 21 coincidencias; los filtros permiten modificar la búsqueda. |
| Detalle y dentistas | El detalle público abrió correctamente y mostró sus servicios y dentistas asociados. Los perfiles de la semilla son ficticios. |
| Disponibilidad pública | Al elegir servicio y dentista se consultaron intervalos válidos de duración completa; en la revisión se observaron 10:30–12:00 y 15:00–16:30 para un servicio de 90 minutos. |
| Móvil | Viewport de 360 px: `document.documentElement.scrollWidth` fue 352 px, sin desbordamiento horizontal. Captura en `screenshots/busqueda-zona-servicio-360.png`. |
| PWA sin conexión | Con el navegador en modo offline, el shell y el catálogo previamente almacenado siguieron disponibles con aviso de desconexión. Captura en `screenshots/catalogo-offline-360.png`. |
| Política de caché | Se inspeccionó Cache Storage: solo se guardan recursos del shell y GET públicos de clínicas, detalles y disponibilidad. No había respuestas de autenticación, perfil, citas ni notificaciones en caché. |

## Accesibilidad y calidad automatizada

El workflow [Frontend CI](https://github.com/AltaEli03/DentalConnect-front/actions/runs/44762934720) del commit `3a7ee003b0b642fb68d29d0ff70cb5ae34784f7a` terminó correctamente el 20-Nov-2026:

- ESLint: aprobado.
- Vitest: **104 pruebas aprobadas en 25 archivos**.
- Contraste: **32 pares aprobados** en temas claro y oscuro.
- Build de producción: aprobado.
- CodeQL: [análisis aprobado](https://github.com/AltaEli03/DentalConnect-front/actions/runs/44762934632); consulta de alertas abiertas al momento de esta revisión: **0**.

Pruebas backend relacionadas con permisos, propiedad de recursos y citas: [xUnit/PostgreSQL](https://github.com/AltaEli03/DentalConnect-back/actions/runs/44756928322), **95 aprobadas, 0 fallidas**. El análisis CodeQL del backend terminó correctamente y no tenía alertas abiertas al revisar.

## Evidencias visuales

- `screenshots/busqueda-zona-servicio-360.png`: búsqueda por zona y servicio en móvil.
- `screenshots/catalogo-offline-360.png`: catálogo accesible tras cargar y cambiar a modo sin conexión.
- `screenshots/catalogo-movil-390.png`: evidencia móvil previa a 390 px.

## Pendiente para declarar aceptación manual completa

- No se ejecutó el flujo de registro/inicio de sesión/edición de perfil con una cuenta real en la sesión de navegador disponible. Las pruebas automatizadas cubren validaciones y acceso por rol, pero no sustituyen ese recorrido autenticado en producción.
- Falta el ensayo completo de paciente y administrador de consultorio: crear solicitud, verificar bandejas/agenda, cambiar estados y demostrar que otra cuenta no puede leer/modificar recursos ajenos.
- Falta la revisión con lector de pantalla real y completar todos los controles por teclado en los recorridos autenticados.
- Las pruebas de base de datos aplican, revierten y reaplican migraciones en PostgreSQL efímero de CI; no equivalen a restaurar una copia de seguridad de RDS.

No se marcan estas pruebas manuales como aprobadas hasta ejecutarlas y guardar evidencia sin credenciales ni datos personales.
