# Gestor de boletas para eventos

Monorepo para una app web de manejo y gestion de boletas de eventos: inventario, asignacion a distribuidores, venta, evidencia de pago, capitalizacion y control de ingreso el dia del evento.

## Stack elegido

- `pnpm` como package manager y workspace.
- `Astro` sobre `Vite` para el frontend.
- `Tailwind CSS` para UI.
- `NestJS` para API.
- Un solo subdominio en produccion: el frontend vive en `/` y la API en `/api`.

## Estructura

```txt
apps/
  api/       API NestJS
  web/       Frontend Astro
packages/
  shared/    Tipos y contratos compartidos
docs/        Decisiones, despliegue y paso a paso
```

## Comandos previstos

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
```

> Nota: en esta maquina `pnpm` no esta disponible aun. Cuando lo instales, el primer `pnpm install` generara `pnpm-lock.yaml`; ese archivo debe quedar versionado.

## Ruta de aprendizaje

1. Entender el dominio en `docs/01-alcance-mvp.md`.
2. Revisar la arquitectura en `docs/02-arquitectura-y-despliegue.md`.
3. Preparar el entorno con `docs/03-desarrollo-local.md`.
4. Conectar GitHub y Hostinger con `docs/04-github-hostinger-cd.md`.
5. Leer los commits en orden con `git log --oneline --reverse`.
6. Ejecutar localmente con `pnpm dev`.

## Estado inicial

Esta primera base deja el camino listo para construir el MVP por etapas. La persistencia final se propone con MySQL de Hostinger y Prisma en una siguiente iteracion.
