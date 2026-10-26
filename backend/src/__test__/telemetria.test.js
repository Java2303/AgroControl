const { validarTelemetria, normalizarMac, generarToken, hashToken, tokenValido } = require('../utils/telemetria');

const AHORA = Date.parse('2026-10-26T15:00:00Z');
const PAQUETE = {
  mac: '00:1a:c2:45:67:89',
  timestamp: '2026-10-26T14:59:30Z',
  humedad: 54.3, temperatura: 24.1, conductividad: 412.6,
  ph: 6.4, nitrogeno: 96, fosforo: 58, potasio: 141,
};

describe('Pruebas Unitarias - Telemetría del nodo ESP32 (validarTelemetria)', () => {
  test('Acepta el paquete del Cuadro 3.30 y lo convierte a las columnas de lecturas_suelo', () => {
    const { errores, datos } = validarTelemetria(PAQUETE, AHORA);
    expect(errores).toEqual([]);
    expect(datos.mac).toBe('00:1A:C2:45:67:89');
    expect(datos.fecha.toISOString()).toBe('2026-10-26T14:59:30.000Z');
    expect(datos.valores).toEqual({
      humedad_suelo: 54.3, temperatura_suelo: 24.1, conductividad_electrica: 413,
      ph: 6.4, nitrogeno: 96, fosforo: 58, potasio: 141,
    });
  });

  test('RN-15: rechaza valores físicamente imposibles (pH 15, humedad 120 %)', () => {
    const { errores, datos } = validarTelemetria({ ...PAQUETE, ph: 15, humedad: 120 }, AHORA);
    expect(datos).toBeNull();
    expect(errores).toHaveLength(2);
    expect(errores[0]).toMatch(/humedad.*fuera del rango/);
    expect(errores[1]).toMatch(/pH.*fuera del rango/);
  });

  test('Rechaza variables faltantes, no numéricas y MAC inválida', () => {
    const { errores } = validarTelemetria({ ...PAQUETE, mac: '00:1A:C2', nitrogeno: 'abc', potasio: undefined }, AHORA);
    expect(errores.some((e) => /MAC/.test(e))).toBe(true);
    expect(errores.some((e) => /nitrógeno es obligatorio/.test(e))).toBe(true);
    expect(errores.some((e) => /potasio es obligatorio/.test(e))).toBe(true);
  });

  test('Usa la hora del servidor si el nodo no la envía o su reloj está desfasado', () => {
    expect(validarTelemetria({ ...PAQUETE, timestamp: undefined }, AHORA).datos.fecha.getTime()).toBe(AHORA);
    expect(validarTelemetria({ ...PAQUETE, timestamp: '2026-10-26T16:00:00Z' }, AHORA).datos.fecha.getTime()).toBe(AHORA);
    expect(validarTelemetria({ ...PAQUETE, timestamp: '1970-01-01T00:00:00Z' }, AHORA).datos.fecha.getTime()).toBe(AHORA);
  });

  test('Normaliza la MAC con guiones o minúsculas', () => {
    expect(normalizarMac('aa-bb-cc-dd-ee-ff')).toBe('AA:BB:CC:DD:EE:FF');
    expect(normalizarMac('AABBCCDDEEFF')).toBeNull();
  });

  test('La clave del dispositivo se valida contra su hash y no por igualdad del texto', () => {
    const token = generarToken();
    const hash = hashToken(token);
    expect(hash).toHaveLength(64);
    expect(tokenValido(token, hash)).toBe(true);
    expect(tokenValido(token + 'x', hash)).toBe(false);
    expect(tokenValido(undefined, hash)).toBe(false);
    expect(tokenValido(token, null)).toBe(false);
  });
});
