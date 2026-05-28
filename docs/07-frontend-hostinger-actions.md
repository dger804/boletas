# Frontend en Hostinger con GitHub Actions

Este flujo despliega el frontend Astro estatico en Hostinger y mantiene el backend en Render.

## Arquitectura

```txt
https://boletas.corporacionceer.com              -> frontend Astro en Hostinger
https://api-boletas.corporacionceer.com/api      -> backend NestJS en Render
```

El build del frontend usa:

```txt
PUBLIC_API_BASE_URL=https://api-boletas.corporacionceer.com/api
```

## Workflow incluido

El archivo `.github/workflows/deploy-frontend.yml`:

1. Se ejecuta al hacer push a `main` cuando cambian archivos del frontend o workspace.
2. Tambien se puede ejecutar manualmente desde GitHub Actions.
3. Instala dependencias con `pnpm install --frozen-lockfile`.
4. Construye `packages/shared`.
5. Construye `apps/web`.
6. Sube solo `apps/web/dist/` a Hostinger por FTPS.

Si los secretos de FTP no existen, el workflow construye el frontend pero salta el despliegue.

## Donde van los comandos

Con esta estrategia, los comandos de instalacion y build no se colocan en Hostinger.

Van en GitHub, dentro del archivo:

```txt
.github/workflows/deploy-frontend.yml
```

Hostinger solo debe tener:

1. El subdominio `boletas.corporacionceer.com`.
2. El directorio publico donde se publican los archivos.
3. Una cuenta FTP o FTPS para que GitHub Actions suba el contenido de `apps/web/dist/`.

No es necesario usar el despliegue Git de Hostinger para este flujo.

## Secretos requeridos en GitHub

En GitHub:

```txt
Repositorio > Settings > Secrets and variables > Actions > New repository secret
```

Crear:

```txt
HOSTINGER_FTP_SERVER
HOSTINGER_FTP_USERNAME
HOSTINGER_FTP_PASSWORD
HOSTINGER_FTP_SERVER_DIR
```

Ejemplo orientativo:

```txt
HOSTINGER_FTP_SERVER=ftp.corporacionceer.com
HOSTINGER_FTP_USERNAME=usuario_ftp
HOSTINGER_FTP_PASSWORD=password_ftp
HOSTINGER_FTP_SERVER_DIR=/public_html/
```

El valor exacto de `HOSTINGER_FTP_SERVER_DIR` depende del directorio raiz del subdominio `boletas.corporacionceer.com` en Hostinger. Debe terminar con `/`.

## Donde obtener los datos en Hostinger

En hPanel:

1. Abrir el sitio o dominio `corporacionceer.com`.
2. Ir a la seccion de archivos o FTP.
3. Crear o revisar una cuenta FTP.
4. Confirmar el directorio raiz del subdominio `boletas.corporacionceer.com`.

Si el FTP apunta directamente al directorio del subdominio, usar:

```txt
HOSTINGER_FTP_SERVER_DIR=/
```

Si el FTP apunta a la raiz general de la cuenta, usar la ruta completa que Hostinger muestre para el subdominio, por ejemplo:

```txt
HOSTINGER_FTP_SERVER_DIR=/domains/corporacionceer.com/public_html/boletas/
```

No subir el repo completo a `public_html`; solo debe subirse el contenido construido de `apps/web/dist/`.

## Ejecutar el primer despliegue

Despues de crear los secretos:

1. Ir a GitHub.
2. Abrir `Actions`.
3. Seleccionar `Deploy Frontend to Hostinger`.
4. Click en `Run workflow`.
5. Elegir rama `main`.
6. Ejecutar.

Cuando termine, verificar:

```txt
https://boletas.corporacionceer.com
```

## Si falla FTPS

El workflow usa `protocol: ftps` y `port: 21`.

Si Hostinger rechaza FTPS, cambiar temporalmente el workflow a:

```yaml
protocol: ftp
port: 21
```

Preferir FTPS cuando Hostinger lo permita porque cifra credenciales y contenido durante la transferencia.

## Validaciones posteriores

Despues del despliegue:

1. Abrir `https://boletas.corporacionceer.com`.
2. Confirmar que el dashboard carga.
3. Confirmar que el backend sigue respondiendo:

```txt
https://api-boletas.corporacionceer.com/api/health
```

4. Si el frontend consume API desde el navegador, verificar que no haya errores CORS en la consola.
