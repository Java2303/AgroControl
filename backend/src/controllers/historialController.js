const db = require('../config/db');
const { MOTIVOS_BAJA } = require('../utils/actividades');

/**
 * GET /api/historial/parcelas?estado=todas|activas|baja
 * Historial de parcelas, incluidas las dadas de baja. El administrador del CIAT ve las de toda la
 * institución (Cuadro 3.36); los demás usuarios, solo las propias.
 */
const historialParcelas = async (req, res) => {
    try {
        const estado = ['activas', 'baja'].includes(req.query.estado) ? req.query.estado : 'todas';
        const esAdmin = req.usuario.rol === 'admin_ciat';

        const condiciones = [];
        const params = [req.usuario.id];
        if (!esAdmin) condiciones.push('p.usuario_id = $1');
        if (estado === 'activas') condiciones.push('p.activa');
        if (estado === 'baja') condiciones.push('NOT p.activa');
        const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

        const r = await db.query(
            `SELECT
                p.parcela_id AS id,
                p.nombre,
                p.ubicacion_nombre,
                p.tipo_cultivo_id AS "cropType",
                p.area_hectareas AS area,
                p.fecha_creacion AS "createdAt",
                p.activa,
                (p.usuario_id = $1) AS propia,
                p.fecha_baja AS "fechaBaja",
                p.motivo_baja AS "motivoBaja",
                p.observacion_baja AS "observacionBaja",
                ub.nombre_completo AS "bajaPor",
                u.nombre_completo AS responsable,
                u.rol AS "rolResponsable",
                COUNT(a.actividad_id) FILTER (
                    WHERE a.anulada = false AND a.tipo NOT IN ('registro_parcela', 'edicion_parcela', 'baja_parcela')
                ) AS labores,
                to_char(MAX(a.fecha) FILTER (
                    WHERE a.anulada = false AND a.tipo NOT IN ('registro_parcela', 'edicion_parcela', 'baja_parcela')
                ), 'YYYY-MM-DD') AS "ultimaLabor"
             FROM parcelas p
             JOIN usuarios u ON u.usuario_id = p.usuario_id
             LEFT JOIN usuarios ub ON ub.usuario_id = p.baja_por
             LEFT JOIN actividades_parcela a ON a.parcela_id = p.parcela_id
             ${where}
             GROUP BY p.parcela_id, u.nombre_completo, u.rol, ub.nombre_completo
             ORDER BY p.activa DESC, COALESCE(p.fecha_baja, p.fecha_creacion) DESC`,
            params
        );

        res.json({
            status: 'success',
            alcance: esAdmin ? 'institucion' : 'propias',
            data: r.rows.map((p) => ({
                ...p,
                area: Number(p.area),
                labores: Number(p.labores),
                motivoBajaTexto: p.motivoBaja ? MOTIVOS_BAJA[p.motivoBaja] : null,
            })),
        });
    } catch (error) {
        console.error('Error al cargar el historial de parcelas:', error);
        res.status(500).json({ status: 'error', message: 'Error al cargar el historial de parcelas.' });
    }
};

module.exports = { historialParcelas };
