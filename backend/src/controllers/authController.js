const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Roles que un usuario puede elegir al registrarse. admin_ciat se asigna solo desde la base de datos.
const ROLES_REGISTRO = ['agronomo', 'productor'];
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mayúscula, minúscula, número y cualquier símbolo; máximo 72 porque bcrypt ignora el resto
const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,72}$/;
// Resumen bcrypt de relleno: iguala el tiempo de respuesta cuando el correo no existe
const HASH_RELLENO = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.8z5aR1Qe6eYk1xWJxQ0rC5XyZ9yq';

const esTexto = (valor, max) => typeof valor === 'string' && valor.trim().length > 0 && valor.length <= max;

const authController = {
    registrarUsuario: async (req, res) => {
        const { nombre_completo, email, password, telefono, ci_nit, rol } = req.body || {};

        if (!esTexto(nombre_completo, 150) || !esTexto(email, 150) || !esTexto(ci_nit, 30)) {
            return res.status(400).json({ message: "Nombre, correo y CI/NIT son obligatorios." });
        }

        if (!REGEX_EMAIL.test(email)) {
            return res.status(400).json({ message: "El correo electronico no es valido." });
        }

        if (telefono !== undefined && telefono !== null && telefono !== '' && !esTexto(String(telefono), 20)) {
            return res.status(400).json({ message: "El telefono no es valido." });
        }

        if (!ROLES_REGISTRO.includes(rol)) {
            return res.status(400).json({ message: "Rol no permitido." });
        }

        // Validacion de politica de seguridad (bcrypt solo considera los primeros 72 bytes)
        if (typeof password !== 'string' || !REGEX_PASSWORD.test(password)) {
            return res.status(400).json({ 
                message: "La contraseña debe tener minimo 8 caracteres, incluir mayusculas, minusculas, numeros y un caracter especial." 
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        try {
            // Verificacion de duplicados (Email o CI)
            const usuarioExistente = await db.query(
                'SELECT 1 FROM usuarios WHERE LOWER(email) = $1 OR ci_nit = $2',
                [emailNormalizado, ci_nit.trim()]
            );

            if (usuarioExistente.rows.length > 0) {
                return res.status(400).json({ 
                    message: "El correo electronico o el CI ya se encuentran registrados." 
                });
            }

            // Encriptacion
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Insercion
            const query = `
                INSERT INTO usuarios (nombre_completo, email, password_hash, telefono, ci_nit, rol)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING usuario_id;
            `;
            const values = [nombre_completo.trim(), emailNormalizado, passwordHash, telefono || null, ci_nit.trim(), rol];
            
            const resultado = await db.query(query, values);
            
            res.status(201).json({ 
                message: "Usuario registrado con exito", 
                id: resultado.rows[0].usuario_id 
            });
        } catch (error) {
            console.error("Error en registro:", error);
            res.status(500).json({ message: "Error interno del servidor al procesar el registro." });
        }
    },
    login: async (req, res) => {
        const { email, password } = req.body || {};

        if (!esTexto(email, 150) || typeof password !== 'string' || password.length === 0 || password.length > 200) {
            return res.status(400).json({ message: "Por favor, ingrese sus credenciales." });
        }

        try {
            // 1. Buscar al usuario por email
            const result = await db.query(
                'SELECT usuario_id, nombre_completo, email, password_hash, rol, ci_nit FROM usuarios WHERE LOWER(email) = $1',
                [email.trim().toLowerCase()]
            );
            const usuario = result.rows[0];

            // 2. Comparar la contraseña con el hash de la BD. Se compara siempre para no revelar,
            //    por tiempo de respuesta ni por mensaje, si el correo esta registrado (PT-S5).
            const validPassword = await bcrypt.compare(password, usuario ? usuario.password_hash : HASH_RELLENO);
            
            if (!usuario || !validPassword) {
                return res.status(401).json({ message: "Correo o contraseña incorrectos." });
            }

            // 3. Generar el Token (JWT)
            // Incluimos el ID y el Rol para que el Frontend sepa qué permisos mostrar
            const token = jwt.sign(
                { id: usuario.usuario_id, rol: usuario.rol },
                process.env.JWT_SECRET,
                { expiresIn: '8h', algorithm: 'HS256' } // El token expira en una jornada laboral técnica
            );

            res.status(200).json({
                message: "Autenticacion exitosa",
                token: token,
                user: {
                    id: usuario.usuario_id,
                    nombre: usuario.nombre_completo,
                    email: usuario.email,
                    rol: usuario.rol,
                    ci_nit: usuario.ci_nit
                }
            });

        } catch (error) {
            console.error("Error en login:", error);
            res.status(500).json({ message: "Error interno del servidor" });
        }
    }
};

module.exports = authController;
