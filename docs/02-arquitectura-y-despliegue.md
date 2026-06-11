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

Rutas frontend actuales:

```txt
/           landing publica promocional
/login      formulario de acceso
/dashboard  tablero operativo con sesion en el navegador
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

La primera migracion Prisma crea `events`, `distributors`, `tickets`, `payment_evidences` y `audit_logs`. Render aplica migraciones pendientes durante el build con `pnpm --filter @boletas/api prisma:migrate:deploy`.

`EventStoreService` ya usa Prisma cuando `DATABASE_URL` existe. En desarrollo local sin `DATABASE_URL`, conserva un fallback en memoria para no bloquear pruebas y aprendizaje. Ver `docs/10-event-store-prisma.md`.

Los endpoints persistentes de eventos, boletas y pagos quedan protegidos con `ADMIN_API_TOKEN` hasta implementar login y roles. Ver `docs/11-admin-api-token.md`.

La primera base de login y roles ya existe. Usa usuarios en MySQL, tokens firmados con `AUTH_TOKEN_SECRET` y roles `regular`, `supervisor`, `admin`. Durante la transicion, los endpoints administrativos aceptan usuarios `admin` o el token temporal. Ver `docs/13-auth-login-roles.md`.

Los datos demo persistentes se cargan con `pnpm db:seed` y requieren `DATABASE_URL` en el entorno de ejecucion. Ver `docs/12-seed-demo-prisma.md`.

El frontend estatico no debe usar `ADMIN_API_TOKEN`. Para mostrar el tablero interno sin exponer datos operativos completos, la API publica un resumen sanitizado protegido por sesion:

```txt
GET /api/events/:eventId/summary
GET /api/public/events/:eventId/dashboard
```

`/api/events/:eventId/summary` es el que consume `/dashboard` con `Authorization: Bearer <token>`. `/api/public/events/:eventId/dashboard` conserva el mismo contrato sanitizado para lecturas publicas sin sesion.

Estos endpoints devuelven metricas agregadas, muestras anonimizadas y pagos recientes sin compradores, telefonos, referencias de transferencia ni URLs de evidencia. Las acciones que crean o modifican datos siguen en endpoints protegidos. El dashboard completo `GET /api/events/:eventId/dashboard` queda reservado para `supervisor` y `admin`.

Como Hostinger sirve el frontend como archivos estaticos, la lectura del dashboard debe ejecutarse en el navegador. Un `fetch` hecho durante el build de Astro solo congelaria los datos hasta el siguiente despliegue.

La siguiente decision tecnica es conectar las acciones operativas reales al token de sesion y completar las pantallas de eventos, boletas, pagos y entrada.
