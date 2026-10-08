# DentalConnect Frontend

Aplicación React + TypeScript del Sprint 1. Muestra el directorio de clínicas y sus detalles consumiendo exclusivamente la API pública de DentalConnect.

## Desarrollo

```bash
cp .env.example .env
npm ci
npm run dev
```

`VITE_API_BASE_URL` se configura en el entorno de compilación. Solo contiene la URL pública de la API; nunca se colocan contraseñas ni claves en variables `VITE_*`, porque quedan expuestas al navegador.

Calidad: `npm run lint`, `npm test` y `npm run build`.

## AWS y despliegue continuo

`infra/` define S3 privado con CloudFront y Origin Access Control. Antes de aplicar Terraform, ejecuta `terraform init`, `terraform plan` y `terraform apply` en una cuenta AWS autorizada. El estado de Terraform está excluido de Git.

Al hacer push a `sprint-1-Emanuel`, el workflow `deploy-s3-cloudfront.yml` compila y publica automáticamente. Se habilita únicamente cuando las variables del repositorio `AWS_DEPLOY_ROLE_ARN`, `AWS_S3_BUCKET`, `AWS_CLOUDFRONT_DISTRIBUTION_ID` y `VITE_API_BASE_URL` estén configuradas. Usa OIDC con credenciales temporales y después invalida CloudFront.
