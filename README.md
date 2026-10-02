# DentalConnect-front
Aplicación Web Progresiva para localizar y contactar clínicas - Repositorio dedicado al Frontend

## Demostración de despliegue continuo

Este ejemplo es una página estática en HTML y CSS. No implementa todavía una PWA,
un directorio de clínicas, autenticación, una API ni una base de datos.

**Integrantes:** Emanuel Cruz Cruz y Eliuth Altamirano Granados.

### Archivos

- `public/index.html`: página de demostración.
- `amplify.yml`: configuración de compilación y publicación en AWS Amplify Hosting.
- `.gitignore`: exclusiones para credenciales y archivos locales.

### Configuración prevista en AWS

1. Conectar este repositorio con AWS Amplify Hosting.
2. Seleccionar la rama `main` y mantener activadas las compilaciones automáticas.
3. Utilizar `amplify.yml`: se verifica el HTML y se publica únicamente `public/`.
4. Esperar el primer despliegue exitoso y abrir la URL HTTPS de Amplify.
5. Cambiar el texto visible de la versión, hacer commit y push a `main`.
6. Comprobar que Amplify inicia otra ejecución y que aparece el cambio en la URL.

La existencia de este archivo no configura por sí sola la conexión con AWS.
La conexión y las ejecuciones deben comprobarse en la consola de Amplify.

### Secretos

Este ejemplo no requiere credenciales, cadenas de conexión ni variables de entorno.
No colocar secretos en HTML, JavaScript ni en `public/`: todo su contenido será público.
La integración de GitHub se configura en AWS, sin guardar tokens en este repositorio.
Si se incorpora un backend, sus secretos deberán permanecer en el servicio de ejecución
o en un gestor de secretos; nunca se deben enviar al navegador.

### Vista local

Abrir `public/index.html` en un navegador. No se necesita instalar dependencias.
