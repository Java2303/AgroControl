const db = require('../config/db');
const { normalizarMac, generarToken, hashToken, tokenValido, validarTelemetria } = require('../utils/telemetria');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/telemetria — ingesta desde el nodo ESP32 (RF-10, RF-11, RN-15).
 * El nodo se autentica con la clave que recibió al vincularse (cabecera X-Dispositivo-Token);
 * la MAC del cuerpo identifica el lote.
 */
const recibirTelemetria = async (req, res) => {
    const { errores, datos } = validarTelemetria(req.body);
    if (errores.length > 0) {
        return res.status(400).json({ status: 'error', message: errores[0], errores });
    }
    try {
        const r = await db.query(
            `SELECT l.lote_id, l.clave_dispositivo_hash
             FROM lotes l JOIN parcelas p ON p.parcela_id = l.parcela_id
             WHERE l.dispositivo_mac = $1 AND p.activa`,
            [datos.mac]
        );
        // Mismo mensaje para MAC desconocida y clave incorrecta: no revela qué MAC están registradas
        if (r.rows.length === 0 || !tokenValido(req.get('x-dispositivo-token'), r.rows[0].clave_dispositivo_hash)) {
            return res.status(401).json({ status: 'error', message: 'Dispositivo no registrado o clave inválida.' });
        }
        const loteId = r.rows[0].lote_id;
        const v = datos.valores;
        const ins = await db.query(
            `INSERT INTO lecturas_suelo (lote_id, nitrogeno, fosforo, potasio, ph, humedad_suelo, temperatura_suelo, conductividad_electrica, fecha_captura, emulada)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING lectura_id, fecha_captura`,
            [loteId, v.nitrogeno, v.fosforo, v.potasio, v.ph, v.humedad_suelo, v.temperatura_suelo, v.conductividad_electrica, datos.fecha, datos.emulada]
        );
        await db.query('UPDATE lotes SET ultima_sincronizacion = CURRENT_TIMESTAMP WHERE lote_id = $1', [loteId]);
        res.status(201).json({ status: 'success', message: 'Lectura registrada.', data: ins.rows[0] });
    } catch (error) {
        console.error('Error al registrar la telemetría:', error);
        res.status(500).json({ status: 'error', message: 'Error en el servidor al registrar la lectura.' });
    }
};

/**
 * POST /api/parcelas/:id/dispositivo — vincula un ESP32 (por su MAC) a un lote de una parcela propia.
 * El cuerpo indica el lote (loteId); sin él se usa el primero de la parcela.
 * Devuelve la clave del dispositivo una sola vez: en la base solo queda su hash.
 * Las lecturas simuladas del lote se descartan para que el historial contenga solo datos reales.
 */
const vincularDispositivo = async (req, res) => {
    const parcelaId = req.params.id;
    const mac = normalizarMac(req.body && req.body.mac);
    const loteElegido = req.body && req.body.loteId ? String(req.body.loteId) : null;
    if (!UUID.test(parcelaId) || (loteElegido && !UUID.test(loteElegido))) {
        return res.status(404).json({ status: 'error', message: 'Parcela no encontrada o sin permisos.' });
    }
    if (!mac) {
        return res.status(400).json({ status: 'error', message: 'Ingrese la dirección MAC del ESP32 con el formato AA:BB:CC:DD:EE:FF.' });
    }
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const lote = await client.query(
            `SELECT l.lote_id, l.clave_dispositivo_hash
             FROM lotes l JOIN parcelas p ON p.parcela_id = l.parcela_id
             WHERE p.parcela_id = $1 AND p.usuario_id = $2 AND p.activa AND ($3::uuid IS NULL OR l.lote_id = $3)
             ORDER BY l.nombre_lote LIMIT 1 FOR UPDATE OF l`,
            [parcelaId, req.usuario.id, loteElegido]
        );
        if (lote.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ status: 'error', message: 'Parcela no encontrada, sin permisos o sin lote de monitoreo.' });
        }
        const { lote_id: loteId, clave_dispositivo_hash: hashPrevio } = lote.rows[0];
        // Una MAC ficticia del simulador no debe impedir registrar un dispositivo real con esa MAC
        await client.query(
            'UPDATE lotes SET dispositivo_mac = NULL WHERE dispositivo_mac = $1 AND clave_dispositivo_hash IS NULL AND lote_id <> $2',
            [mac, loteId]
        );
        if (!hashPrevio) {
            // Las lecturas que respaldan un certificado emitido se conservan
            await client.query('DELETE FROM lecturas_suelo WHERE lote_id = $1 AND lectura_id NOT IN (SELECT lectura_id FROM reportes)', [loteId]);
        }
        const token = generarToken();
        await client.query(
            'UPDATE lotes SET dispositivo_mac = $1, clave_dispositivo_hash = $2, ultima_sincronizacion = NULL WHERE lote_id = $3',
            [mac, hashToken(token), loteId]
        );
        await client.query('COMMIT');
        res.status(200).json({
            status: 'success',
            message: 'Sensor vinculado. Copie la clave en el firmware del nodo: no se volverá a mostrar.',
            data: { mac, token, loteId },
        });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(409).json({ status: 'error', message: 'Esa MAC ya está vinculada a otra parcela.' });
        }
        console.error('Error al vincular el dispositivo:', error);
        res.status(500).json({ status: 'error', message: 'Error en el servidor al vincular el sensor.' });
    } finally {
        client.release();
    }
};

/**
 * DELETE /api/parcelas/:id/dispositivo?loteId= — desvincula el nodo del lote (sin loteId, de todos los lotes);
 * el lote vuelve al simulador y conserva sus lecturas.
 */
const desvincularDispositivo = async (req, res) => {
    const parcelaId = req.params.id;
    const loteElegido = req.query.loteId ? String(req.query.loteId) : null;
    if (!UUID.test(parcelaId) || (loteElegido && !UUID.test(loteElegido))) {
        return res.status(404).json({ status: 'error', message: 'Parcela no encontrada o sin permisos.' });
    }
    try {
        const r = await db.query(
            `UPDATE lotes l SET dispositivo_mac = NULL, clave_dispositivo_hash = NULL
             FROM parcelas p
             WHERE p.parcela_id = l.parcela_id AND p.parcela_id = $1 AND p.usuario_id = $2 AND p.activa
               AND l.clave_dispositivo_hash IS NOT NULL AND ($3::uuid IS NULL OR l.lote_id = $3)`,
            [parcelaId, req.usuario.id, loteElegido]
        );
        if (r.rowCount === 0) {
            return res.status(404).json({ status: 'error', message: 'El lote no tiene un sensor vinculado.' });
        }
        res.status(200).json({ status: 'success', message: 'Sensor desvinculado.' });
    } catch (error) {
        console.error('Error al desvincular el dispositivo:', error);
        res.status(500).json({ status: 'error', message: 'Error en el servidor al desvincular el sensor.' });
    }
};

module.exports = { recibirTelemetria, vincularDispositivo, desvincularDispositivo };
