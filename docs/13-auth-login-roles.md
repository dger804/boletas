# Login y roles iniciales

Esta etapa agrega autenticacion de usuarios sin romper el `ADMIN_API_TOKEN` temporal.

## Objetivo

Permitir que la API acepte sesiones de usuario firmadas para operaciones administrativas, como paso previo a construir pantallas reales de eventos, boletas, pagos y entrada.

## Roles iniciales

```txt
regular    -> usuario operativo basico, sin administracion de cuentas
supervisor -> usuario intermedio para supervision y validaciones futuras
admin      -> administra eventos, usuarios, boletas, distribuidores y pagos
```

Politica inicial por endpoint operativo:

```txt
regular
- leer eventos, tablero resumido protegido y boletas
- registrar venta
- registrar ingreso/check-in

supervisor
- todo lo de regular
- leer tablero completo del evento
- crear distribuidores
- asignar boletas
- listar y validar pagos

admin
- todo lo de supervisor
- crear eventos
- crear lotes de boletas
- administrar usuarios
```

`ADMIN_API_TOKEN` se conserva como puente temporal y se trata como rol `admin` solo en endpoints operativos donde `admin` esta permitido. Para administrar usuarios desde la UI se debe usar una sesion real de usuario `admin`.

## Variables en Render

Agregar en el servicio `boletas-api`:

```txt
AUTH_TOKEN_SECRET=secreto_largo_aleatorio
AUTH_TOKEN_TTL_SECONDS=28800
```

`AUTH_TOKEN_SECRET` debe ser diferente de `ADMIN_API_TOKEN`.

No guardar valores reales en GitHub, docs, capturas ni `.env.example`.

## Migraciones

La migracion `20260609223500_add_app_users` crea la tabla:

```txt
app_users
```

La migracion `20260610173000_update_user_roles` cambia los roles a:

```txt
regular
supervisor
admin
```

Si existian roles anteriores, los traduce asi:

```txt
seller -> regular
gate   -> supervisor
admin  -> admin
```

Render la aplica durante el build con:

```txt
pnpm --filter @boletas/api prisma:migrate:deploy
```

## Crear el primer admin

Desde PowerShell local:

```powershell
pnpm.cmd auth:create-admin:local -AdminEmail "admin@tu-dominio.com" -AdminName "Administrador"
```

El script pide:

- contrasena de MySQL;
- contrasena del usuario admin.

Ambas se usan solo como variables de entorno temporales y se eliminan al terminar.

## Login

El frontend publica el formulario en:

```txt
https://boletas.corporacionceer.com/login
```

La landing publica queda en `/` y enlaza hacia este login. El tablero queda en `/dashboard` y redirige a `/login` cuando no hay token vigente en `sessionStorage`.

```powershell
$body = @{
  email = "admin@tu-dominio.com"
  password = "TU_PASSWORD"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -ContentType "application/json" `
  -Body $body `
  -Uri "https://api-boletas.corporacionceer.com/api/auth/login"
```

La respuesta incluye:

```txt
token
tokenType=Bearer
expiresAt
user
```

## Usar la sesion admin

```powershell
$headers = @{ Authorization = "Bearer TU_TOKEN_DE_LOGIN" }
Invoke-RestMethod -Headers $headers -Uri "https://api-boletas.corporacionceer.com/api/events"
```

Durante la transicion, los endpoints operativos siguen aceptando `ADMIN_API_TOKEN` como rol `admin`.

## Autorizacion operativa por rol

Los endpoints de eventos, boletas y pagos usan la sesion vigente para aplicar permisos:

```txt
GET   /api/events                         regular, supervisor, admin
POST  /api/events                         admin
GET   /api/events/:eventId/summary        regular, supervisor, admin
GET   /api/events/:eventId/dashboard      supervisor, admin
POST  /api/events/:eventId/distributors   supervisor, admin
POST  /api/events/:eventId/tickets/batch  admin

GET   /api/tickets                        regular, supervisor, admin
PATCH /api/tickets/:ticketId/assign       supervisor, admin
PATCH /api/tickets/:ticketId/sale         regular, supervisor, admin
PATCH /api/tickets/:ticketId/check-in     regular, supervisor, admin

GET   /api/payments                       supervisor, admin
PATCH /api/payments/:paymentId/verify     supervisor, admin
```

