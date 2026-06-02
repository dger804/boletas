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

Opcion recomendada con GitHub Actions:

1. Confirmar backup o que la base sigue en fase demo.
2. Crear el secret `DATABASE_URL` en GitHub con el mismo valor configurado en Render.
3. Opcional: crear el secret `ADMIN_API_TOKEN` en GitHub para validar la API al terminar.
4. Abrir `Actions`.
5. Elegir `Seed Demo Database`.
6. Ejecutar `Run workflow`.
7. Escribir `seed-demo` en `confirm`.
8. Activar `verify_api` si `ADMIN_API_TOKEN` existe como secret de GitHub.

El workflow no corre en cada push. Solo corre manualmente y exige confirmacion escrita.

Si `ADMIN_API_TOKEN` no existe en Render ni en GitHub, ejecutar con `verify_api` apagado. El seed puede correr sin ese token porque escribe directo a MySQL usando `DATABASE_URL`; lo unico que se omite es la verificacion HTTP contra endpoints protegidos.

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

## Siguiente paso

Despues de validar el seed:

1. No conectar el frontend estatico directamente a endpoints protegidos usando `ADMIN_API_TOKEN`.
2. Implementar login y roles para reemplazar el token temporal.
3. Crear una vista frontend que consuma datos reales solo cuando exista un mecanismo seguro: autenticacion, endpoint publico sanitizado o generacion estatica controlada.
4. Mover acciones operativas del seed hacia endpoints protegidos por autorizacion real.
