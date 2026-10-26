const db = require('../config/db');

// Cobertura máxima de un nodo sensor (restricción check_cobertura_sensor de la tabla lotes)
const SUPERFICIE_MAX_LOTE = 15;

const simulateSensors = async () => {
    try {
        // 1. Obtener todas las parcelas de la base de datos
        // Las parcelas con un nodo ESP32 vinculado reciben lecturas reales por POST /api/telemetria
        const resParcelas = await db.query(
            `SELECT parcela_id, nombre, area_hectareas FROM parcelas p
             WHERE activa AND NOT EXISTS (SELECT 1 FROM lotes l WHERE l.parcela_id = p.parcela_id AND l.dispositivo_token_hash IS NOT NULL)`
        );
        const parcelas = resParcelas.rows;

        for (const parcela of parcelas) {
          // Un error en una parcela no debe detener la simulación de las demás
          try {
            // 2. Verificar si la parcela tiene un lote creado, si no, crearlo
            let resLote = await db.query('SELECT lote_id FROM lotes WHERE parcela_id = $1 LIMIT 1', [parcela.parcela_id]);
            let loteId;

            if (resLote.rows.length === 0) {
                const macRandom = `00:1A:C2:${Math.floor(Math.random() * 90 + 10)}:${Math.floor(Math.random() * 90 + 10)}:${Math.floor(Math.random() * 90 + 10)}`;
                const insertLote = await db.query(
                    `INSERT INTO lotes (parcela_id, nombre_lote, descripcion, superficie_ha, dispositivo_mac)
                     VALUES ($1, $2, $3, $4, $5) RETURNING lote_id`,
                    [parcela.parcela_id, `Lote Principal - ${parcela.nombre}`, `Lote de monitoreo para ${parcela.nombre}`, Math.min(parseFloat(parcela.area_hectareas), SUPERFICIE_MAX_LOTE), macRandom]
                );
                loteId = insertLote.rows[0].lote_id;
                console.log(`[Simulador] Creado lote principal para parcela ${parcela.nombre}`);
            } else {
                loteId = resLote.rows[0].lote_id;
            }

            // 3. Generar lecturas con pequeñas variaciones sobre rangos óptimos
            const humedad = parseFloat((Math.random() * 30 + 45).toFixed(1)); // 45% - 75%
            const temperatura = parseFloat((Math.random() * 12 + 18).toFixed(1)); // 18°C - 30°C
            const ph = parseFloat((Math.random() * 1.6 + 5.9).toFixed(1)); // 5.9 - 7.5
            const nitrogeno = parseFloat((Math.random() * 80 + 75).toFixed(1)); // 75 - 155 ppm
            const fosforo = parseFloat((Math.random() * 40 + 40).toFixed(1)); // 40 - 80 ppm
            const potasio = parseFloat((Math.random() * 100 + 100).toFixed(1)); // 100 - 200 ppm
            const ec = Math.floor(Math.random() * 500 + 300); // 300 - 800 uS/cm

            // 4. Registrar lectura en PostgreSQL
            await db.query(
                `INSERT INTO lecturas_suelo (lote_id, nitrogeno, fosforo, potasio, ph, humedad_suelo, temperatura_suelo, conductividad_electrica)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [loteId, nitrogeno, fosforo, potasio, ph, humedad, temperatura, ec]
            );
          } catch (errParcela) {
            console.error(`[Simulador] Error en la parcela ${parcela.nombre}:`, errParcela.message);
          }
        }

        // 5. Mantener la base de datos limpia borrando lecturas viejas que pasen de las últimas 50 por lote
        await db.query(`
            DELETE FROM lecturas_suelo 
            WHERE lectura_id NOT IN (
                SELECT lectura_id 
                FROM (
                    SELECT lectura_id, ROW_NUMBER() OVER (PARTITION BY lote_id ORDER BY fecha_captura DESC) as rn
                    FROM lecturas_suelo
                ) t
                WHERE t.rn <= 50
            )
            AND lote_id IN (SELECT lote_id FROM lotes WHERE dispositivo_token_hash IS NULL)
        `);

    } catch (err) {
        console.error('[Simulador] Error al generar lecturas:', err);
    }
};

// Iniciar simulación periódica cada 15 segundos
const startSimulator = () => {
    console.log('--- Iniciando simulador de sensores IoT de Agro-Control ---');
    // Ejecución inicial inmediata
    simulateSensors();
    // Bucle periódico
    setInterval(simulateSensors, 15000);
};

module.exports = { startSimulator };
