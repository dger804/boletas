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

Incluye lectura y escritura porque estos endpoints pueden exponer o modificar datos persistentes.

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

- Si `ADMIN_API_TOKEN` no existe, los endpoints protegidos responden `503`.
- Si el token es incorrecto o falta, responden `401`.
- Si el token es correcto, la peticion continua.

En desarrollo local sin `ADMIN_API_TOKEN`, el guard permite continuar para no bloquear el aprendizaje ni los tests iniciales.

## Limite de esta solucion

Este token no reemplaza autenticacion real. Debe retirarse cuando el login y los roles cubran todo el flujo administrativo.

Siguiente etapa de seguridad:

1. Pantalla de login.
2. Roles aplicados por endpoint y flujo.
3. Autorizacion por evento, boleta, distribuidor y pago.
4. Eliminacion del token temporal.
