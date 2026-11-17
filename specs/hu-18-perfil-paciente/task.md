# Tareas · HU-18 Actualizar mis datos de contacto

**Spec:** `spec.md`  
**Plan:** `plan.md`  
**Jira:** [DENT-18](https://uttt-proyecto.atlassian.net/browse/DENT-18)  
**Responsable Jira:** Emanuel Cruz  
**Rama:** `feature/DENT-18-perfil-paciente` (desde `origin/develop`)

## Checklist

- [x] Contrato Cognito limitado a nombre, apellidos y teléfono; lectura de datos actuales.
- [x] Formulario accesible, correo de solo lectura y respuesta de carga/éxito/error.
- [x] Pruebas de guardado y validación del teléfono.
- [x] `npm test`: 91 aprobadas; `npm run lint`: sin errores; `npm run build`: producción y PWA generadas.
- [ ] Abrir PR contra `develop` y validar CI.
- [ ] Probar actualización real con cuenta paciente en AWS; corroborar persistencia tras iniciar sesión de nuevo.
- [ ] Promover con PR `develop` → `release` → `main`; actualizar Jira solo con evidencia de cada etapa.

## Riesgo pendiente de ambiente

La prueba automatizada simula Cognito. La confirmación de actualización real depende de que los atributos estándar `given_name`, `family_name` y `phone_number` estén configurados como mutables en el User Pool y permitidos para el app client.
