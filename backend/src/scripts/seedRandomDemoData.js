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

// --- Bitácora de labores de ejemplo: una campaña por parcela, con fechas relativas a hoy ---
const SEMILLA = { 1: 'Semilla certificada de soya', 2: 'Semilla híbrida de maíz', 3: 'Semilla certificada de trigo', 5: 'Semilla híbrida de girasol', 6: 'Semilla de sorgo granífero', 7: 'Esquejes de caña de azúcar' };
const DENSIDAD = { 1: [70, 'kg/ha'], 2: [22, 'kg/ha'], 3: [110, 'kg/ha'], 5: [5, 'kg/ha'], 6: [12, 'kg/ha'], 7: [12, 't/ha'] };
const RENDIMIENTO = { 1: [3.1, 't/ha'], 2: [6.4, 't/ha'], 3: [2.2, 't/ha'], 5: [1.9, 't/ha'], 6: [4.3, 't/ha'], 7: [78, 't/ha'] };

const haceDias = (n) => new Date(Date.now() - 4 * 3600e3 - n * 86400e3).toISOString().slice(0, 10);

function registradorPara(usuario, agronomoDemo) {
  return ['agronomo', 'admin_ciat'].includes(usuario.rol) ? usuario.usuario_id : (agronomoDemo || usuario.usuario_id);
}

async function sembrarBitacora(parcelaId, registradorId, p, indice) {
  const ya = await pool.query('SELECT 1 FROM actividades_parcela WHERE parcela_id = $1 LIMIT 1', [parcelaId]);
  if (ya.rowCount > 0) return;

  const cultivo = p.tipo_cultivo_id;
  // Parcelas pares: campaña ya cosechada; impares: cultivo en pie
  const cosechada = indice % 2 === 0;
  const siembra = cosechada ? 150 + indice * 3 : 55 + indice * 4;
  const labores = [
    ['muestreo', siembra + 20, null, null, null, 'Muestra compuesta 0–20 cm enviada al laboratorio de suelos.'],
    ...(indice === 1 ? [['encalado', siembra + 12, 'Cal agrícola dolomítica', 1.5, 't/ha', 'Corrección de acidez según el análisis de suelo.']] : []),
    ['siembra', siembra, SEMILLA[cultivo], DENSIDAD[cultivo][0], DENSIDAD[cultivo][1], 'Siembra directa sobre rastrojo.'],
    ['fertilizacion', siembra, 'Fosfato diamónico 18-46-0', 100, 'kg/ha', 'Fertilización de base en la línea de siembra.'],
    ['fertilizacion', siembra - 35, 'Urea 46 %', 80, 'kg/ha', 'Fertilización nitrogenada de cobertura.'],
    ['fitosanitario', siembra - 50, 'Insecticida (control de orugas)', 0.25, 'L/ha', 'Aplicación por monitoreo de plagas sobre el umbral.'],
    ['riego', siembra - 42, null, 25, 'mm', 'Riego suplementario por déficit hídrico.'],
    ...(cosechada ? [['cosecha', siembra - 120, null, RENDIMIENTO[cultivo][0], RENDIMIENTO[cultivo][1], 'Cosecha mecanizada.']] : []),
  ].filter(([, dias]) => dias >= 0);

  for (const [tipo, dias, producto, cantidad, unidad, descripcion] of labores) {
    await pool.query(
      `INSERT INTO actividades_parcela (parcela_id, usuario_id, tipo, fecha, producto, cantidad, unidad, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [parcelaId, registradorId, tipo, haceDias(dias), producto, cantidad, unidad, descripcion]
    );
  }
  console.log(`  [+] Bitácora: ${labores.length} labores para "${p.nombre}"`);
}

async function seedRandomData() {
  try {
    console.log('--- Iniciando carga de datos de ejemplo agrícolas para Santa Cruz / CIAT ---');

    // 1. Usuarios a poblar: los correos pasados como argumento o, si no hay, todos
    //    Uso: node src/scripts/seedRandomDemoData.js [correo1 correo2 ...]
    const correos = process.argv.slice(2).map(c => c.toLowerCase());
    const userRes = correos.length > 0
      ? await pool.query('SELECT usuario_id, email, nombre_completo, rol FROM usuarios WHERE LOWER(email) = ANY($1);', [correos])
      : await pool.query('SELECT usuario_id, email, nombre_completo, rol FROM usuarios;');
    // Las labores las registra un agrónomo (Cuadro 3.36); se usa para las parcelas de productores
    const agronomoDemo = (await pool.query(
      "SELECT usuario_id FROM usuarios WHERE rol IN ('agronomo', 'admin_ciat') ORDER BY (email = 'agronomo@agrocontrol.bo') DESC, fecha_registro LIMIT 1"
    )).rows[0]?.usuario_id;
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

        await sembrarBitacora(parcelaId, registradorPara(user, agronomoDemo), p, sampleParcels.indexOf(p));
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
