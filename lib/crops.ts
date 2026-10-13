export interface CultivoCIAT {
  tipo_cultivo_id: number
  nombre: string
  categoria: string
  descripcion: string
  icono: string
  /** Color del cultivo en mapa, leyenda y miniaturas (visible sobre imagen satelital) */
  color: string
}

export const CULTIVOS_CIAT_SANTA_CRUZ: CultivoCIAT[] = [
  { tipo_cultivo_id: 1, nombre: 'Soya (Soja)', categoria: 'Oleaginosas', descripcion: 'Principal cultivo de verano/invierno en Santa Cruz.', icono: 'nutrition', color: '#ffd43b' },
  { tipo_cultivo_id: 2, nombre: 'Maíz', categoria: 'Cereales', descripcion: 'Cereal de rotación y forrajero (CIAT Guabirá, Chaco).', icono: 'grass', color: '#ff922b' },
  { tipo_cultivo_id: 3, nombre: 'Trigo', categoria: 'Cereales', descripcion: 'Cereal de invierno (Variedades CIAT: Motacú, Tarope).', icono: 'grain', color: '#d4a373' },
  { tipo_cultivo_id: 4, nombre: 'Arroz', categoria: 'Cereales', descripcion: 'Secano y bajo riego (Yapacaní, San Pedro, Guarayos).', icono: 'rice_bowl', color: '#74c0fc' },
  { tipo_cultivo_id: 5, nombre: 'Girasol', categoria: 'Oleaginosas', descripcion: 'Oleaginosa de rotación de invierno en llanos orientales.', icono: 'filter_vintage', color: '#f783ac' },
  { tipo_cultivo_id: 6, nombre: 'Sorgo', categoria: 'Cereales', descripcion: 'Granífero y forrajero resistente a sequías.', icono: 'yard', color: '#845ef7' },
  { tipo_cultivo_id: 7, nombre: 'Caña de Azúcar', categoria: 'Agroindustriales', descripcion: 'Zona integrada norte (Montero, Mineros, Portachuelo).', icono: 'energy_savings_leaf', color: '#8ce99a' },
  { tipo_cultivo_id: 8, nombre: 'Sésamo (Ajonjolí)', categoria: 'Oleaginosas', descripcion: 'Cultivo de exportación evaluado por CIAT.', icono: 'compost', color: '#e599f7' },
  { tipo_cultivo_id: 9, nombre: 'Frejol (Frijol/Poroto)', categoria: 'Leguminosas', descripcion: 'Leguminosa de alto valor nutricional y exportación.', icono: 'spa', color: '#a9e34b' },
  { tipo_cultivo_id: 10, nombre: 'Yuca (Mandioca)', categoria: 'Tubérculos', descripcion: 'Tubérculo tradicional y agroindustrial del oriente.', icono: 'psychiatry', color: '#b197fc' },
  { tipo_cultivo_id: 11, nombre: 'Pastos y Forrajes', categoria: 'Pecuario', descripcion: 'Brachiaria y pastos tropicales para ganadería CIAT.', icono: 'forest', color: '#38d9a9' },
  { tipo_cultivo_id: 12, nombre: 'Chía', categoria: 'Granos Especiales', descripcion: 'Superalimento producido en el este cruceño.', icono: 'grain', color: '#91a7ff' },
  { tipo_cultivo_id: 13, nombre: 'Cítricos y Frutales', categoria: 'Frutales', descripcion: 'Naranja, mandarina, maracuyá (Valles y Norte).', icono: 'local_florist', color: '#ff8787' },
  { tipo_cultivo_id: 14, nombre: 'Hortalizas', categoria: 'Hortícolas', descripcion: 'Tomate, pimentón y cebolla en zonas hortícolas.', icono: 'potted_plant', color: '#66d9e8' }
]

export function getCropNameById(cropId: number | string | undefined | null): string {
  if (!cropId) return 'No especificado'
  const idNum = typeof cropId === 'string' ? parseInt(cropId, 10) : cropId
  const match = CULTIVOS_CIAT_SANTA_CRUZ.find(c => c.tipo_cultivo_id === idNum)
  if (match) return match.nombre

  // Si es un nombre en texto directo (ej: 'soya', 'maiz')
  if (typeof cropId === 'string') {
    const lower = cropId.toLowerCase()
    const found = CULTIVOS_CIAT_SANTA_CRUZ.find(c => c.nombre.toLowerCase().includes(lower))
    if (found) return found.nombre
    return cropId
  }
  return 'No especificado'
}


export function getCropColor(cropId: number | string | undefined | null): string {
  const idNum = typeof cropId === 'string' ? parseInt(cropId, 10) : cropId
  return CULTIVOS_CIAT_SANTA_CRUZ.find(c => c.tipo_cultivo_id === idNum)?.color ?? '#8dc63f'
}
