const db = require('../config/db');

const sensorConfig = {
  humidity: {
    unit: '%',
    optimal: { min: 40, max: 70 },
    warning: { min: 30, max: 80 }
  },
  temperature: {
    unit: '°C',
    optimal: { min: 18, max: 28 },
    warning: { min: 12, max: 35 }
  },
  ph: {
    unit: '',
    optimal: { min: 6, max: 7.5 },
    warning: { min: 5.5, max: 8 }
  },
  nitrogen: {
    unit: 'ppm',
    optimal: { min: 80, max: 150 },
    warning: { min: 50, max: 180 }
  }
};

const getStatus = (type, value) => {
  const config = sensorConfig[type];
  if (!config) return 'optimo';
  if (value < config.warning.min || value > config.warning.max) {
    return 'critico';
  } else if (value < config.optimal.min || value > config.optimal.max) {
    return 'alerta';
  }
  return 'optimo';
};

const sensoresController = {
  obtenerLecturas: async (req, res) => {
    try {
      const usuario_id = req.usuario.id;

      // 1. Obtener la última lectura de cada parcela/lote
      const queryUltimas = `
        SELECT 
          p.parcela_id AS "parcelId",
          p.nombre AS "parcelName",
          l.lote_id AS "loteId",
          ls.humedad_suelo AS humidity,
          ls.temperatura_suelo AS temperature,
          ls.ph AS ph,
          ls.nitrogeno AS nitrogen,
          ls.fosforo AS phosphorus,
          ls.potasio AS potassium,
          ls.fecha_captura AS "lastUpdate"
        FROM parcelas p
        JOIN lotes l ON p.parcela_id = l.parcela_id
        LEFT JOIN LATERAL (
          SELECT humedad_suelo, temperatura_suelo, ph, nitrogeno, fosforo, potasio, fecha_captura
          FROM lecturas_suelo 
          WHERE lote_id = l.lote_id 
          ORDER BY fecha_captura DESC 
          LIMIT 1
        ) ls ON true
        WHERE p.usuario_id = $1 AND p.activa
        ORDER BY p.nombre ASC;
      `;

      const resUltimas = await db.query(queryUltimas, [usuario_id]);

      // 2. Obtener el historial de las últimas 10 lecturas de cada lote
      const queryHistorial = `
        SELECT 
          l.parcela_id AS "parcelId",
          ls.humedad_suelo AS humidity,
          ls.temperatura_suelo AS temperature,
          ls.ph AS ph,
          ls.nitrogeno AS nitrogen,
          ls.fecha_captura AS "fecha"
        FROM lotes l
        JOIN (
          SELECT lote_id, humedad_suelo, temperatura_suelo, ph, nitrogeno, fecha_captura,
                 ROW_NUMBER() OVER (PARTITION BY lote_id ORDER BY fecha_captura DESC) as rn
          FROM lecturas_suelo
        ) ls ON l.lote_id = ls.lote_id AND ls.rn <= 10
        JOIN parcelas p ON l.parcela_id = p.parcela_id
        WHERE p.usuario_id = $1 AND p.activa
        ORDER BY ls.fecha_captura ASC;
      `;

      const resHistorial = await db.query(queryHistorial, [usuario_id]);

      // Agrupar historial por parcela
      const historialPorParcela = {};
      resHistorial.rows.forEach(row => {
        if (!historialPorParcela[row.parcelId]) {
          historialPorParcela[row.parcelId] = {
            humidity: [],
            temperature: [],
            ph: [],
            nitrogen: []
          };
        }
        historialPorParcela[row.parcelId].humidity.push(parseFloat(row.humidity || 0));
        historialPorParcela[row.parcelId].temperature.push(parseFloat(row.temperature || 0));
        historialPorParcela[row.parcelId].ph.push(parseFloat(row.ph || 0));
        historialPorParcela[row.parcelId].nitrogen.push(parseFloat(row.nitrogen || 0));
      });

      // Mapear resultados a la estructura SensorReading que espera el frontend
      const respuesta = [];

      resUltimas.rows.forEach(row => {
        const hist = historialPorParcela[row.parcelId] || {
          humidity: [],
          temperature: [],
          ph: [],
          nitrogen: []
        };

        const tipos = ['humidity', 'temperature', 'ph', 'nitrogen'];
        
        tipos.forEach(type => {
          let val = 0;
          if (type === 'humidity') val = parseFloat(row.humidity || 0);
          if (type === 'temperature') val = parseFloat(row.temperature || 0);
          if (type === 'ph') val = parseFloat(row.ph || 0);
          if (type === 'nitrogen') val = parseFloat(row.nitrogen || 0);

          const histArray = hist[type].length > 0 ? hist[type] : [val];

          respuesta.push({
            id: `${row.parcelId}-${type}`,
            parcelId: row.parcelId,
            parcelName: row.parcelName,
            type: type,
            value: val,
            unit: sensorConfig[type].unit,
            status: getStatus(type, val),
            lastUpdate: row.lastUpdate || new Date(),
            history: histArray
          });
        });
      });

      // Promedio de macronutrientes (N, P, K) de la última lectura de cada lote
      const promedio = (campo) => {
        const valores = resUltimas.rows
          .map(row => parseFloat(row[campo]))
          .filter(v => !Number.isNaN(v));
        if (valores.length === 0) return null;
        return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;
      };

      res.status(200).json({
        status: 'success',
        data: respuesta,
        resumen: {
          nitrogeno: promedio('nitrogen'),
          fosforo: promedio('phosphorus'),
          potasio: promedio('potassium')
        }
      });

    } catch (error) {
      console.error('Error al obtener lecturas de sensores:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al cargar las lecturas de los sensores.'
      });
    }
  }
};

module.exports = sensoresController;
