const db = require('../config/db');

const cropNames = {
  1: 'Soya (Soja)',
  2: 'Maíz',
  3: 'Trigo',
  4: 'Arroz',
  5: 'Girasol',
  6: 'Sorgo',
  7: 'Caña de Azúcar',
  8: 'Sésamo (Ajonjolí)',
  9: 'Frejol (Frijol/Poroto)',
  10: 'Yuca (Mandioca)',
  11: 'Pastos y Forrajes',
  12: 'Chía',
  13: 'Cítricos y Frutales',
  14: 'Hortalizas'
};

const { generarRecomendacionesReglas } = require('../services/motorReglas');

const generarRespuestaChatFallback = (pregunta, readings) => {
  const q = (pregunta || '').toLowerCase();
  let response = 'Como agrónomo experto del CIAT, he analizado la situación de tus parcelas. ';
  
  if (q.includes('ph') || q.includes('ácid') || q.includes('acid') || q.includes('suelo')) {
    const acidas = readings.filter(r => parseFloat(r.ph) < 6.0);
    if (acidas.length > 0) {
      response += `En las parcelas con acidez como ${acidas.map(p => p.parcelName).join(', ')} (pH < 6.0), se aconseja aplicar encalado agrícola (carbonato de calcio) para elevar el pH gradualmente y optimizar la absorción de Fósforo y otros nutrientes básicos.`;
    } else {
      response += 'Los niveles de pH reportados en tus parcelas son neutros o ligeramente ácidos/alcalinos y se encuentran en rangos óptimos. No se requiere encalado preventivo.';
    }
  } else if (q.includes('humedad') || q.includes('agua') || q.includes('rieg') || q.includes('seco') || q.includes('sequia')) {
    const secas = readings.filter(r => parseFloat(r.humidity) < 40);
    if (secas.length > 0) {
      response += `Para las parcelas ${secas.map(p => p.parcelName).join(', ')} con humedad crítica por debajo de 40%, es fundamental programar un riego suplementario de urgencia o cobertura de rastrojo para reducir la evaporación de agua en el perfil superior del suelo.`;
    } else {
      response += 'La humedad en tus parcelas se encuentra en niveles saludables (mayor al 40%). Monitorea periódicamente las lecturas durante las horas de mayor insolación.';
    }
  } else if (q.includes('nitrógeno') || q.includes('nitrogeno') || q.includes('nutri') || q.includes('fertiliz') || q.includes('urea')) {
    const bajasN = readings.filter(r => parseFloat(r.nitrogen) < 80);
    if (bajasN.length > 0) {
      response += `La parcela ${bajasN.map(p => p.parcelName).join(', ')} muestra niveles de nitrógeno deficientes (< 80 ppm). Se sugiere planificar una fertilización nitrogenada (ej. urea, sulfato de amonio) dosificada antes de la siguiente fase de desarrollo activo.`;
    } else {
      response += 'Tus lotes reportan una concentración adecuada de Nitrógeno. Mantén el plan de rotación o fertilización foliar estándar para conservar los niveles de materia orgánica.';
    }
  } else {
    response += 'Para proceder, te aconsejo realizar un monitoreo constante del pH y la humedad. Como recomendación general del CIAT, prioriza la rotación de cultivos para mejorar la estructura física del suelo y prevenir la acumulación de patógenos.';
  }
  
  return response;
};

