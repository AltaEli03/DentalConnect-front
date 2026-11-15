# TEC-09: pruebas integrales de permisos y accesibilidad

## Automatización

El workflow `Frontend CI` ejecuta en cada pull request y al publicar en `main`, `develop` o `release`:

1. ESLint (`npm run lint`).
2. Pruebas unitarias de interfaz (`npm test`).
3. Verificación de contraste de colores (`npm run test:contrast`).
4. Compilación de producción (`npm run build`).

El análisis de permisos de negocio vive en las pruebas de integración del backend ASP.NET Core/PostgreSQL, que corren en su workflow con base PostgreSQL efímera. Las suites incluyen aislamiento por rol/consultorio, propiedad de solicitudes y notificaciones, y transiciones de citas. Revisar `DentalConnect.Tests/AppointmentProposalApiTests.cs`, `DentalConnect.Tests/NotificationApiTests.cs` y `DentalConnect.Tests/AppointmentApiTests.cs` en el repositorio backend.

## Evidencia local de la rama

- Vitest: 91 pruebas aprobadas en 23 archivos.
- ESLint: sin errores.
- Contraste: 23 pares de texto/fondo evaluados en temas claro y oscuro; aprobados.
- Build: compilación TypeScript/Vite y generación de manifest, service worker y rutas estáticas completadas.

La ejecución en GitHub Actions del pull request de esta rama es la evidencia reproducible de integración; registrar aquí su enlace y SHA al abrir el PR.

## Revisión manual de aceptación pendiente

La automatización de DOM y contraste no reemplaza una revisión con lector de pantalla ni una prueba física en móvil. Antes de cerrar TEC-09, comprobar en el sitio publicado:

- Recorrer navegación, formularios, filtros y paginación solo con Tab, Shift+Tab, Enter y Espacio; verificar foco visible y enlace “Saltar al contenido principal”.
- Comprobar nombres accesibles de controles, anuncios de errores/éxito y orden de encabezados con lector de pantalla.
- Probar el flujo paciente y el flujo de consultorio con cuentas de roles distintos; verificar que cada rol no pueda consultar ni modificar datos ajenos.
- Revisar presentación y operación a 360 px, 768 px y escritorio, incluyendo zoom de 200 %.

No marcar la revisión manual como completada hasta adjuntar fecha, URL de despliegue y resultado de cada punto.
