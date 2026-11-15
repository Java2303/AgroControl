// Lectura del sensor 7 en 1 por Modbus RTU.
// El ESP32 es el maestro: envía un pedido y el sensor (dirección 1) responde con 7 registros.

// CRC-16 de Modbus: el que envía lo agrega al final y el que recibe lo recalcula para
// saber si la trama llegó sin errores.
uint16_t calcularCrc(const uint8_t* datos, int largo) {
  uint16_t crc = 0xFFFF;
  for (int i = 0; i < largo; i++) {
    crc ^= datos[i];
    for (int bit = 0; bit < 8; bit++) {
      if (crc & 1) crc = (crc >> 1) ^ 0xA001;
      else crc = crc >> 1;
    }
  }
  return crc;
}

void mostrarTrama(const char* texto, const uint8_t* trama, int largo) {
  Serial.print(texto);
  for (int i = 0; i < largo; i++) Serial.printf(" %02X", trama[i]);
  Serial.println();
}

bool leerSensor(Lectura& lectura) {
  // Pedido: dirección, función, registro inicial (0x0000), cantidad (7) y CRC
  uint8_t pedido[8] = { DIRECCION_SENSOR, LEER_REGISTROS, 0x00, 0x00, 0x00, CANTIDAD_REGISTROS, 0, 0 };
  uint16_t crc = calcularCrc(pedido, 6);
  pedido[6] = crc & 0xFF;
  pedido[7] = crc >> 8;

  while (Serial2.available()) Serial2.read();          // descarta restos de una trama anterior
  digitalWrite(PIN_DE_RE, HIGH);                        // MAX485 en modo transmitir
  Serial2.write(pedido, 8);
  Serial2.flush();
  digitalWrite(PIN_DE_RE, LOW);                         // vuelve a escuchar
  mostrarTrama("Pedido   >", pedido, 8);

  // Respuesta: dirección, función, cantidad de bytes, 14 bytes de datos y CRC = 19 bytes
  const int LARGO_RESPUESTA = 5 + 2 * CANTIDAD_REGISTROS;
  uint8_t respuesta[LARGO_RESPUESTA];
  int recibidos = 0;
  unsigned long inicio = millis();
  while (recibidos < LARGO_RESPUESTA && millis() - inicio < 1000) {
    if (Serial2.available()) respuesta[recibidos++] = Serial2.read();
  }

  if (recibidos == 0) {
    Serial.println("El sensor no responde: revisar cables y alimentación.");
    return false;
  }
  mostrarTrama("Respuesta<", respuesta, recibidos);
  if (recibidos < LARGO_RESPUESTA || respuesta[0] != DIRECCION_SENSOR || respuesta[1] != LEER_REGISTROS) {
    Serial.println("Respuesta incompleta o de otro dispositivo.");
    return false;
  }
  uint16_t crcRecibido = respuesta[LARGO_RESPUESTA - 2] | (respuesta[LARGO_RESPUESTA - 1] << 8);
  if (calcularCrc(respuesta, LARGO_RESPUESTA - 2) != crcRecibido) {
    Serial.println("CRC incorrecto: la trama llegó dañada y se descarta.");
    return false;
  }

  // Cada registro ocupa 2 bytes. Escalas según la hoja de datos del sensor:
  // humedad, temperatura y pH vienen multiplicados por 10.
  lectura.humedad       = registro(respuesta, 0) / 10.0;
  lectura.temperatura   = registro(respuesta, 1) / 10.0;
  lectura.conductividad = registro(respuesta, 2);
  lectura.ph            = registro(respuesta, 3) / 10.0;
  lectura.nitrogeno     = registro(respuesta, 4);
  lectura.fosforo       = registro(respuesta, 5);
  lectura.potasio       = registro(respuesta, 6);
  return true;
}

int registro(const uint8_t* respuesta, int numero) {
  return (int16_t)((respuesta[3 + 2 * numero] << 8) | respuesta[4 + 2 * numero]);
}
