# Backend en Render

Este documento cubre la opcion de desplegar el backend NestJS en Render cuando el plan de Hostinger no permite ejecutar Node.js.

## Arquitectura recomendada

```txt
boletas.tudominio.com      -> frontend estatico en Hostinger
api.boletas.tudominio.com  -> backend NestJS en Render
```

El frontend debe apuntar al backend con:

```txt
PUBLIC_API_BASE_URL=https://api.boletas.tudominio.com/api
```

El backend debe aceptar el origen del frontend con:

```txt
CORS_ORIGIN=https://boletas.tudominio.com
```

## Por que usar Render

Render permite crear Web Services con Node.js desde GitHub. Cada servicio recibe una URL `onrender.com`, puede tener dominios personalizados, y se despliega automaticamente cuando haces push a la rama configurada.

## Configuracion incluida

El archivo `render.yaml` define un servicio:

```txt
name: boletas-api
runtime: node
plan: free
branch: main
buildCommand: corepack enable && pnpm install --frozen-lockfile && pnpm build
startCommand: pnpm start
healthCheckPath: /api/health
```

Tambien define variables base:

```txt
NODE_ENV=production
NODE_VERSION=24.14.1
WEB_DIST_PATH=apps/web/dist
PUBLIC_API_BASE_URL=/api
CORS_ORIGIN=se pide en Render porque depende del dominio real
```

## Crear el servicio desde Render

1. Entrar a Render.
2. Ir a `New`.
3. Elegir `Blueprint`.
4. Conectar el repositorio `dger804/boletas`.
5. Seleccionar la rama `main`.
6. Render detectara `render.yaml`.
7. Cuando pida `CORS_ORIGIN`, ingresar el dominio del frontend:

```txt
https://boletas.tudominio.com
```

8. Crear el servicio.
9. Esperar el build.
10. Verificar:

```txt
https://boletas-api.onrender.com/api/health
```

El subdominio exacto `onrender.com` lo muestra Render despues de crear el servicio.

## Conectar dominio personalizado

Cuando el servicio funcione con la URL de Render:

1. Abrir el servicio `boletas-api`.
2. Ir a `Settings`.
3. Abrir `Custom Domains`.
4. Agregar:

```txt
api.boletas.tudominio.com
```

5. Render mostrara los registros DNS requeridos.
6. En Hostinger, crear el registro `CNAME` indicado por Render.
7. Esperar validacion SSL.
8. Probar:

```txt
https://api.boletas.tudominio.com/api/health
```

## Configurar el frontend en Hostinger

Si Hostinger solo despliega el frontend estatico, debe usar:

```txt
PUBLIC_API_BASE_URL=https://api.boletas.tudominio.com/api
```

Y el build de Astro debe publicarse desde:

```txt
apps/web/dist
```

## Limitaciones del plan gratuito

Render puede tener limitaciones en planes gratuitos, como arranque lento o suspension por inactividad. Para una app de eventos en produccion, conviene evaluar un plan pago antes del dia del evento.

## Seguridad antes de publicar

Antes de exponer el backend en internet, aplicar `docs/05-playbook-seguridad.md`, especialmente:

- Autenticacion.
- Autorizacion por rol.
- Validacion runtime de DTOs.
- CORS estricto.
- Evidencias de pago privadas.
- Tests de endpoints anonimos.
