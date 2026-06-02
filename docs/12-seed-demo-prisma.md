# Seed demo con Prisma

Este seed crea datos demo en MySQL para probar la API persistente sin usar datos reales de compradores.

## Proposito

Permite validar:

- listado de eventos;
- tablero de evento;
- distribuidores;
- boletas en varios estados;
- evidencias de pago aprobadas y pendientes;
- check-in de una boleta usada.

## Datos creados

El seed usa ids estables y es idempotente:

```txt
Evento: evt_demo
Distribuidores: 3
Boletas: 7
Evidencias de pago: 4
Auditoria: 1 registro demo
```

Si se ejecuta varias veces, actualiza solo esos registros demo. No borra datos reales ni toca otros eventos.

Si un intento anterior fallo despues de crear boletas, el seed vuelve a enlazarlas por codigo dentro de `evt_demo` antes de crear pagos. No es necesario borrar registros manualmente por ese fallo.

## Requisito

Debe existir `DATABASE_URL` en el entorno donde se ejecuta el comando.

No guardar el valor real en GitHub, docs, commits, capturas ni `.env.example`.

## Ejecucion local contra MySQL

En PowerShell, usar una variable temporal de sesion:

```powershell
$env:DATABASE_URL="mysql://usuario:password@host:3306/base_de_datos"
pnpm.cmd db:seed
Remove-Item Env:DATABASE_URL
```

El valor real debe salir de Render o Hostinger, no del repositorio.

## Ejecucion en produccion

Opcion recomendada con GitHub Actions + Render one-off job:

1. Confirmar backup o que la base sigue en fase demo.
2. Confirmar que Render tiene `DATABASE_URL` configurado en el servicio `boletas-api`.
3. Crear un API key en Render.
4. Crear estos secrets en GitHub Actions:

```txt
RENDER_API_KEY
RENDER_SERVICE_ID
```

El `RENDER_SERVICE_ID` se toma de la URL del servicio en Render. Empieza por `srv-`.

5. Opcional: crear el secret `ADMIN_API_TOKEN` en GitHub para validar la API al terminar.
6. Abrir `Actions`.
7. Elegir `Seed Demo Database`.
8. Ejecutar `Run workflow`.
9. Escribir `seed-demo` en `confirm`.
10. Activar `verify_api` si `ADMIN_API_TOKEN` existe como secret de GitHub.

El workflow no corre en cada push. Solo corre manualmente y exige confirmacion escrita.

GitHub no se conecta directo a MySQL porque Hostinger puede bloquear el puerto `3306` desde los runners de GitHub. El workflow pide a Render crear un one-off job con `pnpm db:seed`. Ese job hereda las variables del servicio `boletas-api`, incluyendo `DATABASE_URL`.

Si `ADMIN_API_TOKEN` no existe en Render ni en GitHub, ejecutar con `verify_api` apagado. El seed puede correr sin ese token porque escribe directo a MySQL desde Render usando `DATABASE_URL`; lo unico que se omite es la verificacion HTTP contra endpoints protegidos.

Opcion local:

```powershell
$env:DATABASE_URL="mysql://usuario:password@host:3306/base_de_datos"
pnpm.cmd db:seed
Remove-Item Env:DATABASE_URL
```

Ejemplo de verificacion manual:

```powershell
$headers = @{ "x-admin-token" = "TU_TOKEN" }
Invoke-RestMethod -Headers $headers -Uri "https://api-boletas.corporacionceer.com/api/events"
Invoke-RestMethod -Headers $headers -Uri "https://api-boletas.corporacionceer.com/api/events/evt_demo/dashboard"
```

## Riesgos y limites

- Es data demo, no data real.
- Reejecutar el seed resetea los registros demo a los valores definidos en `apps/api/prisma/seed.ts`.
- No reemplaza un flujo administrativo real para crear eventos y boletas.
- No debe usarse para cargar evidencias reales de pago.
- No habilitar este workflow por `push`; debe seguir siendo manual.
- El one-off job de Render puede generar costo segun el plan y el tiempo de ejecucion.

## Siguiente paso

Despues de validar el seed:

1. No conectar el frontend estatico directamente a endpoints protegidos usando `ADMIN_API_TOKEN`.
2. Implementar login y roles para reemplazar el token temporal.
3. Crear una vista frontend que consuma datos reales solo cuando exista un mecanismo seguro: autenticacion, endpoint publico sanitizado o generacion estatica controlada.
4. Mover acciones operativas del seed hacia endpoints protegidos por autorizacion real.
