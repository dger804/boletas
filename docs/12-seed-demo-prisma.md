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

Opcion recomendada:

```powershell
pnpm.cmd db:seed:local
```

El script pedira la contrasena de MySQL en modo oculto, armara `DATABASE_URL` en memoria y borrara la variable al finalizar.

Si necesitas cambiar host, puerto, base o usuario:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/seed-demo-local.ps1 -DbHost "srv565.hstgr.io" -DbPort 3306 -DbName "u198462083_boletasEventos" -DbUser "u198462083_boletasApp"
```

Alternativa manual en PowerShell:

```powershell
$env:DATABASE_URL="mysql://usuario:password@host:3306/base_de_datos"
pnpm.cmd db:seed
Remove-Item Env:DATABASE_URL
```

El valor real debe salir de Render o Hostinger, no del repositorio.

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

## Siguiente paso

Despues de validar el seed:

1. No conectar el frontend estatico directamente a endpoints protegidos usando `ADMIN_API_TOKEN`.
2. Implementar login y roles para reemplazar el token temporal.
3. Crear una vista frontend que consuma datos reales solo cuando exista un mecanismo seguro: autenticacion, endpoint publico sanitizado o generacion estatica controlada.
4. Mover acciones operativas del seed hacia endpoints protegidos por autorizacion real.
