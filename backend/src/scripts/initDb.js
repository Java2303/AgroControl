/**
 * Inicializa una base de datos vacía (p. ej. Neon) con el esquema de Agro Control
 * y el catálogo de cultivos del CIAT. Es seguro ejecutarlo más de una vez:
 * si las tablas ya existen, solo sincroniza el catálogo.
 *
 * Uso (desde backend/): npm run db:init
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const { ciatCrops } = require('../data/cultivosCiat');

async function initDb() {
    const client = await pool.connect();
    try {
        const { rows } = await client.query("SELECT to_regclass('public.usuarios') AS existe");

        if (rows[0].existe) {
            console.log('El esquema ya existe: se omite la creación de tablas.');
        } else {
            const schema = fs.readFileSync(path.resolve(__dirname, '../../db/schema.sql'), 'utf8');
            await client.query(schema);
            console.log('Esquema creado (PostGIS, tablas, índices y restricciones).');
        }

        // El volcado de pg_dump vacía el search_path de la sesión; se restablece para las consultas siguientes
        await client.query('SET search_path TO public');

        for (const crop of ciatCrops) {
            await client.query(
                `INSERT INTO tipos_cultivo (tipo_cultivo_id, nombre, descripcion)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (tipo_cultivo_id) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion`,
                [crop.id, crop.nombre, crop.descripcion]
            );
        }
        // La secuencia debe continuar después de los IDs fijos del catálogo
        await client.query(
            "SELECT setval('tipos_cultivo_tipo_cultivo_id_seq', (SELECT MAX(tipo_cultivo_id) FROM tipos_cultivo))"
        );
        console.log(`Catálogo sincronizado: ${ciatCrops.length} cultivos del CIAT.`);
    } finally {
        client.release();
        await pool.end();
    }
}

initDb().catch((err) => {
    console.error('Error al inicializar la base de datos:', err.message);
    process.exit(1);
});
