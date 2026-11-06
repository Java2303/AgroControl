# Estado del proyecto — Agro Control

Resumen para retomar el trabajo en otra computadora (o con un asistente nuevo). Actualizado el 5/11/2026.
Las contraseñas y la clave del nodo **no** van aquí: el repositorio es público.

## Qué es

Sistema de gestión y trazabilidad de suelos del CIAT (proyecto de grado de José Alberto Vargas Aguilera).
Parcelas georreferenciadas, nodo IoT ESP32 con sensor de suelo 7 en 1, motor de reglas con la tabla del CIAT,
bitácora de labores, certificado de suelo verificable y app Android.

## Dónde corre

| Parte | Dirección | Despliegue |
|---|---|---|
| Web | https://agro-control-theta.vercel.app | Vercel, automático al hacer push a `main` |
| API | https://agro-control-api.onrender.com/api | Render, automático al hacer push (plan gratuito: tarda ~50 s en despertar) |
| Base de datos | Neon (PostgreSQL + PostGIS) | Migraciones con `npm run db:init` en `backend/` |

Detalle de despliegue y variables de entorno: [DESPLIEGUE.md](DESPLIEGUE.md).

## Estructura

- `app/`, `components/`, `lib/`: interfaz Next.js 16 + React 19 + Tailwind. `app/verificar` es la página pública del certificado.
- `backend/`: API Express 5. `src/controllers`, `src/routes`, `src/services` (motor de reglas, tabla del CIAT, simulador), `src/utils`, `db/migraciones` (idempotentes).
- `android/`: proyecto Capacitor 7.
- `firmware/agro_control_nodo/`: firmware del ESP32 (Arduino IDE, placa "ESP32 Dev Module", paquete esp32 3.3.x, sin librerías externas).

## Roles

- **Agrónomo**: registra parcelas, vincula sensores, carga labores y emite certificados.
- **Productor Asociado** (`productor` en la base): solo consulta.
- **Administrador CIAT** (`admin_ciat`): ve todas las parcelas de la institución, gestiona solo las propias. Se crea con `npm run admin:crear` (ver DESPLIEGUE.md).

## Nodo ESP32

- MAC del nodo de pruebas: `1C:C3:AB:C1:7C:5C`.
- El sensor 7 en 1 todavía no llegó: el firmware usa `MODO_EMULADOR = true` y `EMULADOR_SIN_CABLES = true`, responde las tramas Modbus por dentro del chip y envía `"emulado": true`. La API guarda la lectura como emulada y el certificado lo declara (RN-10).
- Credenciales en `firmware/agro_control_nodo/secretos.h` (copia de `secretos.ejemplo.h`, ignorado por git): `WIFI_SSID`, `WIFI_PASSWORD` (red de 2,4 GHz), `DEVICE_TOKEN`.
- La clave se obtiene en la app: Parcelas → ícono de sensor → Vincular (se muestra una sola vez; "Generar Nueva Clave" la reemplaza). Una MAC solo puede estar en una parcela: desvincular antes de moverla.
- Prueba sin hardware: `npm run nodo:simular -- <url_api> <mac> <clave>` en `backend/`.

## Comandos

```bash
# Pruebas (41)
cd backend && npx jest

# Web local
npm run dev            # interfaz
cd backend && npm run dev   # API (necesita backend/.env)

# APK (JDK 21 y Android SDK)
NEXT_PUBLIC_API_URL=https://agro-control-api.onrender.com/api npm run build:mobile
cd android && ./gradlew assembleDebug   # → app/build/outputs/apk/debug/app-debug.apk
```

`npm run build:mobile` a veces se corta con un aviso de seguridad de Next.js 16.4.0: volver a ejecutarlo. Sin `NEXT_PUBLIC_API_URL`, el APK apunta a localhost y no funciona en el teléfono.

## Estado de las pruebas

- 41 pruebas unitarias aprobadas (dominio, seguridad, bitácora, telemetría, tabla del CIAT, certificado).
- Aceptación en el sistema publicado: PA-01 a PA-22, salvo PA-10 (división en lotes, observada).
- Nodo ESP32 real enviando a la API (HTTP 201) con valores emulados; APK probado en un teléfono Android 12.

## Pendiente

- Conectar el sensor 7 en 1 cuando llegue y poner `MODO_EMULADOR = false`.
- División automática de parcelas mayores a 15 ha en hasta cuatro lotes (RN-03).
- Prueba de usabilidad (SUS) con el CIAT.
- Pantalla para que el agrónomo asigne parcelas a un productor asociado.
- Actualizar Next.js (16.4.0 tiene un aviso de seguridad).

## Documento de la tesis

No está en el repositorio. Versión vigente: `Proyecto de Grado V8- AGRO CONTROL.docx` (143 páginas), en la carpeta padre `AGRO-CONTROL/`, junto con su PDF, las diapositivas de la defensa y el PDF para imprimir.

## Convenciones

- Interfaz en español; botones y títulos con mayúscula en cada palabra ("Nueva Parcela").
- Una lectura emulada o simulada nunca se presenta como medición.
- Commits agregando archivos por nombre, nunca `git add -A`: los secretos (`backend/.env`, `secretos.h`) no deben llegar al repositorio.
