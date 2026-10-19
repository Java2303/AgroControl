const { validarActividad, hoyEnBolivia } = require('../utils/actividades');

const HOY = '2026-10-18';

describe('Pruebas Unitarias - Bitácora de labores (validarActividad)', () => {
  test('Acepta una fertilización completa y normaliza los datos', () => {
    const { errores, datos } = validarActividad(
      { tipo: 'fertilizacion', fecha: '2026-10-10', producto: '  Urea 46 %  ', cantidad: '120', unidad: 'kg/ha', descripcion: 'Al voleo' },
      HOY
    );
    expect(errores).toEqual([]);
    expect(datos).toEqual({ tipo: 'fertilizacion', fecha: '2026-10-10', producto: 'Urea 46 %', cantidad: 120, unidad: 'kg/ha', descripcion: 'Al voleo' });
  });

  test('Rechaza tipos de labor desconocidos', () => {
    expect(validarActividad({ tipo: 'fumigar', fecha: '2026-10-10' }, HOY).errores).toContain('Tipo de labor no válido.');
  });

  test('Rechaza fechas futuras, anteriores al 2000 o mal formadas', () => {
    expect(validarActividad({ tipo: 'siembra', fecha: '2026-10-19' }, HOY).errores[0]).toMatch(/futura/);
    expect(validarActividad({ tipo: 'siembra', fecha: '1999-12-31' }, HOY).errores[0]).toMatch(/2000/);
    expect(validarActividad({ tipo: 'siembra', fecha: '18/10/2026' }, HOY).errores[0]).toMatch(/AAAA-MM-DD/);
  });

  test('Exige cantidad y unidad juntas, y unidades del catálogo', () => {
    expect(validarActividad({ tipo: 'cosecha', fecha: HOY, cantidad: 3.2 }, HOY).errores).toContain('Indique la unidad de la cantidad.');
    expect(validarActividad({ tipo: 'cosecha', fecha: HOY, unidad: 't/ha' }, HOY).errores).toContain('Indique la cantidad correspondiente a la unidad.');
    expect(validarActividad({ tipo: 'cosecha', fecha: HOY, cantidad: 3.2, unidad: 'toneladas' }, HOY).errores).toContain('Unidad no válida.');
    expect(validarActividad({ tipo: 'riego', fecha: HOY, cantidad: -5, unidad: 'mm' }, HOY).errores[0]).toMatch(/entre 0/);
  });

  test('El tipo «Otra» requiere descripción', () => {
    expect(validarActividad({ tipo: 'otra', fecha: HOY }, HOY).errores).toContain('Describa la labor cuando el tipo es «Otra».');
    expect(validarActividad({ tipo: 'otra', fecha: HOY, descripcion: 'Desmalezado manual' }, HOY).errores).toEqual([]);
  });

  test('hoyEnBolivia usa UTC-4: a las 23:00 en Bolivia sigue siendo el mismo día', () => {
    // 2026-10-19T03:00Z equivale a 2026-10-18 23:00 en Bolivia
    expect(hoyEnBolivia(new Date('2026-10-19T03:00:00Z'))).toBe('2026-10-18');
  });
});

describe('Pruebas Unitarias - Eventos de edición de la parcela (cambiosParcela)', () => {
  const { cambiosParcela } = require('../utils/actividades');

  test('Registra cada campo modificado con su valor anterior y nuevo', () => {
    expect(cambiosParcela({ nombre: 'Lote A', cultivo: 'Trigo' }, { nombre: 'Lote A Norte', cultivo: 'Soya (Soja)' })).toEqual([
      { campo: 'nombre', etiqueta: 'Nombre', antes: 'Lote A', despues: 'Lote A Norte' },
      { campo: 'cultivo', etiqueta: 'Cultivo', antes: 'Trigo', despues: 'Soya (Soja)' },
    ]);
  });

  test('Si no cambia nada, no genera evento', () => {
    expect(cambiosParcela({ nombre: 'Lote A', cultivo: 'Trigo' }, { nombre: 'Lote A', cultivo: 'Trigo' })).toEqual([]);
  });
});

describe('Pruebas Unitarias - Baja lógica de parcelas (validarBaja)', () => {
  const { validarBaja } = require('../utils/actividades');

  test('Acepta un motivo del catálogo con observación opcional', () => {
    expect(validarBaja({ motivo: 'terreno_cerrado' })).toEqual({ errores: [], datos: { motivo: 'terreno_cerrado', observacion: null } });
    expect(validarBaja({ motivo: 'venta_cesion', observacion: '  Vendido a un tercero ' }).datos.observacion).toBe('Vendido a un tercero');
  });

  test('Rechaza motivos desconocidos y exige descripción si el motivo es «otro»', () => {
    expect(validarBaja({ motivo: 'cansancio' }).errores).toContain('Seleccione un motivo de baja válido.');
    expect(validarBaja({ motivo: 'otro' }).errores).toContain('Describa el motivo de la baja.');
    expect(validarBaja({ motivo: 'otro', observacion: 'Inundación permanente' }).errores).toEqual([]);
  });
});
