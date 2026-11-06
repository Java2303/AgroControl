const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { limitarIntentos } = require('../middlewares/rateLimit');
const authMiddlware = require('../middlewares/authMiddlware');

// Ruta para el registro de nuevos usuarios (agronomos o productores)
router.post('/registrar', limitarIntentos({ maximo: 5 }), authController.registrarUsuario);
router.post('/login', limitarIntentos({ maximo: 10 }), authController.login);
// Todos los roles pueden cambiar su propio nombre
router.patch('/perfil', authMiddlware, authController.actualizarPerfil);
module.exports = router;
