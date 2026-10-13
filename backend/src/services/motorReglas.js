/**
 * Motor de reglas agronómicas determinista.
 * Evalúa la última lectura de cada parcela y devuelve hasta 3 recomendaciones priorizadas.
 */
const generarRecomendacionesReglas = (readings) => {
  const recommendations = [];

  if (!readings || readings.length === 0) {
    return [
      { text: 'Registre parcelas en el mapa satelital para activar las recomendaciones del CIAT.', icon: 'landscape', priority: 'info' },
      { text: 'El sistema está listo para monitorear humedad, pH y nutrientes en tiempo real.', icon: 'online_prediction', priority: 'success' }
    ];
  }

  // 1. Analizar humedad
  const parcelasSecas = readings.filter(r => parseFloat(r.humidity) < 40);
  if (parcelasSecas.length > 0) {
    recommendations.push({
      text: `Humedad baja en ${parcelasSecas.map(p => p.parcelName).join(', ')}. Se recomienda programar riego prioritario.`,
      icon: 'water',
      priority: 'warning'
    });
  }

  // 2. Analizar Nitrógeno
  const parcelasBajoN = readings.filter(r => parseFloat(r.nitrogen) < 80);
  if (parcelasBajoN.length > 0) {
    recommendations.push({
      text: `Bajo nivel de nitrógeno en ${parcelasBajoN.map(p => p.parcelName).join(', ')}. Considere fertilización nitrogenada moderada.`,
      icon: 'science',
      priority: 'warning'
    });
  }

  // 3. Analizar pH
  const parcelasAcidas = readings.filter(r => parseFloat(r.ph) < 6.0);
  if (parcelasAcidas.length > 0) {
    recommendations.push({
      text: `Suelo ácido (pH < 6.0) detectado en ${parcelasAcidas.map(p => p.parcelName).join(', ')}. Considere encalado agrícola.`,
      icon: 'info',
      priority: 'info'
    });
  }

  // 4. Agregar recomendación de éxito general si todo está bien
  if (recommendations.length === 0) {
    recommendations.push({
      text: 'Niveles de nutrientes y humedad óptimos en todos tus cultivos. Monitoreo estable.',
      icon: 'check_circle',
      priority: 'success'
    });
  }

  // Asegurar siempre 3 sugerencias para la interfaz
  if (recommendations.length < 3) {
    recommendations.push({
      text: 'Rotación recomendada: Considere sembrar Sorgo o Girasol en la próxima campaña invernal para restaurar el suelo.',
      icon: 'loop',
      priority: 'info'
    });
  }
  if (recommendations.length < 3) {
    recommendations.push({
      text: 'Evite el encharcamiento manteniendo limpios los canales de drenaje perimetrales.',
      icon: 'waves',
      priority: 'info'
    });
  }

  return recommendations.slice(0, 3);
};

module.exports = { generarRecomendacionesReglas };
