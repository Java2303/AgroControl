const { clasificarPh, clasificarFosforo, clasificarPotasio, diagnosticarLectura } = require('../services/interpretacionCiat');

const OPTIMA = { humedad: 55, temperatura: 24, conductividad: 420, ph: 6.4, nitrogeno: 96, fosforo: 58, potasio: 141 };

describe('Pruebas Unitarias - Interpretación con la tabla del CIAT', () => {
  test('Cuadro 3.2: clasifica el pH en las 8 clases de reacción del suelo', () => {
    expect(clasificarPh(4.4)).toBe('Muy fuertemente ácido');
    expect(clasificarPh(4.5)).toBe('Fuertemente ácido');
    expect(clasificarPh(5.2)).toBe('Fuertemente ácido');
    expect(clasificarPh(5.3)).toBe('Moderadamente ácido');
    expect(clasificarPh(6.0)).toBe('Suavemente ácido');
    expect(clasificarPh(6.6)).toBe('Neutro');
    expect(clasificarPh(7.5)).toBe('Suavemente alcalino');
    expect(clasificarPh(8.0)).toBe('Moderadamente alcalino');
    expect(clasificarPh(8.1)).toBe('Fuertemente alcalino');
  });

  test('Cuadro 3.3: P en mg/kg y K convertido a cmolc/kg (82 y 254 mg/kg como límites)', () => {
    expect([clasificarFosforo(5.9), clasificarFosforo(6), clasificarFosforo(15), clasificarFosforo(15.1)]).toEqual(['Bajo', 'Medio', 'Medio', 'Alto']);
    expect([clasificarPotasio(81), clasificarPotasio(83), clasificarPotasio(254), clasificarPotasio(256)]).toEqual(['Bajo', 'Medio', 'Medio', 'Alto']);
  });

  test('Lectura óptima: categoría Óptimo y regla R-05', () => {
    const d = diagnosticarLectura(OPTIMA);
    expect(d.calificacion).toBe('Óptimo');
    expect(d.recomendaciones.map((r) => r.regla)).toEqual(['R-05']);
  });

  test('Aplica R-01 a R-04 y asigna la categoría más severa', () => {
    const d = diagnosticarLectura({ ...OPTIMA, ph: 5.4, nitrogeno: 45, humedad: 35, fosforo: 4, potasio: 70 });
    expect(d.recomendaciones.map((r) => r.regla)).toEqual(['R-01', 'R-02', 'R-03', 'R-04']);
    expect(d.calificacion).toBe('Crítico'); // pH 5,4 y N 45 están en rango crítico
    expect(d.interpretacion).toEqual({ ph: 'Moderadamente ácido', fosforo: 'Bajo', potasio: 'Bajo' });
    expect(d.recomendaciones[3].texto).toMatch(/fosfatada y potásica/);
  });

  test('P o K bajos sin variables fuera del semáforo: Requiere atención', () => {
    expect(diagnosticarLectura({ ...OPTIMA, potasio: 70 }).calificacion).toBe('Requiere atención');
  });
});
