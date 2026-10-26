const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const parcelasRoutes = require('./src/routes/parcelasRoutes');
const cultivosRoutes = require('./src/routes/cultivosRoutes');
const sensoresRoutes = require('./src/routes/sensoresRoutes');
const reglasRoutes = require('./src/routes/reglasRoutes');
const actividadesRoutes = require('./src/routes/actividadesRoutes');
const historialRoutes = require('./src/routes/historialRoutes');
const telemetriaRoutes = require('./src/routes/telemetriaRoutes');
const { startSimulator } = require('./src/services/sensorSimulator');
// Sin un secreto robusto cualquiera podria firmar tokens validos
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('ERROR: JWT_SECRET no definido o demasiado corto (minimo 32 caracteres).');
    process.exit(1);
}

const app = express();

// Detrás del proxy de Render/Vercel: confiar en el primer salto para obtener la IP real del cliente
// (la usa el limitador de intentos del login)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Origenes permitidos: CORS_ORIGINS="https://dominio1,https://dominio2".
// Por defecto: Next.js en desarrollo y la app Android de Capacitor (https://localhost).
const origenesPermitidos = (process.env.CORS_ORIGINS || 'http://localhost:3000,https://localhost,http://localhost,capacitor://localhost')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        // Solicitudes sin Origin (curl, nodos IoT) no estan sujetas a CORS
        if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
        callback(null, false);
    }
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/parcelas', parcelasRoutes);
app.use('/api', cultivosRoutes);
app.use('/api', sensoresRoutes);
app.use('/api', reglasRoutes);
app.use('/api', actividadesRoutes);
app.use('/api', historialRoutes);
app.use('/api', telemetriaRoutes);

// --- Ruta de Prueba de Conexión (también la usa Render como health check) ---
app.get('/test-db', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json({
            status: 'success',
            message: 'Conexión con PostgreSQL exitosa',
            server_time: result.rows[0].now
        });
    } catch (err) {
        console.error('Error al conectar con la BD:', err);
        res.status(500).json({
            status: 'error',
            message: 'No se pudo conectar con la base de datos'
        });
    }
});

// Manejador de errores: evita exponer trazas internas (JSON mal formado, errores no controlados)
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ status: 'error', message: 'JSON mal formado.' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ status: 'error', message: 'Solicitud demasiado grande.' });
    }
    console.error('Error no controlado:', err);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor de Agro Control corriendo en puerto ${PORT}`);
    // El simulador genera lecturas ficticias: desactivarlo con SIMULAR_SENSORES=false cuando haya nodos reales
    if (process.env.SIMULAR_SENSORES !== 'false') {
        startSimulator();
    }
});