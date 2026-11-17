# HU-18 · Actualizar mis datos de contacto

**Jira:** [DENT-18](https://uttt-proyecto.atlassian.net/browse/DENT-18)  
**Responsable:** Emanuel Cruz  
**Rama:** `feature/DENT-18-perfil-paciente`  
**Corte:** Sprint 07

## Objetivo

Permitir que el paciente autenticado consulte y actualice su nombre, apellidos y teléfono desde “Mi cuenta”. El correo permanece visible y no editable.

## Requisitos

- Solo el paciente que inició sesión puede actualizar los atributos de su propia cuenta.
- Nombre y apellidos son obligatorios; teléfono debe contener entre 10 y 15 dígitos.
- El correo, rol, estado y verificación no se envían como atributos editables.
- Los cambios se persisten en Amazon Cognito mediante la sesión del usuario; la interfaz actualiza el contexto solo después de que Cognito confirma el guardado.
- Mostrar estado de guardado, error y validación accesibles. En caso de error del proveedor, conservar el formulario sin anunciar éxito.

## Contrato y límites

- No se agrega endpoint ni se cambia la base de datos: los datos de autenticación y contacto del paciente se mantienen en Cognito, fuente de verdad ya usada por HU-03.
- La operación usa únicamente `given_name`, `family_name` y `phone_number` con el access token del usuario actual.
- No se expone edición para cuentas de consultorio.
- El teléfono sin prefijo se normaliza al formato mexicano `+52`; el prefijo explícito se conserva.

## Verificación

- Pruebas Vitest: guardado válido, correo de solo lectura y rechazo de teléfono inválido.
- Suite frontend, build, lint y revisión manual con cuenta paciente verificada en el ambiente publicado.
- La integración real requiere que el app client de Cognito permita actualizar `given_name`, `family_name` y `phone_number`; un rechazo del proveedor se presenta como error y no se oculta.
