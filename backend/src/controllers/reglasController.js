const db = require('../config/db');
const { generarRecomendacionesReglas } = require('../services/motorReglas');

/**
 * Devuelve las recomendaciones del motor de reglas determinista
 * a partir de la última lectura de cada parcela del usuario.
 */
const obtenerRecomendaciones = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;

    const query = `
      SELECT
        p.nombre AS "parcelName",
        ls.humedad_suelo AS humidity,
        ls.ph AS ph,
        ls.nitrogeno AS nitrogen
      FROM parcelas p
      JOIN lotes l ON p.parcela_id = l.parcela_id
      LEFT JOIN LATERAL (
        SELECT humedad_suelo, ph, nitrogeno
        FROM lecturas_suelo
        WHERE lote_id = l.lote_id
        ORDER BY fecha_captura DESC
        LIMIT 1
      ) ls ON true
      WHERE p.usuario_id = $1;
    `;

    const result = await db.query(query, [usuario_id]);

    res.status(200).json({
      status: 'success',
      source: 'motor_reglas',
      data: generarRecomendacionesReglas(result.rows)
    });
  } catch (error) {
    console.error('Error en el motor de reglas:', error);
    res.status(500).json({ status: 'error', message: 'Error al generar las recomendaciones.' });
  }
};

module.exports = { obtenerRecomendaciones };
