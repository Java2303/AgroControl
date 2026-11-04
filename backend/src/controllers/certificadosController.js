const crypto = require('crypto');
const db = require('../config/db');
const { diagnosticarLectura } = require('../services/interpretacionCiat');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Sin 0/O ni 1/I/L para que el código se pueda dictar y transcribir sin errores
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODIGO = /^AC-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

/** AC-XXXX-XXXX-XXXX: 12 caracteres aleatorios (~59 bits), imposible de adivinar por prueba y error. */
const generarCodigo = () => {
    const b = crypto.randomBytes(12);
    const c = Array.from(b, (x) => ALFABETO[x % ALFABETO.length]).join('');
    return `AC-${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
};

const respuesta = (fila) => ({
    codigo: fila.codigo_verificacion,
    fechaEmision: fila.fecha_generacion,
    emitidoPor: fila.emitido_por_nombre,
    ...fila.detalle,
});

/**
 * POST /api/parcelas/:id/certificado — emite el certificado de suelo del lote de una parcela propia
 * a partir de su última lectura (RF-18, RN-14). Cada emisión queda registrada con su código.
 */
const emitirCertificado = async (req, res) => {
    const parcelaId = req.params.id;
    if (!UUID.test(parcelaId)) {
        return res.status(404).json({ status: 'error', message: 'Parcela no encontrada o sin permisos.' });
    }
    try {
        const r = await db.query(
            `SELECT p.nombre, p.ubicacion_nombre, p.area_hectareas, tc.nombre AS cultivo,
                    l.lote_id, l.superficie_ha, l.dispositivo_mac, l.dispositivo_token_hash IS NOT NULL AS nodo_real,
                    ls.lectura_id, ls.fecha_captura, ls.emulada, ls.humedad_suelo, ls.temperatura_suelo, ls.conductividad_electrica,
                    ls.ph, ls.nitrogeno, ls.fosforo, ls.potasio,
                    co.cantidad AS rendimiento, co.unidad AS rendimiento_unidad, co.fecha AS fecha_cosecha
             FROM parcelas p
             LEFT JOIN tipos_cultivo tc ON tc.tipo_cultivo_id = p.tipo_cultivo_id
             JOIN LATERAL (SELECT * FROM lotes WHERE parcela_id = p.parcela_id ORDER BY fecha_creacion LIMIT 1) l ON true
             LEFT JOIN LATERAL (
                 SELECT * FROM lecturas_suelo WHERE lote_id = l.lote_id ORDER BY fecha_captura DESC LIMIT 1
             ) ls ON true
             LEFT JOIN LATERAL (
                 SELECT cantidad, unidad, fecha FROM actividades_parcela
                 WHERE parcela_id = p.parcela_id AND tipo = 'cosecha' AND NOT anulada AND cantidad IS NOT NULL
                 ORDER BY fecha DESC LIMIT 1
             ) co ON true
             WHERE p.parcela_id = $1 AND p.usuario_id = $2 AND p.activa`,
            [parcelaId, req.usuario.id]
        );
        if (r.rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Parcela no encontrada, sin permisos o dada de baja.' });
        }
        const f = r.rows[0];
        if (!f.lectura_id) {
            return res.status(409).json({ status: 'error', message: 'La parcela todavía no tiene lecturas: no se puede emitir el certificado.' });
        }

        const lectura = {
            humedad: Number(f.humedad_suelo), temperatura: Number(f.temperatura_suelo), conductividad: Number(f.conductividad_electrica),
            ph: Number(f.ph), nitrogeno: Number(f.nitrogeno), fosforo: Number(f.fosforo), potasio: Number(f.potasio),
        };
        const d = diagnosticarLectura(lectura);
        const detalle = {
            parcela: { nombre: f.nombre, ubicacion: f.ubicacion_nombre, areaHa: Number(f.area_hectareas), cultivo: f.cultivo },
            lote: { codigo: `L-${f.lote_id.slice(0, 8).toUpperCase()}`, superficieHa: Number(f.superficie_ha) },
            rendimiento: f.rendimiento != null ? { cantidad: Number(f.rendimiento), unidad: f.rendimiento_unidad, fecha: f.fecha_cosecha } : null,
            lectura: { fecha: f.fecha_captura, ...lectura },
            // RN-10: se declara el origen del dato; una lectura del simulador no se presenta como medición
            origen: !f.nodo_real ? 'Lectura simulada (la parcela no tiene un nodo IoT vinculado)'
                : f.emulada ? `Nodo IoT ${f.dispositivo_mac} con valores emulados (sensor 7 en 1 no conectado)`
                : `Nodo IoT ${f.dispositivo_mac}`,
            interpretacion: d.interpretacion,
            estados: d.estados,
            calificacion: d.calificacion,
            diagnostico: d.diagnostico,
            recomendaciones: d.recomendaciones,
        };

        let fila;
        for (let intento = 0; intento < 3 && !fila; intento++) {
            try {
                const ins = await db.query(
                    `INSERT INTO reportes (lote_id, lectura_id, calificacion_global, recomendacion, diagnostico, detalle, emitido_por, codigo_verificacion)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     RETURNING codigo_verificacion, fecha_generacion, detalle,
                               (SELECT nombre_completo FROM usuarios WHERE usuario_id = $7) AS emitido_por_nombre`,
                    [f.lote_id, f.lectura_id, d.calificacion, d.recomendaciones.map((x) => x.texto).join(' '), d.diagnostico,
                        JSON.stringify(detalle), req.usuario.id, generarCodigo()]
                );
                fila = ins.rows[0];
            } catch (err) {
                if (err.code !== '23505') throw err; // código repetido (improbable): se genera otro
            }
        }
        res.status(201).json({ status: 'success', message: 'Certificado emitido.', data: respuesta(fila) });
    } catch (error) {
        console.error('Error al emitir el certificado:', error);
        res.status(500).json({ status: 'error', message: 'Error en el servidor al emitir el certificado.' });
    }
};

/**
 * GET /api/certificados/:codigo — verificación pública: cualquiera con el código comprueba que el
 * certificado existe y ve su contenido original. No expone correos, geometría ni otras parcelas.
 */
const verificarCertificado = async (req, res) => {
    const codigo = String(req.params.codigo || '').trim().toUpperCase();
    if (!CODIGO.test(codigo)) {
        return res.status(404).json({ status: 'error', message: 'No existe un certificado con ese código.' });
    }
    try {
        const r = await db.query(
            `SELECT r.codigo_verificacion, r.fecha_generacion, r.detalle, u.nombre_completo AS emitido_por_nombre
             FROM reportes r LEFT JOIN usuarios u ON u.usuario_id = r.emitido_por
             WHERE r.codigo_verificacion = $1 AND r.detalle IS NOT NULL`,
            [codigo]
        );
        if (r.rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No existe un certificado con ese código.' });
        }
        res.status(200).json({ status: 'success', data: respuesta(r.rows[0]) });
    } catch (error) {
        console.error('Error al verificar el certificado:', error);
        res.status(500).json({ status: 'error', message: 'Error en el servidor al verificar el certificado.' });
    }
};

module.exports = { emitirCertificado, verificarCertificado, generarCodigo, CODIGO };
