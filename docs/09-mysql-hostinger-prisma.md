# MySQL Hostinger con Prisma

Esta etapa conecta la API NestJS con la base MySQL remota de Hostinger usando Prisma.

## Datos no sensibles registrados

Base creada en Hostinger:

```txt
DB_HOST=srv565.hstgr.io
DB_PORT=3306
DB_NAME=u198462083_boletasEventos
DB_USER=u198462083_boletasApp
```

La contrasena no se versiona. Solo debe existir en Render como parte de `DATABASE_URL`.

Formato de la variable:

```txt
DATABASE_URL=mysql://u198462083_boletasApp:password@srv565.hstgr.io:3306/u198462083_boletasEventos
```

Reemplazar `password` por la contrasena real solo en Render.

## MySQL remoto

En Hostinger se habilito MySQL remoto para:

```txt
Base de datos: u198462083_boletasEventos
Acceso al host: %
```

`%` significa cualquier host. Se usa porque Render no tiene IP fija dedicada en el plan actual.

Riesgo aceptado temporalmente:

- La base acepta conexiones desde cualquier IP.
- La defensa principal es una contrasena fuerte y privada.
- Esta regla debe cambiarse por IP dedicada cuando el servicio tenga un plan de Render con salida fija.

## Render

En Render, servicio `boletas-api`, crear o mantener:

```txt
Key: DATABASE_URL
Value: mysql://u198462083_boletasApp:password@srv565.hstgr.io:3306/u198462083_boletasEventos
```

No agregar esta variable a GitHub Secrets, README ni documentos con la contrasena real.

## Prisma en el proyecto

Prisma queda instalado solo en la API:

```txt
apps/api/prisma/schema.prisma
apps/api/src/database/prisma.service.ts
```

El esquema usa MySQL:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

Se usa Prisma 6 porque encaja con el NestJS actual compilado a CommonJS. Prisma 7 exige driver adapters y un flujo ESM que conviene evaluar en una etapa separada.

## Prueba de conexion

Endpoint agregado:

```txt
GET /api/health/db
```

URL de produccion:

```txt
https://api-boletas.corporacionceer.com/api/health/db
```

Respuesta esperada si Render puede conectar a Hostinger MySQL:

```json
{
  "app": "boletas-api",
  "database": "mysql",
  "status": "ok",
  "latencyMs": 1,
  "time": "2026-05-29T00:00:00.000Z"
}
```

Si falla, la API responde `503` con un mensaje generico. La ruta publica `/api/health` sigue sin depender de la base de datos para que Render no marque el servicio como caido por un problema temporal de MySQL.

## Lo que esta etapa no hace

- No crea tablas de negocio todavia.
- No reemplaza el store en memoria.
- No guarda compradores, pagos ni evidencias.
- No ejecuta migraciones en Hostinger.

## Siguiente etapa

Crear migraciones Prisma para:

1. Eventos.
2. Distribuidores.
3. Boletas.
4. Pagos y evidencias.
5. Auditoria de cambios de estado.

Antes de guardar datos reales, cerrar autenticacion y roles minimos.
