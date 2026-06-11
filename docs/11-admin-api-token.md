# Token administrativo temporal

La API ya usa MySQL real en Render. Los endpoints administrativos empezaron protegidos con un token temporal.

Desde la etapa de login, este token queda como puente de transicion. El camino recomendado para nuevas pantallas administrativas es iniciar sesion en `/api/auth/login` y usar `Authorization: Bearer <token_de_sesion>`. Ver `docs/13-auth-login-roles.md`.

## Variable requerida en Render

En el servicio `boletas-api`:

```txt
Key: ADMIN_API_TOKEN
Value: generar un secreto largo y privado
```

No guardar el valor real en GitHub, README, docs ni `.env.example`.

## Endpoints protegidos

El token se exige en:

```txt
/api/events
/api/tickets
/api/payments
```

Incluye lectura y escritura porque estos endpoints pueden exponer o modificar datos persistentes. Desde la autorizacion por roles, una sesion de usuario tambien puede llamar estos endpoints cuando su rol lo permite. El token temporal se interpreta como rol `admin`.

La ruta de salud sigue publica:

```txt
/api/health
/api/health/db
```

## Como llamar la API

Opcion recomendada:

```bash
curl -H "x-admin-token: TU_TOKEN" https://api-boletas.corporacionceer.com/api/events
```

Tambien se acepta el token temporal como bearer:

```bash
curl -H "Authorization: Bearer TU_TOKEN" https://api-boletas.corporacionceer.com/api/events
```

## Comportamiento

En produccion:

- Si se usa una sesion de usuario valida, el permiso depende del rol.
- Si se usa `ADMIN_API_TOKEN` correcto, la peticion continua como rol `admin`.
- Si falta sesion/token, responden `401`.
- Si la sesion existe pero el rol no alcanza, responden `403`.

En desarrollo local, los endpoints operativos nuevos deben probarse con una sesion real. El bypass sin `ADMIN_API_TOKEN` queda limitado a piezas antiguas de transicion y no debe usarse como comportamiento esperado.

## Limite de esta solucion

Este token no reemplaza autenticacion real. Debe retirarse cuando el login y los roles cubran todo el flujo administrativo.

Siguiente etapa de seguridad:

1. Pantalla de login.
2. Roles aplicados por endpoint y flujo.
3. Autorizacion por evento, boleta, distribuidor y pago.
4. Eliminacion del token temporal.
