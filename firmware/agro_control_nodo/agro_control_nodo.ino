/*
 * Agro Control - Nodo IoT (ESP32 + sensor de suelo 7 en 1 por RS485/Modbus RTU)
 *
 * Ciclo: lee los 7 registros del sensor (Cuadro 3.29), verifica el CRC, escala los valores
 * y los envía a POST /api/telemetria con la clave del dispositivo (Cuadro 3.30).
 *
 * MODO_EMULADOR = true: mientras no llega el sensor, el mismo ESP32 hace de sensor en un segundo
 * puerto serie. El maestro Modbus es exactamente el mismo código que leerá el sensor real:
 * solo cambia el cableado. Conexión del emulador (2 cables, sin el MAX485):
 *     GPIO17 (TX2) -> GPIO26 (RX1)
 *     GPIO27 (TX1) -> GPIO16 (RX2)
 *
 * Conexión con el sensor real (MODO_EMULADOR = false), módulo MAX485:
 *     MAX485 VCC -> 3V3     GND -> GND (común con la fuente de 12 V)
 *     MAX485 RO  -> GPIO16  DI  -> GPIO17   DE y RE (puenteados) -> GPIO4
 *     MAX485 A/B -> cables A (amarillo) y B (azul) del sensor; sensor +V a 12 V, GND a GND
 *   El MAX485 se alimenta a 3,3 V para que su salida RO no supere lo que admite el ESP32.
 *
 * Placa en Arduino IDE: "ESP32 Dev Module". Sin librerías externas.
 */
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>
#include <driver/gpio.h>
#include <esp_rom_gpio.h>
#include <soc/gpio_sig_map.h>
#include <soc/gpio_periph.h>
#include <soc/io_mux_reg.h>

// ------------------------------------------------------------------ configuración
// WIFI_SSID, WIFI_PASSWORD y DEVICE_TOKEN van en secretos.h (copia de secretos.ejemplo.h, fuera de git)
#include "secretos.h"
const char* API_URL       = "https://agro-control-api.onrender.com/api/telemetria";
const bool  MODO_EMULADOR = true;
// true: el emulador se conecta al maestro por dentro del chip (matriz de GPIO), sin cables.
// Si el monitor muestra "el sensor no responde", ponerlo en false y usar los 2 cables de la cabecera.
const bool  EMULADOR_SIN_CABLES = true;
// true: la humedad del emulador sale de un sensor capacitivo de humedad de suelo v1.2 real
// (VCC -> 3V3, GND -> GND, AOUT -> GPIO34). Los otros 6 valores siguen emulados.
const bool  HUMEDAD_REAL = false;
// Calibración: el monitor muestra la lectura cruda; anotar el valor con el sensor al aire (seco)
// y sumergido en agua hasta la línea (húmedo) y reemplazarlos aquí.
const int   CRUDO_SECO   = 2800;
const int   CRUDO_HUMEDO = 1200;
const unsigned long INTERVALO_MS = 20000;              // la web refresca cada 15 s

// ------------------------------------------------------------------ pines
const int RX2_PIN = 16, TX2_PIN = 17, DE_RE_PIN = 4;   // maestro Modbus (hacia el MAX485)
const int RX1_PIN = 26, TX1_PIN = 27;                  // emulador del sensor
const int HUMEDAD_PIN = 34;                            // entrada analógica del sensor capacitivo
const uint8_t DIRECCION = 0x01;                        // dirección Modbus del sensor
const uint16_t N_REGISTROS = 7;

struct Lectura { float humedad, temperatura, conductividad, ph, nitrogeno, fosforo, potasio; };

// ------------------------------------------------------------------ Modbus RTU
uint16_t crc16(const uint8_t* datos, size_t n) {
  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < n; i++) {
    crc ^= datos[i];
    for (int b = 0; b < 8; b++) crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : crc >> 1;
  }
  return crc;
}

void imprimirTrama(const char* etiqueta, const uint8_t* t, size_t n) {
  Serial.print(etiqueta);
  for (size_t i = 0; i < n; i++) Serial.printf(" %02X", t[i]);
  Serial.println();
}

