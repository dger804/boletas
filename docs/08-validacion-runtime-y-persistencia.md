# Validacion runtime antes de persistencia

La app ya esta publicada en internet:

```txt
Frontend: https://boletas.corporacionceer.com
Backend:  https://api-boletas.corporacionceer.com/api
```

Antes de conectar una base de datos real, la API debe rechazar datos invalidos en tiempo de ejecucion. TypeScript ayuda durante desarrollo, pero no valida lo que llega por HTTP.

## Decision de esta etapa

Se agrego validacion runtime en NestJS con:

```txt
class-validator
class-transformer
ValidationPipe global
```

El `ValidationPipe` queda configurado con:

```ts
whitelist: true
forbidNonWhitelisted: true
transform: true
```

Esto significa:

1. Los campos no declarados en el DTO se rechazan.
2. Los payloads con montos, cantidades o estados invalidos fallan antes de llegar a la logica de negocio.
3. Los valores numericos enviados como texto se transforman cuando el DTO lo permite.

## DTOs cubiertos

Los DTOs principales de eventos, distribuidores, boletas, ventas, pagos y check-in ahora son clases validadas:

```txt
CreateEventDto
CreateDistributorDto
CreateTicketBatchDto
AssignTicketDto
RegisterSaleDto
CheckInTicketDto
VerifyPaymentDto
```

Reglas iniciales:

- `quantity`: entero entre 1 y 5000.
- `price`, `amount`, `capitalizationAmount`: enteros no negativos.
- `status` y `method`: solo valores permitidos por el dominio compartido.
- Textos operativos: limite de longitud.
- URLs de evidencia: deben incluir protocolo cuando se envian.
- Campos desconocidos: rechazados.

## Pruebas agregadas

Se agregaron pruebas para:

1. Validar transformacion de campos numericos.
2. Rechazar montos invalidos.
3. Rechazar campos inesperados enviados por el cliente.
4. Proteger el flujo principal:
   - crear evento;
   - crear distribuidor;
   - crear lote de boletas;
   - asignar boleta;
   - registrar venta;
   - aprobar pago;
   - hacer check-in;
   - actualizar totales del dashboard.
5. Rechazar check-in de boleta vendida sin pago aprobado.

Comando:

```bash
pnpm --filter @boletas/api test
```

## Por que esto va antes de base de datos

Cuando la persistencia sea real, un payload invalido podria quedar guardado y afectar reportes, recaudo, check-in o auditoria. Esta etapa reduce ese riesgo antes de introducir migraciones y datos duraderos.

## Siguiente decision

La siguiente iteracion debe decidir la persistencia real:

1. Proveedor de base de datos.
2. Motor: MySQL o PostgreSQL.
3. ORM: Prisma.
4. Migraciones iniciales para:
   - eventos;
   - distribuidores;
   - boletas;
   - pagos;
   - auditoria de cambios de estado.

Antes de guardar datos reales de compradores o evidencias de pago, tambien debe definirse autenticacion y roles.

## Iteracion posterior

La conexion inicial a MySQL remoto de Hostinger con Prisma se documenta en `docs/09-mysql-hostinger-prisma.md`.
