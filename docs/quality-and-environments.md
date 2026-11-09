# Calidad y configuración de ambientes del frontend

## Stack y configuración API

DentalConnect usa React, TypeScript y Vite. La URL del API se lee de VITE_API_BASE_URL desde la configuración Vite y se resuelve centralmente en src/services/api.ts; componentes y servicios de dominio no deben construir URLs ni fijar el host del backend. Vite carga archivos .env por modo y las variables VITE_* forman parte del bundle público, por lo que nunca deben contener contraseñas, tokens privados ni secretos.

| Ambiente | Configuración | Comportamiento |
| --- | --- | --- |
| Development | .env.development.local, ignorado por Git; VITE_API_BASE_URL apunta al backend de desarrollo | Vite en modo desarrollo |
| Test | Vitest con mocks y configuración de prueba | Las pruebas no llaman a un backend productivo |
| Production | VITE_API_BASE_URL configurada como variable de ambiente de GitHub Actions/Amplify | El bundle apunta a la URL del API desplegado; el código fuente no cambia |

.env.example sirve de plantilla y contiene solo nombres y valores demostrativos. En Amplify, configurar la variable de producción en la configuración de build; en los workflows de GitHub, usar Variables para URL pública y Secrets solo para credenciales privadas requeridas por CI. Las variables VITE_* no son secretas después de compilarse.

## Calidad automatizada

ESLint verifica reglas y patrones de calidad del código TypeScript/React; Vitest ejecuta las pruebas del frontend. El workflow .github/workflows/ci.yml integra lint, pruebas y build con GitHub Actions. El análisis estático de seguridad se realiza con GitHub CodeQL usando consultas security-extended para javascript-typescript; .github/workflows/codeql.yml lo ejecuta al subir cambios a main o Sprint-7-Emanuel, en PR hacia main y semanalmente. Los hallazgos se publican como SARIF en Security / Code scanning y se conserva el artefacto codeql-frontend-sarif durante 90 días.

Registra en cada run el estado de lint, pruebas, build y el conteo real de alertas CodeQL por severidad. No se deben reportar porcentajes o cero alertas antes de observar el resultado del run. El primer escaneo es la línea base y los runs posteriores permiten evaluar las mejoras.

## Comandos de verificación

Desde el repositorio, instala dependencias con npm ci y ejecuta npm run lint, npm run test y npm run build. CI debe completar los tres pasos antes de integrar. Para revisar el ambiente de producción, verifica el valor de VITE_API_BASE_URL en la configuración de Amplify sin mostrar secretos en capturas.

## Evidencias

- Resultado de lint, Vitest y build: ejecución del workflow ci.yml en GitHub Actions.
- Alertas estáticas: CodeQL en Security / Code scanning y artefacto codeql-frontend-sarif.
- URL de API usada en producción: variable VITE_API_BASE_URL en la configuración del ambiente de Amplify/GitHub Actions.

