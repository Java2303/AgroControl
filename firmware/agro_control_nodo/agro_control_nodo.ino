/*
 * Agro Control - nodo IoT del lote
 *
 * Cada 20 segundos el ESP32 le pide al sensor de suelo 7 en 1 sus valores (Modbus RTU por RS485),
 * revisa que la respuesta llegue bien (CRC) y la envía a la API con la clave del dispositivo.
 * El nodo no guarda datos: la base de datos está en el servidor (PostgreSQL), no en el ESP32.
 *
 * Pestañas:
 *   modbus    -> pedir y leer los registros del sensor
 *   red       -> WiFi, hora y envío a la API
 *   emulador  -> solo para pruebas: responde como el sensor mientras no está conectado
 *
 * Placa: "ESP32 Dev Module". No usa librerías externas.
 */
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>
#include "secretos.h"   // WIFI_SSID, WIFI_PASSWORD y DEVICE_TOKEN (no se sube a GitHub)

// ---------- configuración
const char* API_URL = "https://agro-control-api.onrender.com/api/telemetria";
const unsigned long INTERVALO_MS = 20000;

// true mientras el sensor 7 en 1 no está conectado. Las lecturas se envían marcadas como emuladas
// y la plataforma nunca las presenta como mediciones.
const bool MODO_EMULADOR = true;

// ---------- pines
// Sensor real con módulo MAX485:  RO -> 16, DI -> 17, DE y RE juntos -> 4, VCC -> 3V3
const int RX_SENSOR = 16;
const int TX_SENSOR = 17;
const int PIN_DE_RE = 4;

// ---------- Modbus
const uint8_t DIRECCION_SENSOR = 0x01;    // dirección de fábrica del sensor
const uint8_t LEER_REGISTROS = 0x03;      // función Modbus "leer registros"
const int CANTIDAD_REGISTROS = 7;         // humedad, temperatura, CE, pH, N, P, K

struct Lectura {
  float humedad, temperatura, conductividad, ph, nitrogeno, fosforo, potasio;
};

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(PIN_DE_RE, OUTPUT);
  digitalWrite(PIN_DE_RE, LOW);                         // el MAX485 empieza escuchando
  Serial2.begin(9600, SERIAL_8N1, RX_SENSOR, TX_SENSOR);  // misma velocidad que el sensor

  if (MODO_EMULADOR) iniciarEmulador();

  WiFi.mode(WIFI_STA);
  WiFi.STA.begin();
  Serial.println("\n=== Agro Control - nodo IoT ===");
  Serial.printf("MAC: %s  (vincularla en Parcelas > Sensor del Lote)\n", WiFi.macAddress().c_str());
  Serial.println(MODO_EMULADOR ? "Modo: emulador (sensor no conectado)" : "Modo: sensor 7 en 1 por RS485");

  conectarWifi();
  configTime(0, 0, "pool.ntp.org");                     // hora UTC para la fecha de la lectura
}

void loop() {
  static unsigned long ultimoEnvio = 0;
  if (ultimoEnvio != 0 && millis() - ultimoEnvio < INTERVALO_MS) return;
  ultimoEnvio = millis();

  if (strlen(DEVICE_TOKEN) == 0) {
    Serial.println("Falta DEVICE_TOKEN en secretos.h: vincule el sensor en la web y copie la clave.");
    return;
  }

  Lectura lectura;
  if (!leerSensor(lectura)) return;                    // si la lectura falla, no se envía nada

  Serial.printf("Lectura: humedad %.1f %% | temp %.1f C | CE %.0f uS/cm | pH %.1f | N %.0f  P %.0f  K %.0f mg/kg\n",
                lectura.humedad, lectura.temperatura, lectura.conductividad, lectura.ph,
                lectura.nitrogeno, lectura.fosforo, lectura.potasio);

  conectarWifi();
  if (WiFi.status() == WL_CONNECTED) enviarLectura(lectura);
}
