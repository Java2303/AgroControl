const express = require('express');
const router = express.Router();
const parcelasController = require('../controllers/parcelasController');
const authMiddlware = require('../middlewares/authMiddlware');
const { permitirRoles } = require('../middlewares/authMiddlware');

// Matriz de permisos (Cuadro 3.36): el productor solo consulta parcelas
const gestionParcelas = permitirRoles('admin_ciat', 'agronomo');

router.post('/', authMiddlware, gestionParcelas, parcelasController.crearParcela);
router.get('/', authMiddlware, parcelasController.obtenerParcelas);
router.put('/:id', authMiddlware, gestionParcelas, parcelasController.actualizarParcela);
router.delete('/:id', authMiddlware, gestionParcelas, parcelasController.eliminarParcela);

module.exports = router;
