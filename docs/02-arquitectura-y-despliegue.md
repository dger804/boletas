# Arquitectura y despliegue

## Decision base

La app se publica en un solo subdominio, por ejemplo:

```txt
https://boletas.corporacionceer.com
```

Rutas:

- `/`: frontend Astro construido como archivos estaticos.
- `/api/*`: API NestJS.

NestJS servira la carpeta `apps/web/dist` y tambien expondra sus controladores bajo `/api`. Asi se evita manejar dos subdominios y se simplifica CORS.

## Decision actual de despliegue

Como el plan actual de Hostinger no ejecuta Node.js, el despliegue practico queda separado:

```txt
https://boletas.corporacionceer.com      -> frontend estatico en Hostinger
https://api-boletas.corporacionceer.com  -> backend NestJS en Render
```

En esta variante, el frontend usa:

```txt
PUBLIC_API_BASE_URL=https://api-boletas.corporacionceer.com/api
```

Y el backend en Render usa:

```txt
CORS_ORIGIN=https://boletas.corporacionceer.com
```

## Por que esta forma encaja con Hostinger

Hostinger permite sitios estaticos, pero NestJS necesita un runtime Node.js. Para esta arquitectura hay dos caminos:

- Hostinger Business Web Hosting o Cloud con soporte para Node.js Web Apps.
- VPS de Hostinger si se necesita control completo de servidor, PM2, Nginx/OpenLiteSpeed y despliegues por SSH.

Si tu plan actual no tiene soporte Node.js, el frontend estatico puede vivir en Hostinger y la API debe ir a Render, VPS u otro proveedor Node. Si mas adelante se quiere volver a un solo subdominio con `/api`, lo mas limpio seria usar un plan que ejecute Node.js o un proxy administrable.

## Build de produccion

El build esperado es:

```bash
pnpm install
pnpm build
pnpm start
```

`pnpm build` compila:

1. `packages/shared`
2. `apps/web`
3. `apps/api`

`pnpm start` arranca NestJS. La variable `WEB_DIST_PATH` indica donde esta el build de Astro.

## Variables importantes

```txt
PORT=3000
WEB_DIST_PATH=apps/web/dist
PUBLIC_API_BASE_URL=https://api-boletas.corporacionceer.com/api
CORS_ORIGIN=https://boletas.corporacionceer.com
DATABASE_URL=mysql://usuario:password@host:3306/boletas_eventos
```

La base MySQL remota actual esta en Hostinger y se documenta sin contrasena en `docs/09-mysql-hostinger-prisma.md`.

## GitHub y despliegue continuo

Flujo actual recomendado:

1. Crear repositorio en GitHub.
2. Subir este monorepo.
3. Activar GitHub Actions para validar build y tipos.
4. Mantener el backend NestJS en Render con `CORS_ORIGIN=https://boletas.corporacionceer.com`.
5. Configurar el frontend Astro con `PUBLIC_API_BASE_URL=https://api-boletas.corporacionceer.com/api`.
6. Crear los secretos FTP de Hostinger en GitHub.
7. Usar GitHub Actions para construir `apps/web` y subir `apps/web/dist/` a Hostinger.
8. Apuntar el subdominio `boletas.corporacionceer.com` al directorio estatico en Hostinger y activar SSL.

Ver el paso a paso operativo en `docs/07-frontend-hostinger-actions.md`.

## Siguiente decision tecnica

Antes de agregar persistencia real se agrego validacion runtime en la API para rechazar payloads invalidos. Ver `docs/08-validacion-runtime-y-persistencia.md`.

Tambien se agrego Prisma con una prueba de conexion a MySQL remoto en `GET /api/health/db`. Ver `docs/09-mysql-hostinger-prisma.md`.

La siguiente iteracion deberia agregar persistencia con un motor externo. La opcion sugerida es Prisma porque permite:

- Modelar eventos, boletas, distribuidores y pagos.
- Ejecutar migraciones versionadas.
- Usar MySQL o PostgreSQL segun el proveedor elegido.
- Usar una base local para desarrollo.
