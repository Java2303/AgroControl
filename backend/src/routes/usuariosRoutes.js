const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const authMiddlware = require('../middlewares/authMiddlware');
const { permitirRoles } = require('../middlewares/authMiddlware');

// Solo el administrador del CIAT gestiona cuentas y roles (UC-04)
const soloAdmin = permitirRoles('admin_ciat');

router.get('/usuarios', authMiddlware, soloAdmin, usuariosController.listarUsuarios);
router.patch('/usuarios/:id', authMiddlware, soloAdmin, usuariosController.actualizarUsuario);

module.exports = router;