// Función 0x03: lee 7 registros desde 0x0000. Devuelve false si no hay respuesta o el CRC no coincide.
bool leerSensor(Lectura& l) {
  uint8_t pedido[8] = { DIRECCION, 0x03, 0x00, 0x00, 0x00, N_REGISTROS };
  uint16_t crc = crc16(pedido, 6);
  pedido[6] = crc & 0xFF; pedido[7] = crc >> 8;

  while (Serial2.available()) Serial2.read();
  digitalWrite(DE_RE_PIN, HIGH);                       // transmitir
  Serial2.write(pedido, sizeof(pedido));
  Serial2.flush();
  digitalWrite(DE_RE_PIN, LOW);                        // escuchar
  imprimirTrama("Modbus >", pedido, sizeof(pedido));

  const size_t esperado = 5 + 2 * N_REGISTROS;          // dir, func, bytes, 14 datos, CRC (2)
  uint8_t r[esperado];
  size_t n = 0;
  unsigned long inicio = millis();
  while (n < esperado && millis() - inicio < 1000) {
    if (Serial2.available()) r[n++] = Serial2.read();
  }
  if (n == 0) { Serial.println("Modbus: el sensor no responde (revise cableado y alimentacion)."); return false; }
  imprimirTrama("Modbus <", r, n);
  if (n < esperado || r[0] != DIRECCION || r[1] != 0x03 || r[2] != 2 * N_REGISTROS) {
    Serial.println("Modbus: respuesta incompleta o inesperada."); return false;
  }
  if (crc16(r, esperado - 2) != (uint16_t)(r[esperado - 2] | (r[esperado - 1] << 8))) {
    Serial.println("Modbus: CRC invalido, se descarta la lectura."); return false;
  }
  auto reg = [&](int i) { return (int16_t)((r[3 + 2 * i] << 8) | r[4 + 2 * i]); };
  // Escalas del Cuadro 3.29; confirmarlas con la hoja de datos del sensor que se compre
  l.humedad       = reg(0) / 10.0;
  l.temperatura   = reg(1) / 10.0;
  l.conductividad = (uint16_t)reg(2);
  l.ph            = reg(3) / 10.0;
  l.nitrogeno     = (uint16_t)reg(4);
  l.fosforo       = (uint16_t)reg(5);
  l.potasio       = (uint16_t)reg(6);
  return true;
}

// ------------------------------------------------------------------ emulador del sensor (Serial1)
// Responde como el sensor 7 en 1: mismos registros, escalas y CRC. Los valores varían lentamente.
uint16_t regsEmulados[N_REGISTROS] = { 523, 248, 430, 64, 96, 58, 141 };

void variarEmulados() {
  const int16_t minimo[N_REGISTROS] = { 380, 200, 250, 55, 60, 35, 90 };
  const int16_t maximo[N_REGISTROS] = { 700, 310, 700, 72, 150, 85, 210 };
  const int16_t paso[N_REGISTROS]   = { 15, 4, 20, 1, 4, 2, 5 };
  for (int i = 0; i < N_REGISTROS; i++) {
    int v = (int)regsEmulados[i] + random(-paso[i], paso[i] + 1);
    regsEmulados[i] = constrain(v, minimo[i], maximo[i]);
  }
}

// Humedad volumétrica aproximada (0 a 100 %) a partir del sensor capacitivo: más agua, menor lectura
uint16_t humedadCapacitivaX10() {
  long suma = 0;
  for (int i = 0; i < 16; i++) suma += analogRead(HUMEDAD_PIN);
  int crudo = suma / 16;
  Serial.printf("Humedad capacitiva: lectura cruda %d (seco %d, humedo %d)\n", crudo, CRUDO_SECO, CRUDO_HUMEDO);
  long x10 = map(crudo, CRUDO_SECO, CRUDO_HUMEDO, 0, 1000);
  return constrain(x10, 0, 1000);
}

void tareaEmulador(void*) {
  uint8_t t[8];
  size_t n = 0;
  unsigned long ultimo = 0;
  for (;;) {
    while (Serial1.available()) {
      if (millis() - ultimo > 50) n = 0;               // silencio entre tramas: empieza una nueva
      ultimo = millis();
      if (n < sizeof(t)) t[n++] = Serial1.read(); else Serial1.read();
    }
    if (n == 8 && millis() - ultimo > 5) {
      bool valida = crc16(t, 6) == (uint16_t)(t[6] | (t[7] << 8)) && t[0] == DIRECCION && t[1] == 0x03;
      uint16_t desde = (t[2] << 8) | t[3], cuantos = (t[4] << 8) | t[5];
      if (valida && desde + cuantos <= N_REGISTROS) {
        variarEmulados();
        if (HUMEDAD_REAL) regsEmulados[0] = humedadCapacitivaX10();   // registro 0x0000: humedad ÷ 10
        uint8_t r[5 + 2 * N_REGISTROS];
        r[0] = DIRECCION; r[1] = 0x03; r[2] = 2 * cuantos;
        for (int i = 0; i < cuantos; i++) { r[3 + 2 * i] = regsEmulados[desde + i] >> 8; r[4 + 2 * i] = regsEmulados[desde + i] & 0xFF; }
        uint16_t crc = crc16(r, 3 + 2 * cuantos);
        r[3 + 2 * cuantos] = crc & 0xFF; r[4 + 2 * cuantos] = crc >> 8;
        Serial1.write(r, 5 + 2 * cuantos);
      }
      n = 0;
    }
    vTaskDelay(1);
  }
}

// ------------------------------------------------------------------ red
void conectarWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("Conectando a %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) { delay(500); Serial.print("."); }
  Serial.println(WiFi.status() == WL_CONNECTED ? " conectado." : " sin conexion; se reintenta en el proximo ciclo.");
}

String horaIso() {
  struct tm t;
  if (!getLocalTime(&t, 100)) return "";               // sin hora NTP: la API usa la del servidor
  char b[25];
  strftime(b, sizeof(b), "%Y-%m-%dT%H:%M:%SZ", &t);
  return String(b);
}

