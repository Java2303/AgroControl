const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');
const authMiddlware = require('../middlewares/authMiddlware');

router.get('/historial/parcelas', authMiddlware, historialController.historialParcelas);

module.exports = router;
