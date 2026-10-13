const pool = require('../config/db');

// Coordenadas reales y precisas de zonas agrícolas de Santa Cruz (Área < 50 hectáreas para la regla CIAT)
const sampleParcels = [
  {
    nombre: 'Lote Soya Norte CIAT',
    ubicacion_nombre: 'Estación Saavedra (Montero)',
    tipo_cultivo_id: 1, // Soya
    area_hectareas: 8.50,
    polygon: [
      [-63.2150, -17.2350],
      [-63.2120, -17.2350],
      [-63.2120, -17.2380],
      [-63.2150, -17.2380],
      [-63.2150, -17.2350]
    ]
  },
  {
    nombre: 'Parcela Maíz Híbrido CIAT',
    ubicacion_nombre: 'Warnes - Zona Norte Integrada',
    tipo_cultivo_id: 2, // Maíz
    area_hectareas: 6.20,
    polygon: [
      [-63.1620, -17.5130],
      [-63.1590, -17.5130],
      [-63.1590, -17.5160],
      [-63.1620, -17.5160],
      [-63.1620, -17.5130]
    ]
  },
  {
    nombre: 'Campo Trigo Motacú',
    ubicacion_nombre: 'Colonia Okinawa / San Pedro',
    tipo_cultivo_id: 3, // Trigo
    area_hectareas: 11.40,
    polygon: [
      [-62.8880, -17.2120],
      [-62.8840, -17.2120],
      [-62.8840, -17.2160],
      [-62.8880, -17.2160],
      [-62.8880, -17.2120]
    ]
  },
  {
    nombre: 'Cañaveral Guabirá Lote 4',
    ubicacion_nombre: 'Mineros - Portachuelo',
    tipo_cultivo_id: 7, // Caña de Azúcar
    area_hectareas: 14.80,
    polygon: [
      [-63.2280, -17.1180],
      [-63.2230, -17.1180],
      [-63.2230, -17.1230],
      [-63.2280, -17.1230],
      [-63.2280, -17.1180]
    ]
  },
  {
    nombre: 'Girasol Invierno Sector Este',
    ubicacion_nombre: 'Cuatro Cañadas - Pailón',
    tipo_cultivo_id: 5, // Girasol
    area_hectareas: 7.60,
    polygon: [
      [-62.5580, -17.2720],
      [-62.5550, -17.2720],
      [-62.5550, -17.2760],
      [-62.5580, -17.2760],
      [-62.5580, -17.2720]
    ]
  },
  {
    nombre: 'Finca Sorgo Granífero',
    ubicacion_nombre: 'Cotoca - Santa Cruz',
    tipo_cultivo_id: 6, // Sorgo
    area_hectareas: 9.30,
    polygon: [
      [-63.0580, -17.7570],
      [-63.0540, -17.7570],
      [-63.0540, -17.7610],
      [-63.0580, -17.7610],
      [-63.0580, -17.7570]
    ]
  }
];

async function seedRandomData() {
  try {
    console.log('--- Iniciando carga de datos de ejemplo agrícolas para Santa Cruz / CIAT ---');

    // 1. Usuarios a poblar: los correos pasados como argumento o, si no hay, todos
    //    Uso: node src/scripts/seedRandomDemoData.js [correo1 correo2 ...]
    const correos = process.argv.slice(2).map(c => c.toLowerCase());
    const userRes = correos.length > 0
      ? await pool.query('SELECT usuario_id, email, nombre_completo FROM usuarios WHERE LOWER(email) = ANY($1);', [correos])
      : await pool.query('SELECT usuario_id, email, nombre_completo FROM usuarios;');
    if (userRes.rows.length === 0) {
      console.log('No se encontraron usuarios en la BD.');
      process.exit(1);
    }

    const usuarios = userRes.rows;
    console.log(`Poblando datos de ejemplo para ${usuarios.length} usuario(s)...`);

    for (const user of usuarios) {
      console.log(`\n> Configurando datos para usuario: ${user.email} (${user.nombre_completo})...`);

      for (const p of sampleParcels) {
        // Verificar si la parcela ya existe para este usuario
        const existing = await pool.query(
          'SELECT parcela_id FROM parcelas WHERE usuario_id = $1 AND nombre = $2',
          [user.usuario_id, p.nombre]
        );

        let parcelaId;
        const geomObj = { type: 'Polygon', coordinates: [p.polygon] };

        if (existing.rows.length === 0) {
          const insertParcela = await pool.query(`
            INSERT INTO parcelas (usuario_id, nombre, ubicacion_nombre, tipo_cultivo_id, area_hectareas, geom)
            VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_GeomFromGeoJSON($6), 4326))
            RETURNING parcela_id;
          `, [user.usuario_id, p.nombre, p.ubicacion_nombre, p.tipo_cultivo_id, p.area_hectareas, JSON.stringify(geomObj)]);
          
          parcelaId = insertParcela.rows[0].parcela_id;
          console.log(`  [+] Creada parcela: "${p.nombre}" (${p.area_hectareas} ha)`);
        } else {
          parcelaId = existing.rows[0].parcela_id;
        }

        // Crear o buscar lote
        const existingLote = await pool.query(
          'SELECT lote_id FROM lotes WHERE parcela_id = $1 LIMIT 1',
          [parcelaId]
        );

        let loteId;
        if (existingLote.rows.length === 0) {
          const mac = `00:1A:C2:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}`;
          const insertLote = await pool.query(`
            INSERT INTO lotes (parcela_id, nombre_lote, descripcion, superficie_ha, dispositivo_mac)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING lote_id;
          `, [parcelaId, `Lote Principal - ${p.nombre}`, `Lote de telemetría IoT para ${p.nombre}`, p.area_hectareas, mac]);
          
          loteId = insertLote.rows[0].lote_id;
        } else {
          loteId = existingLote.rows[0].lote_id;
        }

        // Generar 12 lecturas históricas con variaciones realistas
        for (let i = 11; i >= 0; i--) {
          const timestamp = new Date(Date.now() - i * 1800000); // Cada 30 minutos
          
          const humedad = parseFloat((Math.random() * 25 + 50).toFixed(1)); // 50% - 75%
          const temperatura = parseFloat((Math.random() * 8 + 22).toFixed(1)); // 22°C - 30°C
          const ph = parseFloat((Math.random() * 1.2 + 6.2).toFixed(2)); // 6.2 - 7.4
          const nitrogeno = parseFloat((Math.random() * 50 + 90).toFixed(1)); // 90 - 140 ppm
          const fosforo = parseFloat((Math.random() * 30 + 45).toFixed(1)); // 45 - 75 ppm
          const potasio = parseFloat((Math.random() * 80 + 120).toFixed(1)); // 120 - 200 ppm
          const ec = Math.floor(Math.random() * 400 + 350); // 350 - 750 uS/cm

          await pool.query(`
            INSERT INTO lecturas_suelo (lote_id, nitrogeno, fosforo, potasio, ph, humedad_suelo, temperatura_suelo, conductividad_electrica, fecha_captura)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
          `, [loteId, nitrogeno, fosforo, potasio, ph, humedad, temperatura, ec, timestamp]);
        }
      }
    }

    console.log('\n--- Carga de datos aleatorios de ejemplo completada exitosamente ---');
    process.exit(0);
  } catch (error) {
    console.error('Error al poblar datos:', error);
    process.exit(1);
  }
}

seedRandomData();
