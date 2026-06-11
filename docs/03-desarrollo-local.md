# Desarrollo local paso a paso

## 1. Instalar Node.js

Usa Node.js 24 LTS para que local, GitHub Actions y Hostinger trabajen con la misma familia de version.

Comprueba:

```bash
node --version
```

## 2. Activar pnpm

Con Node instalado, activa `pnpm` con Corepack:

```bash
corepack enable
corepack prepare pnpm@11.2.2 --activate
pnpm --version
```

## 3. Instalar dependencias

Desde la raiz del monorepo:

```bash
pnpm install
```

Esto crea `pnpm-lock.yaml`. Ese archivo debe commitearse:

```bash
git add pnpm-lock.yaml
git commit -m "chore: lock dependency graph"
```

## 4. Ejecutar en desarrollo

Antes de levantar la app, crea tu archivo local de variables desde la raiz del monorepo:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edita `.env` y deja estos valores para desarrollo local:

```txt
PUBLIC_APP_URL=http://localhost:4321
PUBLIC_API_BASE_URL=http://localhost:3000/api
CORS_ORIGIN=http://localhost:4321
AUTH_TOKEN_SECRET=un-secreto-local-largo
DATABASE_URL=mysql://usuario:password@host:3306/base
```

No subas `.env` al repositorio. Ya esta ignorado por Git.

```bash
pnpm dev
```

Servicios esperados:

- Astro: `http://localhost:4321`
- NestJS: `http://localhost:3000/api/health`

Tambien puedes levantar solo la API:

```bash
pnpm dev:api
```

Este comando ejecuta `src/main.ts` con `ts-node` y `node --watch`, por lo que no necesita que exista `apps/api/dist`. Si aparece un error como `Cannot find module ... apps/api/dist/main`, revisa que tengas la version actual del script `dev` en `apps/api/package.json`.

Si aparece `EADDRINUSE: address already in use 0.0.0.0:3000`, ya hay otra API local usando el puerto `3000`. Cierra la terminal anterior con `Ctrl+C` o identifica el proceso:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

Luego detén solo ese proceso:

```powershell
Stop-Process -Id <OwningProcess> -Force
```

Evita ejecutar `pnpm dev` y `pnpm dev:api` al mismo tiempo, porque ambos intentan levantar la API.

Para poder iniciar sesion en `http://localhost:4321/login`, deben cumplirse estas dos cosas:

1. `http://localhost:3000/api/health` responde.
2. `DATABASE_URL` apunta a una base que tenga usuarios en `app_users`.
3. `http://localhost:3000/api/health/db` responde con `status: "ok"`.

Si ejecutas solo `pnpm dev:web`, el login no funcionara porque el frontend intentara llamar a la API y NestJS no estara corriendo. Cuando navegas en `localhost` y falta `PUBLIC_API_BASE_URL`, el frontend convierte `/api` a `http://localhost:3000/api` para evitar pegarle por error al servidor de Astro.

Si `/api/health` responde pero `/api/health/db` devuelve `503`, la API local esta viva pero no puede conectarse a MySQL. En ese caso revisa conectividad al host de Hostinger:

```powershell
Test-NetConnection -ComputerName srv565.hstgr.io -Port 3306
```

Si `TcpTestSucceeded` es `False`, el problema ocurre antes de usuario y contrasena. Revisa en Hostinger `MySQL remoto`, agrega tu IP publica actual o confirma que la base acepte `%`, y prueba desde otra red si tu red actual bloquea conexiones salientes al puerto `3306`.

Como alternativa temporal para trabajar solo el frontend, puedes apuntar el navegador local a la API desplegada:

```txt
PUBLIC_API_BASE_URL=https://api-boletas.corporacionceer.com/api
```

En ese modo ejecuta solo `pnpm dev:web` para no depender de la conexion MySQL desde tu equipo.

## 5. Validar antes de commitear

```bash
pnpm typecheck
pnpm test
pnpm build
```

## 6. Convencion de commits

Usaremos commits pequenos y descriptivos:

```txt
chore: initialize monorepo foundation
feat(api): add ticket management domain endpoints
feat(web): add event control dashboard
ci: add validation and deployment guide
```

La idea es que cada avance ensene una decision concreta.
