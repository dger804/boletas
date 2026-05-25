# Arquitectura y despliegue

## Decision base

La app se publica en un solo subdominio, por ejemplo:

```txt
https://boletas.tudominio.com
```

Rutas:

- `/`: frontend Astro construido como archivos estaticos.
- `/api/*`: API NestJS.

NestJS servira la carpeta `apps/web/dist` y tambien expondra sus controladores bajo `/api`. Asi se evita manejar dos subdominios y se simplifica CORS.

## Por que esta forma encaja con Hostinger

Hostinger permite sitios estaticos, pero NestJS necesita un runtime Node.js. Para esta arquitectura hay dos caminos:

- Hostinger Business Web Hosting o Cloud con soporte para Node.js Web Apps.
- VPS de Hostinger si se necesita control completo de servidor, PM2, Nginx/OpenLiteSpeed y despliegues por SSH.

Si tu plan actual no tiene soporte Node.js, el frontend estatico podria vivir en Hostinger, pero la API tendria que ir a un VPS u otro proveedor Node. Para mantener un solo subdominio, lo mas limpio es usar un plan que ejecute Node.js.

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
PUBLIC_API_BASE_URL=/api
CORS_ORIGIN=https://boletas.tudominio.com
DATABASE_URL=mysql://usuario:password@host:3306/boletas_eventos
```

## GitHub y despliegue continuo

Flujo recomendado:

1. Crear repositorio en GitHub.
2. Subir este monorepo.
3. Activar GitHub Actions para validar build y tipos.
4. En Hostinger, crear una Node.js Web App.
5. Conectar el repositorio de GitHub desde hPanel.
6. Definir rama de despliegue, normalmente `main`.
7. Usar `pnpm build` como build command y `pnpm start` como start command.
8. Configurar variables de entorno en Hostinger.
9. Apuntar el subdominio `boletas.tudominio.com` a Hostinger y activar SSL.

## Siguiente decision tecnica

La siguiente iteracion deberia agregar persistencia con MySQL. La opcion sugerida es Prisma porque permite:

- Modelar eventos, boletas, distribuidores y pagos.
- Ejecutar migraciones versionadas.
- Usar MySQL de Hostinger en produccion.
- Usar una base local para desarrollo.
