# Token administrativo temporal retirado

La API ya usa MySQL real en Render. Los endpoints administrativos empezaron protegidos con un token temporal, pero esa transicion ya termino.

El camino vigente es iniciar sesion en `/api/auth/login` y usar `Authorization: Bearer <token_de_sesion>`. Ver `docs/13-auth-login-roles.md`.

## Estado actual

`ADMIN_API_TOKEN` ya no debe configurarse en Render ni en `.env.example`. Si queda creado como secreto antiguo en Render, se puede eliminar despues de confirmar que el login funciona con un usuario `admin`.

## Endpoints protegidos

La sesion de usuario se exige en:

```txt
/api/events
/api/tickets
/api/payments
/api/audit
/api/auth/users
```

Incluye lectura y escritura porque estos endpoints pueden exponer o modificar datos persistentes. La autorizacion depende del rol vigente del usuario en base de datos.

La ruta de salud sigue publica:

```txt
/api/health
/api/health/db
```

## Como llamar la API

Primero inicia sesion:

```bash
curl -H "Content-Type: application/json" \
  -d '{"email":"admin@tu-dominio.com","password":"TU_PASSWORD"}' \
  https://api-boletas.corporacionceer.com/api/auth/login
```

Luego usa el token devuelto:

```bash
curl -H "Authorization: Bearer TU_TOKEN_DE_SESION" https://api-boletas.corporacionceer.com/api/events
```

## Comportamiento

En produccion y desarrollo:

- Si se usa una sesion de usuario valida, el permiso depende del rol.
- Si falta sesion, la API responde `401`.
- Si la sesion existe pero el rol no alcanza, la API responde `403`.
- `x-admin-token` ya no concede permisos.

Siguiente etapa de seguridad: autorizacion mas granular por evento, boleta, distribuidor y pago cuando existan responsables asignados por usuario.
