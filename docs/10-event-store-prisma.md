# EventStoreService con Prisma

Esta etapa inicia el reemplazo del `EventStoreService` en memoria por Prisma.

## Decision

`EventStoreService` ahora usa Prisma cuando `DATABASE_URL` esta configurada.

```txt
Render -> DATABASE_URL existe -> EventStoreService usa MySQL con Prisma
Local sin DATABASE_URL -> EventStoreService usa datos demo en memoria
```

Esto permite:

1. Usar MySQL real en produccion.
2. Mantener desarrollo local simple mientras no tengamos base local.
3. Evitar que la API local falle solo por no tener `DATABASE_URL`.

## Metodos migrados

Los metodos publicos del servicio ya tienen camino Prisma:

```txt
listEvents
createEvent
getEventDashboard
addDistributor
createTicketBatch
listTickets
assignTicket
registerSale
checkInTicket
listPayments
verifyPayment
```

El contrato HTTP no cambia. Los controladores siguen exponiendo:

```txt
GET    /api/events
POST   /api/events
GET    /api/events/:eventId/summary
GET    /api/events/:eventId/dashboard
POST   /api/events/:eventId/distributors
POST   /api/events/:eventId/tickets/batch
GET    /api/tickets
PATCH  /api/tickets/:ticketId/assign
PATCH  /api/tickets/:ticketId/sale
PATCH  /api/tickets/:ticketId/check-in
GET    /api/payments
PATCH  /api/payments/:paymentId/verify
```

Tambien existen endpoints de solo lectura para el dashboard estatico:

```txt
GET /api/events/:eventId/summary
GET /api/public/events/:eventId/dashboard
```

`/api/events/:eventId/summary` requiere sesion de usuario y es el endpoint que usa el dashboard interno. `/api/public/events/:eventId/dashboard` no requiere sesion y se mantiene para lecturas publicas sanitizadas.

Ambos devuelven una salida sanitizada:

- no incluye nombres de compradores;
- no incluye telefonos;
- no incluye codigos reales de boletas;
- no incluye referencias bancarias;
- no incluye `evidenceUrl`.

El endpoint completo `GET /api/events/:eventId/dashboard` queda protegido para `supervisor` y `admin` porque puede incluir datos operativos completos.

El frontend estatico renderiza un fallback y luego refresca el endpoint protegido `summary` desde el navegador con `Authorization: Bearer <token>`. Esto evita publicar `ADMIN_API_TOKEN` y evita que el dashboard quede congelado con datos del momento del build.

## Fallback local

El fallback en memoria sigue existiendo, pero solo se usa si Prisma no esta configurado.

Este fallback conserva el evento demo:

```txt
evt_demo
```

La razon es practica: permite ejecutar tests y desarrollo local inicial sin conectarse a Hostinger.

## Produccion

En Render, como `DATABASE_URL` ya existe, las operaciones anteriores leen y escriben en MySQL.

Despues del deploy se puede validar:

```txt
https://api-boletas.corporacionceer.com/api/health/db
https://api-boletas.corporacionceer.com/api/events
https://api-boletas.corporacionceer.com/api/events/evt_demo/summary
https://api-boletas.corporacionceer.com/api/public/events/evt_demo/dashboard
```

Si `/api/events` responde `[]`, no es error: significa que la base real esta vacia y aun no se han creado eventos persistentes.

## Pendientes

1. Configurar `ADMIN_API_TOKEN` en Render para proteger endpoints persistentes.
2. Ejecutar el seed demo controlado documentado en `docs/12-seed-demo-prisma.md`.
3. Agregar tests de integracion con una base de datos temporal.
4. Agregar auditoria real en cambios de estado.
5. Definir autenticacion y roles antes de usar datos reales de compradores.
6. Ampliar el frontend para operaciones reales cuando exista autenticacion.
