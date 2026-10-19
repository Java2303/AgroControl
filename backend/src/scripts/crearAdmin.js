/**
 * Crea (o promueve) una cuenta de administrador del CIAT. El registro público no permite este rol,
 * así que se asigna solo desde el servidor.
 *
 * Uso (desde backend/):
 *   ADMIN_PASSWORD='Clave.Segura1' node src/scripts/crearAdmin.js correo@ciat.bo "Nombre Completo" CI-123
 * Si el correo ya existe, solo se le asigna el rol admin_ciat (la contraseña no cambia).
 */
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,72}$/;

(async () => {
    const [email, nombre, ci] = process.argv.slice(2);
    if (!email || !nombre || !ci) {
        console.error('Uso: ADMIN_PASSWORD=... node src/scripts/crearAdmin.js <correo> "<nombre completo>" <ci_nit>');
        process.exit(1);
    }
    try {
        const correo = email.trim().toLowerCase();
        const existe = await db.query('SELECT usuario_id FROM usuarios WHERE LOWER(email) = $1', [correo]);
        if (existe.rowCount > 0) {
            await db.query("UPDATE usuarios SET rol = 'admin_ciat' WHERE usuario_id = $1", [existe.rows[0].usuario_id]);
            console.log(`El usuario ${correo} ahora es administrador del CIAT.`);
        } else {
            const clave = process.env.ADMIN_PASSWORD || '';
            if (!REGEX_PASSWORD.test(clave)) {
                console.error('Defina ADMIN_PASSWORD con 8+ caracteres, mayúscula, minúscula, número y símbolo.');
                process.exit(1);
            }
            await db.query(
                `INSERT INTO usuarios (nombre_completo, email, password_hash, ci_nit, rol)
                 VALUES ($1, $2, $3, $4, 'admin_ciat')`,
                [nombre.trim(), correo, await bcrypt.hash(clave, 10), ci.trim()]
            );
            console.log(`Administrador del CIAT creado: ${correo}`);
        }
    } catch (err) {
        console.error('Error al crear el administrador:', err.message);
        process.exitCode = 1;
    } finally {
        await db.pool.end();
    }
})();
