# Portabilidad del proyecto y skills

Esta guia sirve para continuar el proyecto en otro equipo sin perder contexto, comandos ni skills globales de Codex.

## Que viaja por GitHub

El repositorio debe ser la fuente principal:

- Codigo de `apps/api`, `apps/web` y `packages/shared`.
- Workflows de GitHub Actions.
- Documentacion en `docs/`.
- `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `render.yaml` y configuracion base.
- Scripts reutilizables en `scripts/`.

Antes de cambiar de equipo:

```powershell
git status
git push
```

El resultado esperado es que `git status` no muestre cambios pendientes y que `main` este actualizado en GitHub.

## Que no se debe llevar por Git

No subas estos archivos o carpetas:

- `.env` o cualquier archivo con secretos reales.
- `node_modules/`.
- `apps/web/dist/`, `apps/api/dist/` o cualquier `dist/`.
- `_portable/`.
- Caches de plugins de Codex.
- `.codex/skills/.system`.

El archivo `.env.example` si debe viajar porque solo contiene valores de ejemplo.

## Skills globales de Codex

Las skills globales viven fuera del repositorio:

```txt
%USERPROFILE%\.codex\skills\
```

Las skills personalizadas actuales son:

```txt
critical-collaborator
failure-cleanup
find-vulnerabilities
```

No copies `.system` ni caches de plugins. Esas piezas pertenecen a la instalacion local de Codex y se regeneran o instalan aparte.

### Exportar skills en el equipo actual

Desde la raiz del repo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/export-codex-skills.ps1
```

Esto exporta todas las skills personalizadas, excluyendo carpetas del sistema que empiezan por punto, y crea:

```txt
_portable/codex-skills.zip
```

Ese zip queda ignorado por Git. Guardalo en USB, disco externo o una ubicacion privada. No lo publiques en el repositorio.

Si alguna vez quieres exportar solo una skill especifica:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/export-codex-skills.ps1 -OnlySkillName find-vulnerabilities
```

### Importar skills en el equipo nuevo

Despues de clonar el repo y tener el zip disponible:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/import-codex-skills.ps1 -ArchivePath .\_portable\codex-skills.zip
```

Si ya existen skills con el mismo nombre y quieres reemplazarlas:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/import-codex-skills.ps1 -ArchivePath .\_portable\codex-skills.zip -Force
```

Luego reinicia Codex para que cargue las skills importadas.

## Preparar el equipo nuevo

Instala:

- Git.
- Node.js 24 LTS.
- Un editor como VS Code.
- Codex, si vas a seguir trabajando con el asistente en ese equipo.

Clona el repositorio:

```powershell
git clone https://github.com/dger804/boletas.git
cd boletas
```

Si Git muestra `detected dubious ownership`, marca el directorio como seguro:

```powershell
git config --global --add safe.directory <ruta-del-repo>
```

Activa pnpm con Corepack:

```powershell
corepack enable
corepack prepare pnpm@11.2.2 --activate
pnpm --version
```

Instala dependencias:

```powershell
pnpm install
```

Si pnpm bloquea scripts de construccion:

```powershell
pnpm approve-builds
```

Aprueba solo dependencias esperadas del proyecto, como `@nestjs/core`, `esbuild` y `sharp`.

## Variables locales

Crea `.env` desde el ejemplo:

```powershell
Copy-Item .env.example .env
```

Para desarrollo con API local:

```txt
PUBLIC_APP_URL=http://localhost:4321
PUBLIC_API_BASE_URL=http://localhost:3000/api
CORS_ORIGIN=http://localhost:4321
AUTH_TOKEN_SECRET=un-secreto-local-largo
AUTH_TOKEN_TTL_SECONDS=28800
DATABASE_URL=mysql://usuario:password@host:3306/base
```

Para trabajar solo frontend contra la API publicada:

```txt
PUBLIC_API_BASE_URL=https://api-boletas.corporacionceer.com/api
```

No guardes claves reales en chat, docs ni commits.

## Secretos y servicios externos

Si sigues usando el mismo repositorio de GitHub, los repository secrets ya permanecen en GitHub y no dependen del equipo local.

Si creas un fork, repo nuevo o cuenta nueva, debes recrear:

```txt
HOSTINGER_FTP_SERVER
HOSTINGER_FTP_USERNAME
HOSTINGER_FTP_PASSWORD
HOSTINGER_FTP_SERVER_DIR
```

En Render, el servicio `boletas-api` debe conservar:

```txt
CORS_ORIGIN=https://boletas.corporacionceer.com
DATABASE_URL=mysql://usuario:password@host:3306/base
ADMIN_API_TOKEN=<secreto privado>
AUTH_TOKEN_SECRET=<secreto privado largo>
AUTH_TOKEN_TTL_SECONDS=28800
```

En Hostinger, confirma:

- Subdominio `boletas.corporacionceer.com`.
- Directorio FTP del frontend.
- CNAME de `api-boletas.corporacionceer.com` apuntando a Render.
- MySQL remoto para la base del proyecto.

Si limitas MySQL remoto por IP, agrega la IP publica del equipo o red nueva. Si se mantiene `%`, no hace falta cambiarlo, pero es menos restrictivo.

## Validacion en el equipo nuevo

Primero valida sin tocar produccion:

```powershell
pnpm typecheck
pnpm test
pnpm build
```

Luego levanta desarrollo:

```powershell
pnpm dev
```

Rutas esperadas:

```txt
Frontend local: http://localhost:4321
API local:      http://localhost:3000/api/health
DB local:       http://localhost:3000/api/health/db
```

Si solo quieres trabajar UI contra produccion:

```powershell
pnpm dev:web
```

## Checklist final

- Repo clonado y `main` actualizado.
- Skills importadas y Codex reiniciado.
- `.env` local creado sin commitear.
- `pnpm install` ejecutado.
- `pnpm typecheck`, `pnpm test` y `pnpm build` en verde.
- Login probado con un usuario valido.
- GitHub Actions y Render siguen desplegando desde el repositorio remoto.
