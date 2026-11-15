// EMULADOR DEL SENSOR (solo para pruebas, mientras el sensor 7 en 1 no está conectado)
//
// Corre en el segundo núcleo del ESP32 y se comporta como el sensor: recibe el pedido Modbus por
// el puerto Serial1, comprueba su CRC y responde con 7 registros. Así se prueba todo el camino
// (pedido, CRC, escalas, envío a la API) con el mismo código que leerá el sensor real.
// Los valores no son mediciones: parten de un punto típico y cambian un poco en cada pedido.
// Al conectar el sensor se pone MODO_EMULADOR = false y esta pestaña deja de usarse.
//
// Unión con el maestro por dentro del chip (no hacen falta cables): la salida TX de cada puerto
// se conecta también a la entrada RX del otro, TX2 (17) -> RX1 y TX1 (27) -> RX2.

#include <esp_rom_gpio.h>
#include <soc/gpio_sig_map.h>
#include <soc/io_mux_reg.h>
#include <soc/gpio_periph.h>

const int TX_EMULADOR = 27;
const int RX_EMULADOR = 26;

// Valor inicial de cada registro, tal como lo enviaría el sensor (humedad, temperatura y pH x 10)
//                          hum  temp  CE   pH  N   P   K
int registrosEmulados[7] = { 523, 248, 430, 64, 96, 58, 141 };
const int minimos[7]     = { 380, 200, 250, 55, 60, 35, 90 };
const int maximos[7]     = { 700, 310, 700, 72, 150, 85, 210 };
const int pasos[7]       = { 15, 4, 20, 1, 4, 2, 5 };

void iniciarEmulador() {
  Serial1.begin(9600, SERIAL_8N1, RX_EMULADOR, TX_EMULADOR);

  PIN_INPUT_ENABLE(GPIO_PIN_MUX_REG[TX_SENSOR]);
  PIN_INPUT_ENABLE(GPIO_PIN_MUX_REG[TX_EMULADOR]);
  esp_rom_gpio_connect_out_signal(TX_SENSOR, U2TXD_OUT_IDX, false, false);
  esp_rom_gpio_connect_out_signal(TX_EMULADOR, U1TXD_OUT_IDX, false, false);
  esp_rom_gpio_connect_in_signal(TX_SENSOR, U1RXD_IN_IDX, false);
  esp_rom_gpio_connect_in_signal(TX_EMULADOR, U2RXD_IN_IDX, false);

  randomSeed(esp_random());
  xTaskCreatePinnedToCore(tareaEmulador, "emulador", 4096, nullptr, 1, nullptr, 0);
}

void cambiarValores() {
  for (int i = 0; i < 7; i++) {
    int nuevo = registrosEmulados[i] + random(-pasos[i], pasos[i] + 1);
    registrosEmulados[i] = constrain(nuevo, minimos[i], maximos[i]);
  }
}

void responderPedido(const uint8_t* pedido) {
  int desde = (pedido[2] << 8) | pedido[3];
  int cantidad = (pedido[4] << 8) | pedido[5];
  if (desde + cantidad > 7) return;

  cambiarValores();
  uint8_t respuesta[19];
  respuesta[0] = DIRECCION_SENSOR;
  respuesta[1] = LEER_REGISTROS;
  respuesta[2] = 2 * cantidad;
  for (int i = 0; i < cantidad; i++) {
    respuesta[3 + 2 * i] = registrosEmulados[desde + i] >> 8;
    respuesta[4 + 2 * i] = registrosEmulados[desde + i] & 0xFF;
  }
  uint16_t crc = calcularCrc(respuesta, 3 + 2 * cantidad);
  respuesta[3 + 2 * cantidad] = crc & 0xFF;
  respuesta[4 + 2 * cantidad] = crc >> 8;
  Serial1.write(respuesta, 5 + 2 * cantidad);
}

void tareaEmulador(void*) {
  uint8_t pedido[8];
  int recibidos = 0;
  unsigned long ultimoByte = 0;

  while (true) {
    while (Serial1.available()) {
      if (millis() - ultimoByte > 50) recibidos = 0;  // una pausa marca el inicio de un pedido nuevo
      ultimoByte = millis();
      uint8_t b = Serial1.read();
      if (recibidos < 8) pedido[recibidos++] = b;
    }
    if (recibidos == 8 && millis() - ultimoByte > 5) {
      uint16_t crcRecibido = pedido[6] | (pedido[7] << 8);
      bool valido = pedido[0] == DIRECCION_SENSOR && pedido[1] == LEER_REGISTROS && calcularCrc(pedido, 6) == crcRecibido;
      if (valido) responderPedido(pedido);
      recibidos = 0;
    }
    vTaskDelay(1);
  }
}
