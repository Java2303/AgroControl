const express = require('express');
const router = express.Router();
const telemetriaController = require('../controllers/telemetriaController');
const { limitarIntentos } = require('../middlewares/rateLimit');

// Sin JWT: el nodo se autentica con su clave de dispositivo. El límite por IP frena el abuso
// sin afectar a un nodo que envía una lectura por minuto.
router.post('/telemetria', limitarIntentos({ ventanaMs: 60 * 1000, maximo: 30 }), telemetriaController.recibirTelemetria);

module.exports = router;
