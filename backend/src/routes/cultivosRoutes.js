const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddlware = require('../middlewares/authMiddlware');

router.get('/cultivos', authMiddlware, async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT tipo_cultivo_id, nombre FROM tipos_cultivo ORDER BY nombre ASC'
    );

    res.json({
      status: 'success',
      data: resultado.rows
    });
  } catch (error) {
    console.error('Error al obtener cultivos:', error);
    res.status(500).json({ status: 'error', message: 'Error en el servidor.' });
  }
});

module.exports = router;