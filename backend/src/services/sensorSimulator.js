const db = require('../config/db');

const simulateSensors = async () => {
    try {
        // Parcelas registradas sin lotes (p. ej. cargadas a mano en la base)
        await db.query(
            `SELECT public.crear_lotes_de_parcela(parcela_id) FROM parcelas p
             WHERE activa AND NOT EXISTS (SELECT 1 FROM lotes l WHERE l.parcela_id = p.parcela_id)`
        );
        // Los lotes con un nodo ESP32 vinculado reciben lecturas reales por POST /api/telemetria
        const resLotes = await db.query(
            `SELECT l.lote_id, l.nombre_lote, p.nombre FROM lotes l JOIN parcelas p ON p.parcela_id = l.parcela_id
             WHERE p.activa AND l.clave_dispositivo_hash IS NULL`
        );

        for (const { lote_id: loteId, nombre_lote, nombre } of resLotes.rows) {
          // Un error en un lote no debe detener la simulación de los demás
          try {

            const humedad = parseFloat((Math.random() * 30 + 45).toFixed(1)); // 45% - 75%
            const temperatura = parseFloat((Math.random() * 12 + 18).toFixed(1)); // 18°C - 30°C
            const ph = parseFloat((Math.random() * 1.6 + 5.9).toFixed(1)); // 5.9 - 7.5
            const nitrogeno = parseFloat((Math.random() * 80 + 75).toFixed(1)); // 75 - 155 ppm
            const fosforo = parseFloat((Math.random() * 40 + 40).toFixed(1)); // 40 - 80 ppm
            const potasio = parseFloat((Math.random() * 100 + 100).toFixed(1)); // 100 - 200 ppm
            const ec = Math.floor(Math.random() * 500 + 300); // 300 - 800 uS/cm

            await db.query(
                `INSERT INTO lecturas_suelo (lote_id, nitrogeno, fosforo, potasio, ph, humedad_suelo, temperatura_suelo, conductividad_electrica)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [loteId, nitrogeno, fosforo, potasio, ph, humedad, temperatura, ec]
            );
          } catch (errParcela) {
            console.error(`[Simulador] Error en ${nombre} (${nombre_lote}):`, errParcela.message);
          }
        }

        // Conserva solo las últimas 50 lecturas de cada lote
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
            AND lote_id IN (SELECT lote_id FROM lotes WHERE clave_dispositivo_hash IS NULL)
            AND lectura_id NOT IN (SELECT lectura_id FROM reportes)  -- la lectura de un certificado se conserva
        `);

    } catch (err) {
        console.error('[Simulador] Error al generar lecturas:', err);
    }
};

const startSimulator = () => {
    console.log('--- Iniciando simulador de sensores IoT de Agro-Control ---');
    simulateSensors();
    setInterval(simulateSensors, 15000);
};

module.exports = { startSimulator };
