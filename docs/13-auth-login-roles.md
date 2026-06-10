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

En este corte, solo `admin` puede reemplazar al `ADMIN_API_TOKEN` en endpoints protegidos y administrar usuarios.

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

Durante la transicion, los endpoints administrativos siguen aceptando `ADMIN_API_TOKEN`.

## Administrar usuarios

Los usuarios `admin` pueden listar, crear y actualizar cuentas desde la API:

```txt
GET   /api/auth/users
POST  /api/auth/users
PATCH /api/auth/users/:id
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

1. Cambiar pantallas operativas para usar endpoints protegidos con sesion de usuario.
2. Crear pantalla web para administrar usuarios sin usar llamadas manuales.
3. Agregar autorizacion por rol a cada flujo operativo.
4. Mejorar manejo visible de expiracion de sesion.
5. Retirar `ADMIN_API_TOKEN` cuando el login cubra todo el uso administrativo.
