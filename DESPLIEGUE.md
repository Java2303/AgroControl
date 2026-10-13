# Manual de despliegue — Agro Control

Arquitectura en producción (plan gratuito):

| Capa | Servicio | URL de ejemplo |
|---|---|---|
| Interfaz web (Next.js) | Vercel | `https://agro-control.vercel.app` |
| API REST (Express) | Render | `https://agro-control-api.onrender.com/api` |
| Base de datos (PostgreSQL + PostGIS) | Neon, región AWS us-east-2 (Ohio) | — |
| App Android (Capacitor) | APK generado en local | consume la API de Render |

Todo el tráfico va por HTTPS, así que la app Android ya no necesita HTTP sin cifrar.

> **Limitaciones del plan gratuito.** La API de Render se suspende tras 15 minutos sin uso: la primera solicitud después de eso tarda unos 50 segundos, y el simulador de sensores se pausa mientras está suspendida. Neon suspende la base tras 5 minutos inactiva y la reactiva en menos de un segundo. Para una demostración, abre la web unos minutos antes.

---

## 1. Base de datos en Neon

1. Entra a <https://neon.tech> y crea una cuenta con GitHub.
2. Crea un proyecto llamado `agro-control`, con PostgreSQL 17 o superior y región **AWS US East 2 (Ohio)**.
3. En **Connection Details**, copia la *connection string*. Tiene esta forma:
   `postgresql://usuario:clave@ep-xxxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`
4. Crea las tablas y el catálogo desde tu PC (PowerShell, en la carpeta `backend`):

   ```powershell
   $env:DATABASE_URL = "pega-aquí-la-connection-string"
   npm run db:init
   ```

   Debe responder `Esquema creado…` y `Catálogo sincronizado: 14 cultivos del CIAT.` Puedes ejecutarlo de nuevo sin riesgo.

## 2. API en Render

1. Entra a <https://render.com> con GitHub y autoriza el acceso al repositorio `AgroControl`.
2. Ve a **New → Blueprint** y elige el repositorio. Render lee `render.yaml` y propone el servicio `agro-control-api`.
3. Completa las variables que pide:
   - `DATABASE_URL`: la connection string de Neon.
   - `CORS_ORIGINS`: por ahora `https://localhost`. La completarás en el paso 4.
   - `JWT_SECRET` lo genera Render automáticamente.
4. Pulsa **Apply**. Cuando termine, abre `https://<tu-servicio>.onrender.com/test-db`. Debe responder `"status":"success"`.

## 3. Interfaz web en Vercel

1. Entra a <https://vercel.com> con GitHub y pulsa **Add New → Project**. Importa `AgroControl`.
2. Vercel detecta Next.js. En **Environment Variables** agrega:
   - `NEXT_PUBLIC_API_URL` = `https://<tu-servicio>.onrender.com/api`
3. Pulsa **Deploy** y copia la URL final (por ejemplo `https://agro-control.vercel.app`).

## 4. Conectar web y API (CORS)

En Render, ve a **agro-control-api → Environment** y cambia `CORS_ORIGINS` a:

```
https://agro-control.vercel.app,https://localhost
```

Usa tu URL real de Vercel. `https://localhost` es el origen de la app Android. Al guardar, Render redespliega solo.

## 5. Cuentas de prueba

1. Regístrate desde la web publicada con dos cuentas: un *Técnico Agrónomo* y un *Productor Agrícola*.
2. Carga parcelas de ejemplo solo para esas cuentas (PowerShell, en `backend`):

   ```powershell
   $env:DATABASE_URL = "connection-string-de-neon"
   npm run db:seed-demo -- correo-agronomo@dominio correo-productor@dominio
   ```

## 6. App Android (APK)

En la raíz del proyecto:

```powershell
$env:NEXT_PUBLIC_API_URL = "https://<tu-servicio>.onrender.com/api"
npm run build:mobile
npm run cap:android
```

En Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

## Actualizaciones

Cada `git push` a `main` redespliega Vercel y Render automáticamente.

## Dominio propio (opcional, más adelante)

Cuando tengas un dominio, agrégalo en Vercel (**Settings → Domains**) para la web. Si quieres, agrega un subdominio `api.` en Render (**Settings → Custom Domains**). Luego actualiza `NEXT_PUBLIC_API_URL` en Vercel y `CORS_ORIGINS` en Render. Ambos servicios emiten el certificado HTTPS gratis.

## Variables de entorno

| Variable | Dónde | Descripción |
|---|---|---|
| `DATABASE_URL` | Render | Conexión a Neon (incluye `sslmode=require`) |
| `JWT_SECRET` | Render | Secreto para firmar sesiones (mínimo 32 caracteres; la API no arranca sin él) |
| `CORS_ORIGINS` | Render | Orígenes permitidos, separados por coma |
| `SIMULAR_SENSORES` | Render | `true` mientras no haya nodos ESP32 reales |
| `NEXT_PUBLIC_API_URL` | Vercel y build móvil | URL pública de la API, terminada en `/api` |
