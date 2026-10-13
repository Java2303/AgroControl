const { Pool } = require('pg');
const path = require('path');
// Forzamos la carga del .env especificando la ruta exacta
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// En la nube (Neon) se usa DATABASE_URL, que ya incluye sslmode=require.
// En local se usan las variables DB_* del archivo .env.
const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
    : new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: String(process.env.DB_PASSWORD || ''), // Forzamos que sea String
        port: process.env.DB_PORT,
    });

if (!process.env.DATABASE_URL && !process.env.DB_PASSWORD) {
    console.error('ALERTA: no se definió DATABASE_URL ni DB_PASSWORD en el .env');
}

// Un cliente inactivo que pierde la conexión (p. ej. Neon suspendido) no debe tumbar el proceso
pool.on('error', (err) => {
    console.error('Error en una conexión inactiva de PostgreSQL:', err.message);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