const iaController = {
  obtenerRecomendaciones: async (req, res) => {
    try {
      const usuario_id = req.usuario.id;

      // 1. Obtener las últimas lecturas de las parcelas del usuario
      const query = `
        SELECT 
          p.nombre AS "parcelName",
          p.tipo_cultivo_id AS "cropTypeId",
          p.area_hectareas AS "area",
          ls.humedad_suelo AS humidity,
          ls.temperatura_suelo AS temperature,
          ls.ph AS ph,
          ls.nitrogeno AS nitrogen,
          ls.fosforo AS phosphorus,
          ls.potasio AS potassium
        FROM parcelas p
        JOIN lotes l ON p.parcela_id = l.parcela_id
        LEFT JOIN LATERAL (
          SELECT humedad_suelo, temperatura_suelo, ph, nitrogeno, fosforo, potasio
          FROM lecturas_suelo 
          WHERE lote_id = l.lote_id 
          ORDER BY fecha_captura DESC 
          LIMIT 1
        ) ls ON true
        WHERE p.usuario_id = $1;
      `;

      const result = await db.query(query, [usuario_id]);
      const readings = result.rows;

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey.trim() === '') {
        // Fallback a motor de reglas local
        console.log('[IA] GEMINI_API_KEY no configurada. Usando motor de reglas local.');
        const recomendaciones = generarRecomendacionesReglas(readings);
        return res.status(200).json({
          status: 'success',
          source: 'reglas_locales',
          data: recomendaciones
        });
      }

      // Si hay API Key, llamamos a Gemini 1.5 Flash
      if (readings.length === 0) {
        return res.status(200).json({
          status: 'success',
          source: 'gemini',
          data: [
            { text: 'Registre sus parcelas agrícolas en el mapa satelital para recibir asesoría personalizada de la IA de Gemini.', icon: 'landscape', priority: 'info' },
            { text: 'Nuestros modelos agronómicos procesarán su humedad, pH y nutrientes.', icon: 'psychology', priority: 'info' }
          ]
        });
      }

      // Dar formato a las lecturas para el prompt
      const datosAgricolas = readings.map(r => {
        const cultivo = cropNames[r.cropTypeId] || 'Otros';
        return `- Parcela: "${r.parcelName}", Cultivo: ${cultivo}, Superficie: ${r.area} ha, Humedad: ${r.humidity}%, Temperatura: ${r.temperature}°C, pH: ${r.ph}, Nitrógeno: ${r.nitrogen} ppm, Fósforo: ${r.phosphorus} ppm, Potasio: ${r.potassium} ppm.`;
      }).join('\n');

      const prompt = `
Eres un Ingeniero Agrónomo experto de la institución de investigación CIAT (Centro Internacional de Agricultura Tropical) en Santa Cruz, Bolivia. 
Analiza los siguientes datos reales de telemetría de suelo obtenidos de las parcelas del productor:

${datosAgricolas}

Genera exactamente 3 sugerencias o recomendaciones agronómicas breves, concretas, realistas y accionables (de máximo 15 palabras cada una) para optimizar la salud de los cultivos.
Usa terminología técnica adecuada pero accesible (por ejemplo, referenciando riego, fertilización de nitrógeno/fósforo/potasio, encalado, rotación de cultivos, etc.).

Devuelve el resultado ÚNICAMENTE como un arreglo JSON de objetos, respetando estrictamente el siguiente esquema de tipos sin textos de introducción o bloques markdown complementarios:
\`\`\`json
[
  {
    "text": "Sugerencia agronómica corta y directa aquí.",
    "icon": "nombre_de_icono_material", 
    "priority": "success" o "warning" o "info"
  }
]
\`\`\`

Notas para iconos y prioridades:
- Iconos válidos de Google Material Symbols: "water", "science", "eco", "check_circle", "info", "warning", "agriculture", "loop", "grass", "waves".
- Prioridades válidas: "success" (si los datos están excelentes), "warning" (si hay alguna alerta crítica de sequedad, acidez o falta severa de nitrógeno), "info" (consejos generales o preventivos).
`;

      const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API retornó status ${response.status}`);
      }

      const geminiData = await response.json();
      const rawText = geminiData.candidates[0].content.parts[0].text;
      
      const recomendaciones = JSON.parse(rawText);
      if (!Array.isArray(recomendaciones)) {
        throw new Error('Respuesta de Gemini con formato inesperado');
      }

      res.status(200).json({
        status: 'success',
        source: 'gemini_api',
        data: recomendaciones
      });

    } catch (err) {
      console.error('[IA] Error al llamar a Gemini:', err.message);
      // Fallback en caso de error en la llamada a la API
      try {
      const result = await db.query(`
        SELECT p.nombre AS "parcelName", p.tipo_cultivo_id AS "cropTypeId", p.area_hectareas AS "area",
               ls.humedad_suelo AS humidity, ls.nitrogeno AS nitrogen, ls.ph AS ph
        FROM parcelas p
        JOIN lotes l ON p.parcela_id = l.parcela_id
        LEFT JOIN LATERAL (
          SELECT humedad_suelo, nitrogeno, ph FROM lecturas_suelo WHERE lote_id = l.lote_id ORDER BY fecha_captura DESC LIMIT 1
        ) ls ON true
        WHERE p.usuario_id = $1;
      `, [req.usuario.id]);

      res.status(200).json({
        status: 'success',
        source: 'reglas_locales_fallback',
        data: generarRecomendacionesReglas(result.rows)
      });
      } catch (fallbackErr) {
        console.error('[IA] Error en el fallback de reglas:', fallbackErr);
        res.status(500).json({ status: 'error', message: 'Error al generar las recomendaciones.' });
      }
    }
  },

  preguntarAsistente: async (req, res) => {
    const { pregunta, recomendaciones } = req.body || {};
    let readings = [];

    if (typeof pregunta !== 'string' || !pregunta.trim()) {
      return res.status(400).json({ status: 'error', message: 'La pregunta es requerida.' });
    }

    if (pregunta.length > 500) {
      return res.status(400).json({ status: 'error', message: 'La pregunta no puede superar los 500 caracteres.' });
    }

    try {
      const usuario_id = req.usuario.id;

      // 1. Obtener datos de parcelas para darle contexto a la IA
      const query = `
        SELECT 
          p.nombre AS "parcelName",
          p.tipo_cultivo_id AS "cropTypeId",
          p.area_hectareas AS "area",
          ls.humedad_suelo AS humidity,
          ls.temperatura_suelo AS temperature,
          ls.ph AS ph,
          ls.nitrogeno AS nitrogen
        FROM parcelas p
        JOIN lotes l ON p.parcela_id = l.parcela_id
        LEFT JOIN LATERAL (
          SELECT humedad_suelo, temperatura_suelo, ph, nitrogeno
          FROM lecturas_suelo 
          WHERE lote_id = l.lote_id 
          ORDER BY fecha_captura DESC 
          LIMIT 1
        ) ls ON true
        WHERE p.usuario_id = $1;
      `;
      const result = await db.query(query, [usuario_id]);
      readings = result.rows;

      const datosAgricolas = readings.map(r => {
        const cultivo = cropNames[r.cropTypeId] || 'Otros';
        return `- Parcela: "${r.parcelName}", Cultivo: ${cultivo}, Humedad: ${r.humidity}%, pH: ${r.ph}, Nitrógeno: ${r.nitrogen} ppm.`;
      }).join('\n');

      const recomendadosStr = (Array.isArray(recomendaciones) ? recomendaciones : [])
        .slice(0, 5)
        .filter(r => r && typeof r.text === 'string')
        .map(r => `- ${r.text.slice(0, 300)}`)
        .join('\n');

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey.trim() === '') {
        return res.status(200).json({
          status: 'success',
          respuesta: 'Para recibir asesoramiento interactivo de la IA de Gemini, por favor configura tu GEMINI_API_KEY en el archivo backend/.env. (Actualmente respondiendo en modo desconectado: Tu suelo tiene niveles estables, mantén el monitoreo periódico).'
        });
      }

      const prompt = `
Eres un Ingeniero Agrónomo experto del CIAT (Centro Internacional de Agricultura Tropical) en Santa Cruz, Bolivia.
El agricultor te hace la siguiente consulta: "${pregunta}"

Aquí tienes el contexto de sus parcelas en tiempo real:
${datosAgricolas}

Y estas son las recomendaciones que el sistema le mostró en su panel de control:
${recomendadosStr}

Responde a su consulta de manera concisa, clara, directa y muy práctica en español. Sugiere pasos técnicos y específicos basados en sus cultivos y telemetría.
Limita tu respuesta a un máximo de 100 palabras. No incluyas saludos largos, firmas ni bloques de código complementarios, ve directo al consejo técnico.
`;

      const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API retornó status ${response.status}`);
      }

      const geminiData = await response.json();
      const respuestaIA = geminiData.candidates[0].content.parts[0].text;

      res.status(200).json({
        status: 'success',
        respuesta: respuestaIA.trim()
      });

    } catch (error) {
      console.error('[IA Chat] Error al conectar con Gemini, usando fallback de reglas:', error.message);
      
      const fallbackRespuesta = generarRespuestaChatFallback(pregunta, readings);
      
      res.status(200).json({
        status: 'success',
        respuesta: `${fallbackRespuesta} (Nota: Respondiendo en modo de contingencia local)`
      });
    }
  }
};

module.exports = iaController;
