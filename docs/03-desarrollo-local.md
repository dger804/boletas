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

```bash
pnpm dev
```

Servicios esperados:

- Astro: `http://localhost:4321`
- NestJS: `http://localhost:3000/api/health`

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
