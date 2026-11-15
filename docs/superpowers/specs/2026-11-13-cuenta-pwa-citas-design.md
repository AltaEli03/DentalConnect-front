# Cuenta, PWA, tema y citas — diseño

**Fecha:** 13 de noviembre de 2026
**Estado:** aprobado por el usuario
**Repos:** `DentalConnect-front` + `DentalConnect-back`

## Intención

Cerrar la experiencia de cuenta y seguimiento: formularios de acceso claros y accesibles, app instalable, tema claro/oscuro/sistema en toda la interfaz, acceso diferenciado para consultorios y una vista de citas para paciente y consultorio.

## Objetivos

- Login y registro con requisitos de contraseña visibles, mostrar/ocultar y teléfono accesible.
- PWA instalable con shell offline y caché solo de datos públicos.
- Tema claro/oscuro/sistema persistente, sin flash, en toda la app.
- Login de consultorio con validación de rol y redirección a sus citas.
- `/mis-citas` para paciente y `/consultorio/citas` para consultorio.
- Endpoint de back para que el paciente consulte sus propias citas.

## No objetivos

- Recuperación de contraseña, MFA o passkeys.
- Notificaciones push, pagos, reseñas o mapas.
- Escritura offline o caché de citas/auth.
- Rediseño visual ajeno al tema.

## Antiobjetivos

- Modo oscuro parcial que se rompa al entrar a admin.
- Service worker que cachee datos privados.
- Login de consultorio que acepte cuentas de paciente.
- Listado de citas basado solo en `localStorage`.

## Restricciones

- React 19, Vite 6, Tailwind 4.3.5, Vitest 4.
- Back .NET 10; sin SDK local inicialmente, se instala o se valida en CI.
- No agregar una librería de iconos: SVG inline.
- Mantener la arquitectura híbrida Tailwind + CSS legado.

## Enfoques

1. **PWA con `vite-plugin-pwa`** (elegido) frente a service worker manual: el plugin genera manifest, precaché y actualización; menos código y menos errores.
2. **Tema por tokens semánticos** (elegido) frente a `dark:` en cada clase: un solo cambio de variables cubre Tailwind y CSS legado.
3. **Endpoint de citas del paciente** (elegido) frente a guardar citas en el navegador: el servidor es la fuente de verdad y ve cambios del consultorio.
4. **Login de consultorio dedicado** (elegido) frente a redirigir el login genérico: separa mensajes, valida rol y evita que un paciente entre al panel.

## Decisiones

- Back: `GET /api/appointments/mine` autenticado por `sub`, devuelve solo las citas del paciente con consultorio, dentista y servicio.
- Consultorio: `/consultorio/citas` usa `GET /api/appointments` existente; la bandeja actual queda para pendientes.
- Login de consultorio: `/consultorio/iniciar-sesion`; `CognitoProfile` gana `clinicId` desde los claims `clinic_id`/`custom:clinic_id`. Rol esperado `CLINIC_ADMIN`.
- Tema: `.dark` en `<html>`, tokens semánticos, `localStorage` y `matchMedia`.
- PWA: precaché del shell; `NetworkFirst` solo para `/api/clinics`; `NetworkOnly` para `/api/appointments` y `/api/auth`; `CacheFirst` para imágenes.
- Iconos PWA generados desde un SVG cuadrado de marca.

## Riesgos

- Superficie grande del CSS legado: se reemplazan colores literales por variables y se mide contraste en ambos temas.
- Back sin SDK local: se instala .NET 10 o se valida en CI; las pruebas de Postgres pueden omitirse sin base.
- Caché del service worker: se excluyen endpoints privados y se usa `autoUpdate`.
- Claims de rol/consultorio pueden faltar: mensajes claros y validación del back como autoridad.

## Verificación

- Front: lint, 59+ tests, build, artefactos PWA (`manifest.webmanifest`, `sw.js`, iconos), contraste oscuro.
- Back: `dotnet test` (o CI) con pruebas de 401, aislamiento, orden y contrato.
- Manual: login/registro en escritorio y móvil, toggle de tema, instalación PWA, navegación de citas de ambos roles.
