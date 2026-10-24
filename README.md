# DentalConnect Frontend

Aplicación React + TypeScript del Sprint 1. Muestra el directorio de clínicas y sus detalles consumiendo exclusivamente la API pública de DentalConnect.

## Desarrollo

```bash
cp .env.example .env
npm ci
npm run dev
```

`VITE_API_BASE_URL` se configura en el entorno de compilación. En desarrollo puede omitirse y se usa `http://localhost:3000/api`; en producción es obligatoria y no hay URL de API hardcodeada. Debe apuntar a la salida HTTPS `api_base_url` del Terraform del backend. Solo contiene una URL pública; nunca pongas contraseñas ni claves en variables `VITE_*`, porque quedan expuestas al navegador.

Calidad: `npm run lint`, `npm test` y `npm run build`.

## Administración de servicios

La ruta `/administrar-servicios` permite a una cuenta con grupo `CLINIC_ADMIN` y claim `custom:clinicId` listar, crear, editar y activar/desactivar los servicios de su consultorio. Los servicios inactivos se conservan y dejan de mostrarse en la ficha pública.

Requiere que la API incluya los endpoints de servicios del consultorio (rama `sprint-3-Eliuht` del repositorio del backend).

## AWS y despliegue continuo

Al hacer push a `main`, el workflow `deploy-amplify.yml` compila y publica automáticamente en AWS Amplify, y espera a que la publicación termine antes de marcarla como exitosa. Configura las variables `AMPLIFY_APP_ID`, `AWS_ROLE_ARN` y `VITE_API_BASE_URL` en **Settings → Secrets and variables → Actions → Variables** del repositorio. `VITE_API_BASE_URL` debe ser HTTPS y se toma de la infraestructura del backend; si falta, el workflow falla en vez de compilar una aplicación que apunte a una API incorrecta.

El workflow usa OIDC y credenciales temporales de AWS. `infra/` también conserva la configuración histórica de S3 privado y CloudFront; el sitio actual se publica mediante Amplify.
