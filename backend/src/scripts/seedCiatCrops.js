const pool = require('../config/db');

const { ciatCrops } = require('../data/cultivosCiat');

async function seed() {
  try {
    for (const crop of ciatCrops) {
      await pool.query(`
        INSERT INTO tipos_cultivo (tipo_cultivo_id, nombre, descripcion)
        VALUES ($1, $2, $3)
        ON CONFLICT (tipo_cultivo_id) 
        DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;
      `, [crop.id, crop.nombre, crop.descripcion]);
    }
    const res = await pool.query('SELECT tipo_cultivo_id, nombre FROM tipos_cultivo ORDER BY tipo_cultivo_id ASC;');
    console.log('Cultivos del CIAT / Santa Cruz sincronizados en BD:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error al insertar cultivos:', err);
    process.exit(1);
  }
}

seed();
