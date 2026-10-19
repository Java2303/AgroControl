const db = require('../config/db');
const { validarActividad, hoyEnBolivia, EVENTOS_SISTEMA } = require('../utils/actividades');

/** La parcela debe existir y pertenecer al usuario autenticado (RN-07). */
async function parcelaDelUsuario(parcelaId, usuarioId) {
    const r = await db.query('SELECT parcela_id FROM parcelas WHERE parcela_id = $1 AND usuario_id = $2', [parcelaId, usuarioId]);
    return r.rowCount > 0;
}

const esUUID = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const COLUMNAS = `
    a.actividad_id AS id,
    a.parcela_id AS "parcelId",
    a.tipo,
    to_char(a.fecha, 'YYYY-MM-DD') AS fecha,
    a.producto,
    a.cantidad,
    a.unidad,
    a.descripcion,
    a.detalle,
    a.anulada,
    a.motivo_anulacion AS "motivoAnulacion",
    a.fecha_anulacion AS "fechaAnulacion",
    a.fecha_registro AS "fechaRegistro",
    u.nombre_completo AS "registradoPor",
    ua.nombre_completo AS "anuladaPor"`;

/** GET /api/parcelas/:id/actividades — bitácora de la parcela, de la más reciente a la más antigua. */
const listarActividades = async (req, res) => {
    try {
        const parcelaId = req.params.id;
        if (!esUUID(parcelaId) || !(await parcelaDelUsuario(parcelaId, req.usuario.id))) {
            return res.status(404).json({ status: 'error', message: 'Parcela no encontrada o sin permisos.' });
        }

        const r = await db.query(
            `SELECT ${COLUMNAS}
             FROM actividades_parcela a
             JOIN usuarios u ON u.usuario_id = a.usuario_id
             LEFT JOIN usuarios ua ON ua.usuario_id = a.anulada_por
             WHERE a.parcela_id = $1
             ORDER BY a.fecha DESC, a.fecha_registro DESC`,
            [parcelaId]
        );

        res.json({
            status: 'success',
            data: r.rows.map((a) => ({ ...a, cantidad: a.cantidad === null ? null : Number(a.cantidad) })),
        });
    } catch (error) {
        console.error('Error al listar actividades:', error);
        res.status(500).json({ status: 'error', message: 'Error al cargar la bitácora de la parcela.' });
    }
};

/** POST /api/parcelas/:id/actividades — registra una labor. */
const crearActividad = async (req, res) => {
    try {
        const parcelaId = req.params.id;
        if (!esUUID(parcelaId) || !(await parcelaDelUsuario(parcelaId, req.usuario.id))) {
            return res.status(404).json({ status: 'error', message: 'Parcela no encontrada o sin permisos.' });
        }

        const { errores, datos } = validarActividad(req.body, hoyEnBolivia());
        if (errores.length > 0) {
            return res.status(400).json({ status: 'error', message: errores[0], errores });
        }

        const r = await db.query(
            `INSERT INTO actividades_parcela (parcela_id, usuario_id, tipo, fecha, producto, cantidad, unidad, descripcion)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING actividad_id AS id`,
            [parcelaId, req.usuario.id, datos.tipo, datos.fecha, datos.producto, datos.cantidad, datos.unidad, datos.descripcion]
        );

        res.status(201).json({ status: 'success', message: 'Labor registrada en la bitácora.', data: { id: r.rows[0].id } });
    } catch (error) {
        console.error('Error al registrar actividad:', error);
        res.status(500).json({ status: 'error', message: 'Error al registrar la labor.' });
    }
};

/**
 * PATCH /api/actividades/:id/anular — anula una labor con un motivo.
 * No se elimina: queda en la bitácora marcada como anulada (trazabilidad).
 */
const anularActividad = async (req, res) => {
    try {
        const actividadId = req.params.id;
        const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
        if (!esUUID(actividadId)) {
            return res.status(404).json({ status: 'error', message: 'Labor no encontrada o sin permisos.' });
        }
        if (motivo.length < 5 || motivo.length > 300) {
            return res.status(400).json({ status: 'error', message: 'Indique el motivo de la anulación (entre 5 y 300 caracteres).' });
        }

        // Solo el dueño de la parcela puede anular; una labor ya anulada no se vuelve a anular
        // y los eventos del sistema (registro y ediciones de la parcela) no se anulan
        const r = await db.query(
            `UPDATE actividades_parcela a
             SET anulada = true, motivo_anulacion = $1, anulada_por = $2, fecha_anulacion = CURRENT_TIMESTAMP
             FROM parcelas p
             WHERE a.actividad_id = $3 AND a.parcela_id = p.parcela_id AND p.usuario_id = $2 AND a.anulada = false
               AND a.tipo <> ALL($4::text[])
             RETURNING a.actividad_id AS id`,
            [motivo, req.usuario.id, actividadId, EVENTOS_SISTEMA]
        );

        if (r.rowCount === 0) {
            return res.status(404).json({ status: 'error', message: 'Labor no encontrada, sin permisos o ya anulada.' });
        }
        res.json({ status: 'success', message: 'Labor anulada.', data: { id: r.rows[0].id } });
    } catch (error) {
        console.error('Error al anular actividad:', error);
        res.status(500).json({ status: 'error', message: 'Error al anular la labor.' });
    }
};

module.exports = { listarActividades, crearActividad, anularActividad };
