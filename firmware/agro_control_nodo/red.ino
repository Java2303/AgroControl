// Conexión WiFi y envío de la lectura a la API (POST /api/telemetria).

void conectarWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("Conectando a %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (int intento = 0; intento < 40 && WiFi.status() != WL_CONNECTED; intento++) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) Serial.println(" conectado.");
  else Serial.println(" sin conexión, se reintenta en el próximo ciclo.");
}

// Fecha y hora UTC en formato ISO. Si todavía no hay hora de internet, la API usa la del servidor.
String fechaActual() {
  struct tm hora;
  if (!getLocalTime(&hora, 100)) return "";
  char texto[25];
  strftime(texto, sizeof(texto), "%Y-%m-%dT%H:%M:%SZ", &hora);
  return String(texto);
}

void enviarLectura(const Lectura& l) {
  String fecha = fechaActual();
  String campoFecha = fecha.length() > 0 ? "\"fecha\":\"" + fecha + "\"," : "";

  char json[320];
  snprintf(json, sizeof(json),
           "{\"mac\":\"%s\",%s\"humedad\":%.1f,\"temperatura\":%.1f,\"conductividad\":%.0f,"
           "\"ph\":%.1f,\"nitrogeno\":%.0f,\"fosforo\":%.0f,\"potasio\":%.0f,\"emulado\":%s}",
           WiFi.macAddress().c_str(), campoFecha.c_str(),
           l.humedad, l.temperatura, l.conductividad, l.ph, l.nitrogeno, l.fosforo, l.potasio,
           MODO_EMULADOR ? "true" : "false");
  Serial.printf("Envío    > %s\n", json);

  WiFiClientSecure conexion;
  conexion.setInsecure();   // HTTPS cifrado sin validar el certificado; en campo se carga el certificado raíz

  HTTPClient http;
  http.setTimeout(60000);   // el servidor gratuito tarda hasta un minuto en despertar
  http.begin(conexion, API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Dispositivo-Token", DEVICE_TOKEN);   // la API rechaza el envío sin la clave correcta

  int codigo = http.POST((uint8_t*)json, strlen(json));
  String respuesta = codigo > 0 ? http.getString() : http.errorToString(codigo);
  Serial.printf("Servidor < %d %s\n\n", codigo, respuesta.c_str());   // 201 = lectura guardada
  http.end();
}
