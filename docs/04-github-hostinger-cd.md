# GitHub, Hostinger y despliegue continuo

## Crear el repositorio en GitHub

1. Crear un repositorio vacio en GitHub.
2. Copiar la URL remota.
3. En la raiz local del proyecto, ejecutar:

```bash
git remote add origin https://github.com/tu-usuario/tu-repo.git
git branch -M main
git push -u origin main
```

## Validacion continua

El workflow `.github/workflows/ci.yml` ejecuta:

```bash
pnpm install --no-frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

Cuando exista `pnpm-lock.yaml`, se puede cambiar a:

```bash
pnpm install --frozen-lockfile
```

## Crear la app Node.js en Hostinger

En hPanel:

1. Abrir la seccion de Node.js Web Apps.
2. Crear una nueva app.
3. Elegir el subdominio, por ejemplo `boletas.tudominio.com`.
4. Conectar GitHub como metodo de despliegue.
5. Seleccionar el repositorio y la rama `main`.
6. Configurar version Node.js 24 si esta disponible.
7. Configurar variables de entorno.

Comandos sugeridos:

```bash
pnpm install --no-frozen-lockfile
pnpm build
pnpm start
```

Si Hostinger separa los campos:

- Install command: `pnpm install --no-frozen-lockfile`
- Build command: `pnpm build`
- Start command: `pnpm start`

## Variables en Hostinger

```txt
NODE_ENV=production
PORT=3000
PUBLIC_APP_URL=https://boletas.tudominio.com
PUBLIC_API_BASE_URL=/api
CORS_ORIGIN=https://boletas.tudominio.com
WEB_DIST_PATH=apps/web/dist
DATABASE_URL=mysql://usuario:password@host:3306/boletas_eventos
```

## Subdominio y SSL

1. Crear `boletas.tudominio.com` en Hostinger.
2. Apuntarlo a la app Node.js.
3. Activar SSL desde hPanel.
4. Verificar:

```txt
https://boletas.tudominio.com
https://boletas.tudominio.com/api/health
```

## Alternativa VPS

Si tu plan no permite Node.js Web Apps, usa VPS. El flujo cambia a:

1. GitHub Actions valida.
2. GitHub Actions despliega por SSH.
3. El servidor ejecuta `pnpm build`.
4. PM2 mantiene vivo `pnpm start`.
5. OpenLiteSpeed o Nginx apunta el subdominio al puerto de NestJS.

Esta opcion da mas control, pero requiere administrar servidor, SSL, logs y reinicios.
