const express = require('express');
const router = express.Router();
const actividadesController = require('../controllers/actividadesController');
const authMiddlware = require('../middlewares/authMiddlware');
const { permitirRoles } = require('../middlewares/authMiddlware');

// Matriz de permisos (Cuadro 3.36): el agrónomo registra y anula labores; el dueño de la parcela las consulta
const registraLabores = permitirRoles('admin_ciat', 'agronomo');

router.get('/parcelas/:id/actividades', authMiddlware, actividadesController.listarActividades);
router.post('/parcelas/:id/actividades', authMiddlware, registraLabores, actividadesController.crearActividad);
router.patch('/actividades/:id/anular', authMiddlware, registraLabores, actividadesController.anularActividad);

module.exports = router;
