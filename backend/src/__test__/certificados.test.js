const { generarCodigo, CODIGO } = require('../controllers/certificadosController');

describe('Pruebas Unitarias - Código de verificación del certificado (RN-14)', () => {
  test('Genera códigos AC-XXXX-XXXX-XXXX sin caracteres ambiguos y distintos entre sí', () => {
    const codigos = new Set(Array.from({ length: 500 }, generarCodigo));
    expect(codigos.size).toBe(500);
    for (const c of codigos) {
      expect(c).toMatch(CODIGO);
      expect(c).not.toMatch(/[01ILO]/);
    }
  });
});
