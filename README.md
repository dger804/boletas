# Gestor de boletas para eventos

Monorepo para una app web de manejo y gestion de boletas de eventos: inventario, asignacion a distribuidores, venta, evidencia de pago, capitalizacion y control de ingreso el dia del evento.

## Stack elegido

- `pnpm` como package manager y workspace.
- `Astro` sobre `Vite` para el frontend.
- `Tailwind CSS` para UI.
- `NestJS` para API.
- Frontend estatico en Hostinger y API NestJS en Render mientras el plan de Hostinger no ejecute Node.js.

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
5. Aplicar el playbook de seguridad en `docs/05-playbook-seguridad.md`.
6. Desplegar backend en Render si Hostinger no tiene Node.js con `docs/06-render-backend.md`.
7. Desplegar frontend en Hostinger con GitHub Actions usando `docs/07-frontend-hostinger-actions.md`.
8. Activar validacion runtime antes de persistencia con `docs/08-validacion-runtime-y-persistencia.md`.
9. Conectar MySQL remoto de Hostinger con Prisma usando `docs/09-mysql-hostinger-prisma.md`.
10. Reemplazar gradualmente `EventStoreService` por Prisma con `docs/10-event-store-prisma.md`.
11. Proteger endpoints persistentes con token temporal usando `docs/11-admin-api-token.md`.
12. Poblar datos demo controlados con Prisma usando `docs/12-seed-demo-prisma.md`.
13. Crear login y roles iniciales con `docs/13-auth-login-roles.md`.
14. Conectar el dashboard frontend al endpoint publico sanitizado.
15. Leer los commits en orden con `git log --oneline --reverse`.
16. Ejecutar localmente con `pnpm dev`.

## Estado inicial

Esta primera base deja el camino listo para construir el MVP por etapas. Antes de guardar datos reales, la API ya debe validar payloads en runtime y la persistencia final debe definirse con un motor externo y migraciones versionadas.