La ruta publica sanitizada sigue sin sesion:

```txt
GET /api/public/events/:eventId/dashboard
```

El dashboard interno de Astro usa la ruta protegida `GET /api/events/:eventId/summary` con el token guardado en `sessionStorage`. Esa ruta devuelve el mismo contrato sanitizado que la ruta publica, por lo que no expone compradores, telefonos, referencias ni URLs de evidencia a usuarios `regular`.

## Administrar usuarios

Los usuarios `admin` pueden administrar cuentas desde el frontend:

```txt
https://boletas.corporacionceer.com/users
```

La pantalla permite:

```txt
crear usuarios
editar nombre y correo
cambiar rol
cambiar estado
borrar usuarios
```

El propio frontend valida `/api/auth/me`; si el usuario autenticado no es `admin`, redirige a `/dashboard`.

El enlace `Usuarios` en el tablero tambien queda oculto por defecto y solo se muestra despues de confirmar con la API que la sesion pertenece a un `admin`.

La API que respalda esta pantalla es:

```txt
GET   /api/auth/users
POST  /api/auth/users
PATCH /api/auth/users/:id
DELETE /api/auth/users/:id
Authorization: Bearer <token_admin>
```

Crear usuario:

```powershell
$headers = @{ Authorization = "Bearer TU_TOKEN_ADMIN" }
$body = @{
  email = "supervisor@tu-dominio.com"
  name = "Supervisor Evento"
  password = "PasswordTemporal2026"
  role = "supervisor"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body `
  -Uri "https://api-boletas.corporacionceer.com/api/auth/users"
```

Cambiar rol o estado:

```powershell
$headers = @{ Authorization = "Bearer TU_TOKEN_ADMIN" }
$body = @{
  role = "regular"
  status = "active"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Patch `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body `
  -Uri "https://api-boletas.corporacionceer.com/api/auth/users/ID_DEL_USUARIO"
```

Las respuestas nunca incluyen `password_hash`. La API impide degradar o deshabilitar al ultimo `admin` activo para evitar perder acceso administrativo.

El borrado exige una sesion real de usuario `admin`, no solo `ADMIN_API_TOKEN`, porque la API necesita saber quien actua para impedir que un admin se borre a si mismo. Tambien se bloquea borrar al ultimo `admin` activo.

Cuando se quiera conservar trazabilidad de una cuenta de prueba o de un usuario que ya no debe entrar, preferir `status=disabled` antes que borrar.

Cuando un usuario cambia de rol o estado, los guards consultan la base de datos al validar la sesion. Eso permite que `/api/auth/me` devuelva el rol vigente y que un usuario deshabilitado deje de poder usar su token aunque no haya expirado todavia.

## Estado de usuario y cierre de sesion

El dashboard usa `sessionStorage` para conservar la sesion recibida desde el login:

```txt
boletas.auth.user
boletas.auth.token
boletas.auth.expiresAt
```

Al abrir `/dashboard`, el frontend valida primero que esos valores existan y que `expiresAt` no este vencido. Luego consulta:

```txt
GET /api/auth/me
Authorization: Bearer <token>
```

Si la API responde correctamente, el dashboard actualiza `boletas.auth.user` con el usuario real devuelto por el backend. Si la API rechaza el token, no responde con un usuario valido o la sesion local esta vencida, el frontend elimina esos valores y redirige a `/login`.

El boton `Salir` tambien elimina esos valores y redirige a `/login`.

Esta proteccion mejora la experiencia del frontend, pero la seguridad real debe seguir aplicada en la API con guards y roles.

## Limpieza de usuarios de prueba

Si se crea un admin con correo temporal para probar el flujo:

1. Crear o actualizar el admin definitivo con el correo correcto.
2. Validar login con el admin definitivo.
3. En phpMyAdmin, deshabilitar el usuario temporal cambiando `status` a `disabled`.
4. Borrar el usuario temporal solo cuando ya no existan registros o auditorias que se quieran conservar asociados a ese usuario.

La columna `last_login_at` permite confirmar que el login realmente paso por la API.

## Pendientes

1. Conectar vistas operativas reales a los endpoints con rol.
2. Agregar cambio de contrasena desde la pantalla de usuarios.
3. Mejorar manejo visible de expiracion de sesion.
4. Retirar `ADMIN_API_TOKEN` cuando el login cubra todo el uso administrativo.
