# DentalConnect-front
Aplicación Web Progresiva para localizar y contactar clínicas - Repositorio dedicado al Frontend

## Demostración de despliegue continuo

Este ejemplo es una página estática en HTML y CSS. No implementa todavía una PWA,
un directorio de clínicas, autenticación, una API ni una base de datos.

**Integrantes:** Emanuel Cruz Cruz y Eliuth Altamirano Granados.

### Archivos

- `public/index.html`: página de demostración.
- `.github/workflows/deploy-aws.yml`: despliegue automático al recibir un push en `main`.
- `scripts/deploy.py`: empaqueta el sitio, publica en Amplify y verifica el HTML y el commit por HTTPS.
- `.gitignore`: exclusiones para credenciales y archivos locales.

### Despliegue automático en AWS

1. Un push a `main` activa el flujo `Deploy DentalConnect to AWS` de GitHub Actions.
2. GitHub obtiene credenciales temporales mediante OIDC. La confianza de AWS está limitada a este repositorio y rama.
3. El flujo empaqueta únicamente `public/` y agrega `deployment.json` con el SHA del commit.
4. La API de Amplify recibe el paquete y publica en la rama de alojamiento `main`.
5. El flujo espera el resultado y comprueba que la URL entregue el commit y HTML esperados.

Variables de GitHub Actions: `AMPLIFY_APP_ID` y `AWS_ROLE_ARN`.
Son identificadores de recursos, no contraseñas ni claves de acceso.

Sitio: https://main.d63zai2tg2i2u.amplifyapp.com

Amplify utiliza una aplicación sin conexión Git nativa; el disparador automático
reside en GitHub Actions. No hay que cargar ZIP ni pulsar desplegar en cada cambio.
Las ejecuciones se revisan en la pestaña Actions de este repositorio.

### Secretos

Este HTML no requiere credenciales ni cadenas de conexión.
No colocar secretos en HTML, JavaScript ni en `public/`: todo su contenido será público.
El flujo utiliza OIDC sin claves de AWS de larga duración. Las credenciales temporales
solo están disponibles en el entorno del job. La URL firmada de carga se enmascara en los logs.
Si se incorpora un backend, sus secretos deberán permanecer en el servicio de ejecución
o en un gestor de secretos; nunca se deben enviar al navegador.

### Vista local

Abrir `public/index.html` en un navegador. No se necesita instalar dependencias.
