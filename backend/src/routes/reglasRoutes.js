const express = require('express');
const router = express.Router();
const reglasController = require('../controllers/reglasController');
const authMiddlware = require('../middlewares/authMiddlware');

router.get('/reglas/recomendaciones', authMiddlware, reglasController.obtenerRecomendaciones);

module.exports = router;
