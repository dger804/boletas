# Playbook de seguridad

Este playbook define como vamos a tomar decisiones de seguridad para la app de gestion de boletas. La meta no es frenar el aprendizaje, sino evitar que el MVP crezca sobre bases inseguras.

## Principios

1. Toda accion sensible debe tener usuario, rol y auditoria.
2. El frontend ayuda a usar el sistema, pero nunca decide permisos, precios, pagos o check-in.
3. Los pantallazos de pago son datos privados.
4. Los codigos de boleta no deben funcionar como contrasenas faciles de adivinar.
5. Las reglas de dinero se calculan en backend.
6. Produccion debe fallar de forma segura cuando falte configuracion critica.

## Activos a proteger

- Datos de compradores: nombre, telefono, correo y asistencia.
- Evidencia de pagos: pantallazos, referencias y notas de efectivo.
- Boletas: codigo, estado, precio, comprador, distribuidor y uso.
- Recaudo: ventas, pagos aprobados, pagos pendientes y capitalizacion.
- Acciones administrativas: aprobar pago, anular boleta, reasignar boleta, cerrar corte.
- Secretos: credenciales de base de datos, tokens de despliegue y llaves de sesion.

## Roles iniciales

- `admin`: administra eventos, usuarios, boletas, pagos y reportes.
- `supervisor`: supervisa operacion, valida flujos asignados y consulta reportes.
- `regular`: usuario operativo basico para flujos asignados.

Regla base: ningun endpoint sensible debe depender solo de que el usuario conozca un `eventId`, `ticketId`, `paymentId` o codigo de boleta.

## Estados permitidos

### Boleta

```txt
available -> assigned -> sold -> paid -> used
available -> void
assigned -> void
sold -> void
paid -> void solo con rol admin y auditoria
```

Reglas:

- Una boleta `used` no vuelve a otro estado sin flujo de auditoria.
- Una boleta `sold` no puede ingresar al evento hasta quedar `paid`.
- Una boleta `void` no se vende, no se paga y no se usa.
- El check-in debe ser idempotente o rechazar claramente el segundo uso.

### Pago

```txt
pending -> approved
pending -> rejected
rejected -> pending solo con nueva evidencia o revision admin
```

Reglas:

- Solo `admin` aprueba o rechaza pagos.
- El monto aprobado debe coincidir con la regla de precio vigente o registrar una excepcion.
- La capitalizacion se calcula en backend, no desde el cliente.
- Todo cambio guarda `reviewedBy`, `reviewedAt` y nota cuando aplique.

## Controles obligatorios antes de produccion

### Autenticacion

- Implementar login con sesiones seguras o JWT.
- Usar cookies `HttpOnly`, `Secure`, `SameSite=Lax` o `Strict` si se eligen cookies.
- Definir expiracion y renovacion de sesion.
- Proteger todos los endpoints excepto salud publica y recursos estaticos.
- Proteger endpoints persistentes con sesiones de usuario y roles; `ADMIN_API_TOKEN` fue un control temporal y ya no debe aceptarse.
- Vincular responsables con usuarios cuando un operador `regular` deba quedar limitado a sus propias boletas.

### Autorizacion

- Agregar guards por rol en NestJS.
- Validar autorizacion por objeto: evento, boleta, distribuidor y pago.
- Evitar IDOR: cambiar un id en la URL no debe permitir ver o modificar registros ajenos.
- Separar permisos de venta, aprobacion de pago y check-in.

### Validacion runtime

- Convertir DTOs de `interface` a clases o schemas.
- Activar `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform`.
- Validar rangos:
  - `quantity`: minimo 1, maximo operacional definido.
  - `price` y `amount`: enteros positivos en centavos o pesos, sin negativos.
  - `capitalizationAmount`: no negativo y derivado del backend cuando sea posible.
  - `status`, `method` y roles: enums estrictos.
- Rechazar campos protegidos enviados por el cliente.

### Evidencias de pago

- Guardar archivos fuera del directorio publico.
- Generar nombres aleatorios del lado del servidor.
- Validar tamano maximo, extension y MIME type.
- Servir evidencias solo por endpoint autenticado y autorizado.
- No registrar URLs privadas, tokens ni datos sensibles en logs.

### CORS y headers

- En produccion, `CORS_ORIGIN` es obligatorio y el API falla al arrancar si falta.
- No usar wildcard con credenciales en produccion.
- El backend aplica headers base de seguridad en todas las respuestas:
  - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Mantener API y frontend bajo el mismo dominio cuando sea viable.

### Base de datos

- Usar migraciones versionadas.
- Evitar deletes fisicos para pagos, boletas y check-in; preferir estados y auditoria.
- Usar transacciones para aprobar pago, cambiar estado de boleta y registrar auditoria.
- Restringir credenciales de produccion al minimo necesario.
- Deshabilitar usuarios de prueba antes de borrarlos, para no perder contexto de auditoria mientras el sistema aun esta madurando.

### CI/CD

- Usar `pnpm install --frozen-lockfile` en CI.
- Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Ejecutar `pnpm audit --audit-level moderate` como chequeo periodico o previo a release.
- No exponer secretos a pull requests de forks.
- Versionar cambios pequenos con commits claros.

## Checklist por pull request

Antes de aprobar un PR:

- La rama pasa `pnpm typecheck`.
- La rama pasa `pnpm test`.
- La rama pasa `pnpm build`.
- No hay secretos nuevos en el diff.
- No se agregan endpoints sensibles sin guard.
- No se confia en valores de dinero o estado enviados por frontend.
- Los cambios de estado tienen tests.
- Los errores no filtran detalles internos.

## Checklist antes de desplegar

- `NODE_ENV=production`.
- `CORS_ORIGIN` contiene solo el dominio real.
- `.env` real no esta commiteado.
- `DATABASE_URL` usa credenciales de produccion privadas.
- Hay SSL activo.
- El subdominio esperado resuelve correctamente.
- El API responde con headers de seguridad base.
- Los endpoints sensibles anonimos devuelven `401` o `403`.
- Las evidencias de pago no son publicas.
- `pnpm audit --audit-level moderate` no reporta vulnerabilidades sin aceptar.

## Pruebas de seguridad iniciales

Estas pruebas deben automatizarse cuando exista auth real:

1. Usuario anonimo no lista pagos, boletas ni compradores.
2. `regular` no puede aprobar pagos.
3. `regular` no puede ver boletas fuera de su alcance.
4. `supervisor` no puede administrar usuarios ni cambiar secretos.
5. Boleta `sold` sin pago no puede hacer check-in.
6. Boleta `paid` puede hacer check-in una sola vez.
7. Boleta `void` no puede venderse, pagarse ni usarse.
8. Monto negativo o cantidad enorme es rechazado.
9. Evidencia de pago requiere autorizacion para verse.
10. Totales de recaudo excluyen pagos pendientes o rechazados.

## Respuesta a incidentes

Si se sospecha una exposicion:

1. Congelar despliegues.
2. Guardar hora, commit y entorno afectado.
3. Revocar secretos potencialmente expuestos.
4. Revisar logs sin descargar datos sensibles innecesarios.
5. Crear fix en rama separada.
6. Agregar test de regresion.
7. Documentar causa raiz y prevencion.

## Riesgos aceptados en MVP local

Mientras la app siga solo en desarrollo local:

- Se permite usar datos demo en memoria.
- Se permite que el dashboard sea estatico.
- Se permite no tener login si no hay despliegue publico.

Antes de publicar en internet, estos riesgos dejan de estar aceptados y deben cerrarse o documentarse explicitamente.
