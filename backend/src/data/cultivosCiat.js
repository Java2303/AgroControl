// Catálogo de cultivos del CIAT para Santa Cruz (tabla tipos_cultivo).
// Los IDs coinciden con lib/crops.ts del frontend.
const ciatCrops = [
  { id: 1, nombre: 'Soya (Soja)', descripcion: 'Principal cultivo oleaginoso de Santa Cruz (Campaña de Verano e Invierno).' },
  { id: 2, nombre: 'Maíz', descripcion: 'Cereal fundamental para la rotación de cultivos y forraje.' },
  { id: 3, nombre: 'Trigo', descripcion: 'Cereal de invierno para zonas de expansión agrícola e investigación CIAT.' },
  { id: 4, nombre: 'Arroz', descripcion: 'Gramínea producida bajo sistemas de secano o riego en el norte y este.' },
  { id: 5, nombre: 'Girasol', descripcion: 'Oleaginosa de rotación para la campaña de invierno.' },
  { id: 6, nombre: 'Sorgo', descripcion: 'Cultivo resistente a la sequía para forraje y grano (Chaco y Chiquitania).' },
  { id: 7, nombre: 'Caña de Azúcar', descripcion: 'Cultivo semiperenne para la industria azucarera del norte cruceño.' },
  { id: 8, nombre: 'Sésamo (Ajonjolí)', descripcion: 'Cultivo de exportación y rotación en Santa Cruz.' },
  { id: 9, nombre: 'Frejol (Frijol/Poroto)', descripcion: 'Leguminosa para consumo local y exportación investigada por CIAT.' },
  { id: 10, nombre: 'Yuca (Mandioca)', descripcion: 'Tubérculo tradicional y agroindustrial del oriente boliviano.' },
  { id: 11, nombre: 'Pastos y Forrajes', descripcion: 'Variedades forrajeras (Brachiaria, Gatton, etc.) para ganadería tropical.' },
  { id: 12, nombre: 'Chía', descripcion: 'Superalimento producido en el este cruceño para exportación.' },
  { id: 13, nombre: 'Cítricos y Frutales', descripcion: 'Naranja, mandarina, maracuyá en valles y norte integrado.' },
  { id: 14, nombre: 'Hortalizas', descripcion: 'Tomate, pimentón y cebolla en zonas hortícolas de Santa Cruz.' }
];

module.exports = { ciatCrops };
