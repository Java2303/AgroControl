const db = require('../config/db');
const { validarCambioUsuario } = require('../utils/usuarios');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CAMPOS = `
    usuario_id AS id, nombre_completo AS nombre, correo, rol, activo IS NOT FALSE AS activo,
    fecha_registro AS "fechaRegistro",
    (SELECT COUNT(*)::int FROM parcelas p WHERE p.usuario_id = usuarios.usuario_id AND p.activa) AS parcelas`;

/** GET /api/usuarios — cuentas registradas, para el administrador del CIAT (UC-04). */
const listarUsuarios = async (req, res) => {
    try {
        const r = await db.query(`SELECT ${CAMPOS} FROM usuarios ORDER BY nombre_completo`);
        res.status(200).json({ status: 'success', data: r.rows });
    } catch (error) {
        console.error('Error al listar los usuarios:', error);
        res.status(500).json({ status: 'error', message: 'Error en el servidor al cargar los usuarios.' });
    }
};

/**
 * PATCH /api/usuarios/:id — cambia el rol de una cuenta o la activa/desactiva (UC-04).
 * Una cuenta desactivada no puede iniciar sesión; sus parcelas y bitácora se conservan.
 * shortcut: una sesión ya abierta conserva su rol hasta que vence el token (8 h); si hiciera
 * falta aplicarlo al instante, el middleware tendría que consultar la cuenta en cada petición.
 */
const actualizarUsuario = async (req, res) => {
    const id = req.params.id;
    if (!UUID.test(id)) {
        return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
    }
    const { error, cambios } = validarCambioUsuario(req.body, req.usuario.id, id);
    if (error) {
        return res.status(400).json({ status: 'error', message: error });
    }
    try {
        const r = await db.query(
            `UPDATE usuarios SET rol = COALESCE($2::rol_usuario, rol), activo = COALESCE($3, activo)
             WHERE usuario_id = $1 RETURNING ${CAMPOS}`,
            [id, cambios.rol ?? null, cambios.activo ?? null]
        );
        if (r.rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        }
        res.status(200).json({ status: 'success', message: 'Usuario actualizado.', data: r.rows[0] });
    } catch (err) {
        console.error('Error al actualizar el usuario:', err);
        res.status(500).json({ status: 'error', message: 'Error en el servidor al actualizar el usuario.' });
    }
};

module.exports = { listarUsuarios, actualizarUsuario };
