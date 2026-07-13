# Checklist MVP: ciclo completo de boletas

Esta guia valida que el MVP cubre el flujo operativo completo sin exponer secretos ni depender de datos reales.

## Objetivo

Demostrar que una boleta puede pasar por todo el ciclo:

```txt
evento -> usuarios -> responsables -> lote -> asignacion -> reserva opcional -> venta -> pago pendiente -> pago aprobado -> ingreso -> corte -> cierre
```

## Precondiciones

- `main` desplegado en Render y Hostinger.
- Migraciones Prisma aplicadas en Render durante el build.
- `AUTH_TOKEN_SECRET`, `DATABASE_URL` y `CORS_ORIGIN` configurados en Render.
- `ADMIN_API_TOKEN` no configurado ni usado.
- Usuario `admin` activo.
- Al menos un usuario `supervisor` activo.
- Al menos un usuario `regular` activo.

No pegues contrasenas, tokens ni URLs con credenciales en chats, commits o capturas.

## Prueba operativa

1. Entrar a `/login` con usuario `admin`.
2. Ir a `/users` y confirmar que existen usuarios `admin`, `supervisor` y `regular` activos.
3. Ir a `/events` y crear un evento de prueba con estado `active`.
4. Ir a `/tickets`, seleccionar el evento y crear un responsable.
5. Como `admin`, vincular ese responsable con la cuenta `regular`.
6. Crear un lote pequeno de boletas, por ejemplo 2 boletas.
7. Asignar una boleta al responsable vinculado.
8. Cerrar sesion e iniciar sesion como usuario `regular`.
9. En `/tickets`, confirmar que solo aparecen boletas dentro de su alcance.
10. Reservar la boleta asignada.
11. Registrar venta con metodo `transfer` o `cash`.
12. Cerrar sesion e iniciar sesion como `supervisor` o `admin`.
13. Ir a `/payments` y aprobar la evidencia pendiente.
14. Cerrar sesion e iniciar sesion como `regular`.
15. Ir a `/check-in` y registrar ingreso de la boleta pagada.
16. Entrar a `/dashboard` y confirmar totales de vendidas, pagadas y usadas.
17. Entrar a `/closeout` con `supervisor` o `admin` y revisar recaudo, entrada y pendientes.
18. Entrar a `/audit` con `supervisor` o `admin` y confirmar acciones recientes.
19. Entrar a `/events` como `admin` y cambiar el evento a `closed`.
20. Confirmar que ventas, asignaciones, pagos e ingreso quedan bloqueados para ese evento cerrado.

## Resultado esperado

- El usuario `regular` no ve ni opera boletas fuera de su responsable vinculado.
- La venta crea una evidencia `pending`.
- La aprobacion de pago cambia la boleta a `paid`.
- El check-in cambia la boleta a `used` y registra el usuario autenticado como responsable del ingreso.
- El dashboard publico/protegido no revela compradores, telefonos, referencias ni URLs de evidencia.
- El corte operativo muestra recaudo aprobado, capitalizacion, entrada y pendientes.
- El evento `closed` conserva lecturas historicas y bloquea cambios operativos.

## Validacion tecnica local

Antes de considerar el hito listo:

```powershell
pnpm.cmd test
pnpm.cmd typecheck
pnpm.cmd build
```

La prueba automatizada `completes the MVP ticket lifecycle from event setup to closeout` cubre el ciclo principal en memoria. La prueba manual anterior valida permisos, UI, despliegue y base real.

## Limpieza despues de probar

- Si el evento fue solo de prueba, dejarlo en `closed`.
- Deshabilitar usuarios temporales desde `/users` antes de borrarlos.
- No borrar auditoria si sirve para trazabilidad de la prueba.
- Confirmar que no se subieron capturas con compradores, telefonos, referencias o evidencias reales.
