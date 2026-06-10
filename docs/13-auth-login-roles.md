# Login y roles iniciales

Esta etapa agrega autenticacion de usuarios sin romper el `ADMIN_API_TOKEN` temporal.

## Objetivo

Permitir que la API acepte sesiones de usuario firmadas para operaciones administrativas, como paso previo a construir pantallas reales de eventos, boletas, pagos y entrada.

## Roles iniciales

```txt
admin   -> administra eventos, boletas, distribuidores y pagos
seller  -> futuro rol para vendedores o distribuidores
gate    -> futuro rol para control de entrada
```

En este corte, solo `admin` puede reemplazar al `ADMIN_API_TOKEN` en endpoints protegidos.

## Variables en Render

Agregar en el servicio `boletas-api`:

```txt
AUTH_TOKEN_SECRET=secreto_largo_aleatorio
AUTH_TOKEN_TTL_SECONDS=28800
```

`AUTH_TOKEN_SECRET` debe ser diferente de `ADMIN_API_TOKEN`.

No guardar valores reales en GitHub, docs, capturas ni `.env.example`.

## Migracion

La migracion `20260609223500_add_app_users` crea la tabla:

```txt
app_users
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

## Limpieza de usuarios de prueba

Si se crea un admin con correo temporal para probar el flujo:

1. Crear o actualizar el admin definitivo con el correo correcto.
2. Validar login con el admin definitivo.
3. En phpMyAdmin, deshabilitar el usuario temporal cambiando `status` a `disabled`.
4. Borrar el usuario temporal solo cuando ya no existan registros o auditorias que se quieran conservar asociados a ese usuario.

La columna `last_login_at` permite confirmar que el login realmente paso por la API.

## Pendientes

1. Crear pantalla de login en el frontend.
2. Cambiar pantallas operativas para usar sesion de usuario.
3. Agregar autorizacion por rol a cada flujo.
4. Retirar `ADMIN_API_TOKEN` cuando el login cubra todo el uso administrativo.
