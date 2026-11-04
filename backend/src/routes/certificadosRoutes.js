const express = require('express');
const router = express.Router();
const certificadosController = require('../controllers/certificadosController');
const authMiddlware = require('../middlewares/authMiddlware');
const { permitirRoles } = require('../middlewares/authMiddlware');
const { limitarIntentos } = require('../middlewares/rateLimit');

// Matriz de permisos: emite el agrónomo (o el administrador) sobre sus parcelas
router.post('/parcelas/:id/certificado', authMiddlware, permitirRoles('admin_ciat', 'agronomo'), certificadosController.emitirCertificado);
// Verificación pública con el código; el límite frena intentos de adivinar códigos
router.get('/certificados/:codigo', limitarIntentos({ ventanaMs: 60 * 1000, maximo: 30 }), certificadosController.verificarCertificado);

module.exports = router;
