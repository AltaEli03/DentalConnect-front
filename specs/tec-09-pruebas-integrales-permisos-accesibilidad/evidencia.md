# TEC-09: pruebas integrales de permisos y accesibilidad

## Automatización

El workflow `Frontend CI` ejecuta en cada pull request y al publicar en `main`, `develop` o `release`:

1. ESLint (`npm run lint`).
2. Pruebas unitarias de interfaz (`npm test`).
3. Verificación de contraste de colores (`npm run test:contrast`).
4. Compilación de producción (`npm run build`).

El análisis de permisos de negocio vive en las pruebas de integración del backend ASP.NET Core/PostgreSQL, que corren en su workflow con base PostgreSQL efímera. Las suites incluyen aislamiento por rol/consultorio, propiedad de solicitudes y notificaciones, y transiciones de citas. Revisar `DentalConnect.Tests/AppointmentProposalApiTests.cs`, `DentalConnect.Tests/NotificationApiTests.cs` y `DentalConnect.Tests/AppointmentApiTests.cs` en el repositorio backend.

## Evidencia automatizada

- Vitest: 91 pruebas aprobadas en 23 archivos.
- ESLint: sin errores.
- Contraste: 23 pares de texto/fondo evaluados en temas claro y oscuro; aprobados.
- Build: compilación TypeScript/Vite y generación de manifest, service worker y rutas estáticas completadas.

La ejecución en GitHub Actions del PR #25 aprobó `verify`, CodeQL y GitGuardian y quedó integrada en `develop` mediante el commit `a83593dd150c266d8ae75001950514b0b6737f67`.

## Revisión manual del despliegue público (15-Nov-2026)

- URL: https://main.d63zai2tg2i2u.amplifyapp.com/clinics/
- El catálogo cargó seis consultorios desde el API.
- La búsqueda “Tula de Allende” mostró tres consultorios ficticios de prueba.
- El detalle del consultorio de prueba y el perfil de su dentista abrieron correctamente.
- La consulta de disponibilidad para el 17-Nov-2026 devolvió HTTP 200, zona `America/Mexico_City` y 14 intervalos de 30 minutos sin solaparse; una fecha pasada devolvió HTTP 400.
- Con Tab se enfocó “Saltar al contenido principal”; Enter actualizó el fragmento y enfocó `main-content`.
- La vista de accesibilidad expone banner, navegación, main y footer, con nombres para el campo de búsqueda, servicio y acciones.
- A 390 × 844 CSS px, `documentElement.scrollWidth` fue igual a `innerWidth` (390 px): no hubo desbordamiento horizontal. Se guardó una captura en `screenshots/catalogo-movil-390.png`.
- El manifest está disponible y el navegador tenía un service worker activo y controlando la página.

## Aceptación manual pendiente

- Completar recorrido de todos los controles con Tab, Shift+Tab, Enter y Espacio, incluyendo filtros y paginación; la evidencia actual solo cubre el enlace de salto.
- Revisar anuncios de error/éxito y orden de encabezados con lector de pantalla real.
- Iniciar con cuentas de paciente y consultorio de prueba y comprobar acceso cruzado denegado en el sitio desplegado.
- Completar capturas y operación a 360 px, 768 px y escritorio, incluyendo zoom al 200 %.

No cerrar TEC-09 hasta completar estos puntos y registrar URL, fecha, cuentas ficticias utilizadas y resultado, sin publicar datos de acceso.