void enviar(const Lectura& l) {
  char json[320];
  String ts = horaIso();
  snprintf(json, sizeof(json),
    "{\"mac\":\"%s\",%s\"humedad\":%.1f,\"temperatura\":%.1f,\"conductividad\":%.0f,"
    "\"ph\":%.1f,\"nitrogeno\":%.0f,\"fosforo\":%.0f,\"potasio\":%.0f,\"emulado\":%s}",
    WiFi.macAddress().c_str(), ts.length() ? ("\"timestamp\":\"" + ts + "\",").c_str() : "",
    l.humedad, l.temperatura, l.conductividad, l.ph, l.nitrogeno, l.fosforo, l.potasio,
    MODO_EMULADOR ? "true" : "false");                // la API marca la lectura para no presentarla como medición
  Serial.printf("JSON  > %s\n", json);

  WiFiClientSecure cliente;
  // shortcut: el canal va cifrado, pero no se valida el certificado del servidor; para el piloto
  // en campo cargar el certificado raíz de la API con cliente.setCACert(...)
  cliente.setInsecure();
  HTTPClient http;
  http.setTimeout(60000);                              // Render gratuito tarda ~50 s en despertar
  http.begin(cliente, API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Dispositivo-Token", DEVICE_TOKEN);
  int codigo = http.POST((uint8_t*)json, strlen(json));
  String respuesta = codigo > 0 ? http.getString() : http.errorToString(codigo);
  Serial.printf("HTTP  < %d %s\n\n", codigo, respuesta.c_str());
  http.end();
}

// ------------------------------------------------------------------ programa
void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(DE_RE_PIN, OUTPUT);
  digitalWrite(DE_RE_PIN, LOW);
  Serial2.begin(9600, SERIAL_8N1, RX2_PIN, TX2_PIN);   // 9600 8N1, igual que el sensor
  if (MODO_EMULADOR) {
    Serial1.begin(9600, SERIAL_8N1, RX1_PIN, TX1_PIN);
    if (EMULADOR_SIN_CABLES) {
      // Cada TX sigue saliendo por su pin y además se lee como RX del otro puerto: TX2 -> RX1 y TX1 -> RX2.
      // Solo se habilita la entrada del pin (gpio_set_direction reemplazaría la salida de la UART por GPIO simple).
      PIN_INPUT_ENABLE(GPIO_PIN_MUX_REG[TX2_PIN]);
      PIN_INPUT_ENABLE(GPIO_PIN_MUX_REG[TX1_PIN]);
      esp_rom_gpio_connect_out_signal(TX2_PIN, U2TXD_OUT_IDX, false, false);
      esp_rom_gpio_connect_out_signal(TX1_PIN, U1TXD_OUT_IDX, false, false);
      esp_rom_gpio_connect_in_signal(TX2_PIN, U1RXD_IN_IDX, false);
      esp_rom_gpio_connect_in_signal(TX1_PIN, U2RXD_IN_IDX, false);
    }
    randomSeed(esp_random());
    xTaskCreatePinnedToCore(tareaEmulador, "emulador", 4096, nullptr, 1, nullptr, 0);
  }

  WiFi.mode(WIFI_STA);
  WiFi.STA.begin();                                    // enciende la radio para poder leer la MAC
  Serial.println("\n=== Agro Control - nodo IoT ===");
  Serial.printf("MAC del dispositivo: %s  (registrela en Parcelas > Sensor)\n", WiFi.macAddress().c_str());
  Serial.printf("Modo: %s\n", !MODO_EMULADOR ? "sensor 7 en 1 real por RS485"
                : EMULADOR_SIN_CABLES ? "EMULADOR del sensor 7 en 1 (Modbus interno, sin cables)"
                : "EMULADOR del sensor 7 en 1 (Modbus por cables GPIO17->26 y 27->16)");
  if (MODO_EMULADOR && HUMEDAD_REAL) Serial.println("Humedad: REAL, sensor capacitivo en GPIO34. Resto de variables: emuladas.");
  conectarWifi();
  configTime(0, 0, "pool.ntp.org", "time.google.com");  // hora UTC, como espera la API
}

void loop() {
  static unsigned long ultimo = 0;
  if (ultimo != 0 && millis() - ultimo < INTERVALO_MS) return;
  ultimo = millis();

  if (strlen(DEVICE_TOKEN) == 0) {
    Serial.printf("Falta DEVICE_TOKEN: vincule la MAC %s en la web, copie la clave y vuelva a cargar el programa.\n",
                  WiFi.macAddress().c_str());
    return;
  }
  Lectura l;
  if (!leerSensor(l)) return;                          // sin lectura valida no se envia nada
  Serial.printf("Lectura: hum %.1f %% | temp %.1f C | CE %.0f uS/cm | pH %.1f | N %.0f P %.0f K %.0f mg/kg\n",
                l.humedad, l.temperatura, l.conductividad, l.ph, l.nitrogeno, l.fosforo, l.potasio);
  conectarWifi();
  if (WiFi.status() == WL_CONNECTED) enviar(l);
}
