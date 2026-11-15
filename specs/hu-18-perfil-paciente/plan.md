# Plan · HU-18 Perfil del paciente (DENT-18)

1. Leer DENT-18 y confirmar el flujo de autenticación existente (Cognito, `AuthContext` y `/mi-cuenta`).
2. Completar lectura de atributos Cognito del usuario actual y agregar actualización limitada a nombre, apellidos y teléfono.
3. Añadir formulario de contacto accesible en “Mi cuenta”, validación de 10–15 dígitos, correo de solo lectura y retroalimentación de carga/éxito/error.
4. Cubrir guardado y validaciones con Vitest; ejecutar suite, lint y build.
5. Subir la rama y abrir PR contra `develop`; esperar CI antes de promover por `release` a `main`.

## Guardarraíles

- No aceptar identificador de usuario, correo, rol ni estado desde el formulario.
- No actualizar el contexto ni mostrar éxito antes de que Cognito acepte la operación.
- No registrar teléfono ni tokens en logs.
- No cambiar la configuración de Cognito ni hacer llamadas administrativas desde frontend.
