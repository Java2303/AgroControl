const { generarRecomendacionesReglas } = require('../services/motorReglas');

describe('Pruebas Unitarias - Motor de Reglas (Recomendaciones agronómicas)', () => {

  test('Sin lecturas, debería invitar a registrar parcelas', () => {
    const recomendaciones = generarRecomendacionesReglas([]);
    expect(recomendaciones[0].priority).toBe('info');
    expect(recomendaciones[0].text).toMatch(/Registre parcelas/);
  });

  test('Debería recomendar encalado cuando el pH es menor a 6.0', () => {
    const recomendaciones = generarRecomendacionesReglas([
      { parcelName: 'Lote A', humidity: 55, nitrogen: 100, ph: 5.4 }
    ]);
    expect(recomendaciones.some(r => /encalado/.test(r.text))).toBe(true);
  });

  test('Debería alertar riego y nitrógeno bajo en la misma parcela', () => {
    const recomendaciones = generarRecomendacionesReglas([
      { parcelName: 'Lote B', humidity: 32, nitrogen: 60, ph: 6.5 }
    ]);
    const avisos = recomendaciones.filter(r => r.priority === 'warning');
    expect(avisos).toHaveLength(2);
    expect(avisos.map(r => r.text).join(' ')).toMatch(/riego/);
    expect(avisos.map(r => r.text).join(' ')).toMatch(/nitrógeno/);
  });

  test('Con valores óptimos debería devolver estado estable y nunca más de 3 sugerencias', () => {
    const recomendaciones = generarRecomendacionesReglas([
      { parcelName: 'Lote C', humidity: 60, nitrogen: 120, ph: 6.8 }
    ]);
    expect(recomendaciones[0].priority).toBe('success');
    expect(recomendaciones.length).toBeLessThanOrEqual(3);
  });

});
