const db = require('../config/db');
const { validarLimiteHectareas } = require('../utils/validators');
const { hoyEnBolivia, cambiosParcela, validarBaja, MOTIVOS_BAJA } = require('../utils/actividades');

// Cobertura máxima de un nodo sensor (restricción check_cobertura_sensor de la tabla lotes)
const SUPERFICIE_MAX_LOTE = 15;

/**
 * 🗺️ Registra una nueva parcela desde el mapa satelital
 */
const crearParcela = async (req, res) => {
    try {
        const usuario_id = req.usuario && req.usuario.id;
        const { nombre, ubicacion_nombre, tipo_cultivo_id, area_hectareas, geometria } = req.body;

        if (!usuario_id) {
            return res.status(401).json({
                status: 'error',
                message: 'Usuario no autenticado o sesión expirada.'
            });
        }

        if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 100 ||
            typeof ubicacion_nombre !== 'string' || !ubicacion_nombre.trim() || ubicacion_nombre.length > 150 ||
            !Number.isInteger(parseInt(tipo_cultivo_id, 10)) || !geometria) {
            return res.status(400).json({
                status: 'error',
                message: 'Faltan campos obligatorios para registrar la parcela.'
            });
        }

        // 1. ⚙️ Validar regla de negocio del CIAT (Máximo 50 hectáreas)
        if (!validarLimiteHectareas(parseFloat(area_hectareas))) {
            return res.status(400).json({
                status: 'error',
                message: 'Regla del CIAT: La superficie de la parcela debe ser mayor a 0 y no puede exceder las 50 hectáreas.'
            });
        }

        // 2. 🗄️ Insertar en PostgreSQL transformando el GeoJSON a geometría de PostGIS con SRID 4326
        const queryText = `
            INSERT INTO parcelas (usuario_id, nombre, ubicacion_nombre, tipo_cultivo_id, area_hectareas, geom)
            VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_GeomFromGeoJSON($6), 4326))
            RETURNING parcela_id, nombre, area_hectareas, tipo_cultivo_id;
        `;

        // Convertimos el objeto de geometría del mapa a texto para ST_GeomFromGeoJSON
        const geometriaStr = typeof geometria === 'string' ? geometria : JSON.stringify(geometria);

        const values = [
            usuario_id, 
            nombre, 
            ubicacion_nombre, 
            parseInt(tipo_cultivo_id, 10), 
            parseFloat(area_hectareas), 
            geometriaStr
        ];

        // La parcela y su evento de registro en la bitácora se guardan juntos (transacción)
        const client = await db.pool.connect();
        let parcelaCreada;
        try {
            await client.query('BEGIN');
            const result = await client.query(queryText, values);
            parcelaCreada = result.rows[0];
            const cultivo = await client.query('SELECT nombre FROM tipos_cultivo WHERE tipo_cultivo_id = $1', [parcelaCreada.tipo_cultivo_id]);
            await client.query(
                `INSERT INTO actividades_parcela (parcela_id, usuario_id, tipo, fecha, descripcion, detalle)
                 VALUES ($1, $2, 'registro_parcela', $3, $4, $5)`,
                [parcelaCreada.parcela_id, usuario_id, hoyEnBolivia(), 'Parcela registrada en el sistema desde el mapa satelital.',
                    JSON.stringify({
                        nombre: parcelaCreada.nombre,
                        cultivo: cultivo.rows[0]?.nombre ?? null,
                        tipo_cultivo_id: parcelaCreada.tipo_cultivo_id,
                        area_ha: Number(parcelaCreada.area_hectareas),
                        ubicacion: ubicacion_nombre.trim(),
                        lote_ha: Math.min(Number(parcelaCreada.area_hectareas), SUPERFICIE_MAX_LOTE),
                    })]
            );
            await client.query('COMMIT');
        } catch (errTx) {
            await client.query('ROLLBACK');
            throw errTx;
        } finally {
            client.release();
        }

        // 3. Crear automáticamente un lote principal para sensores IoT
        try {
            const macRandom = `00:1A:C2:${Math.floor(Math.random() * 90 + 10)}:${Math.floor(Math.random() * 90 + 10)}:${Math.floor(Math.random() * 90 + 10)}`;
            await db.query(
                `INSERT INTO lotes (parcela_id, nombre_lote, descripcion, superficie_ha, dispositivo_mac)
                 VALUES ($1, $2, $3, $4, $5)`,
                [parcelaCreada.parcela_id, `Lote Principal - ${nombre}`, `Lote de monitoreo para ${nombre}`, Math.min(parseFloat(area_hectareas), SUPERFICIE_MAX_LOTE), macRandom]
            );
        } catch (loteErr) {
            console.error('Aviso: no se pudo crear lote automático:', loteErr);
        }

        // 4. 🎉 Respuesta exitosa
        res.status(201).json({
            status: 'success',
            message: 'Parcela registrada exitosamente para trazabilidad.',
            data: parcelaCreada
        });

    } catch (error) {
        console.error('Error al registrar la parcela:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al procesar el trazado geográfico.'
        });
    }
};
const obtenerParcelas = async (req, res) => {
    try {
        // Extraemos el ID del usuario que el authMiddleware inyectó en la petición
        const usuario_id = req.usuario.id;

        const queryText = `
            SELECT 
                parcela_id AS id, 
                nombre, 
                ubicacion_nombre, 
                tipo_cultivo_id AS "cropType", 
                area_hectareas AS area,
                fecha_creacion AS "createdAt",
                ST_AsGeoJSON(geom) AS geom
            FROM parcelas
            WHERE usuario_id = $1 AND activa
            ORDER BY nombre ASC;
        `;

        const result = await db.query(queryText, [usuario_id]);

        res.status(200).json({
            status: 'success',
            data: result.rows
        });

    } catch (error) {
        console.error('Error al obtener las parcelas:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al cargar la lista de parcelas.'
        });
    }
};
const actualizarParcela = async (req, res) => {
    try {
        const parcela_id = req.params.id;
        const usuario_id = req.usuario.id;
        const { name, cropType } = req.body || {};

        if (typeof name !== 'string' || !name.trim() || name.length > 100) {
            return res.status(400).json({ status: 'error', message: 'El nombre de la parcela no es válido.' });
        }

        // Convertir cropType a número de ID si viene como string/id
        let tipo_cultivo_id = 1;
        if (typeof cropType === 'number') {
            tipo_cultivo_id = cropType;
        } else if (!isNaN(parseInt(cropType, 10))) {
            tipo_cultivo_id = parseInt(cropType, 10);
        } else if (cropType === 'soya') tipo_cultivo_id = 1;
        else if (cropType === 'maiz') tipo_cultivo_id = 2;
        else if (cropType === 'trigo') tipo_cultivo_id = 3;
        else if (cropType === 'arroz') tipo_cultivo_id = 4;
        else if (cropType === 'girasol') tipo_cultivo_id = 5;
        else if (cropType === 'sorgo') tipo_cultivo_id = 6;
        else if (cropType === 'caña' || cropType === 'cana') tipo_cultivo_id = 7;
        else if (cropType === 'sesamo') tipo_cultivo_id = 8;
        else if (cropType === 'frejol') tipo_cultivo_id = 9;
        else if (cropType === 'yuca') tipo_cultivo_id = 10;
        else if (cropType === 'pastos') tipo_cultivo_id = 11;
        else if (cropType === 'chia') tipo_cultivo_id = 12;
        else if (cropType === 'citricos') tipo_cultivo_id = 13;
        else if (cropType === 'hortalizas') tipo_cultivo_id = 14;

        // Se lee el estado anterior, se actualiza y se registran los cambios en la bitácora en una sola transacción
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const previo = await client.query(
                `SELECT p.nombre, tc.nombre AS cultivo
                 FROM parcelas p LEFT JOIN tipos_cultivo tc ON tc.tipo_cultivo_id = p.tipo_cultivo_id
                 WHERE p.parcela_id = $1 AND p.usuario_id = $2 AND p.activa
                 FOR UPDATE OF p`,
                [parcela_id, usuario_id]
            );
            if (previo.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ status: 'error', message: 'Parcela no encontrada o sin permisos.' });
            }

            const result = await client.query(
                `UPDATE parcelas SET nombre = $1, tipo_cultivo_id = $2
                 WHERE parcela_id = $3 AND usuario_id = $4
                 RETURNING parcela_id, nombre`,
                [name.trim(), tipo_cultivo_id, parcela_id, usuario_id]
            );
            const cultivoNuevo = await client.query('SELECT nombre FROM tipos_cultivo WHERE tipo_cultivo_id = $1', [tipo_cultivo_id]);

            const cambios = cambiosParcela(previo.rows[0], { nombre: name.trim(), cultivo: cultivoNuevo.rows[0]?.nombre ?? null });
            if (cambios.length > 0) {
                await client.query(
                    `INSERT INTO actividades_parcela (parcela_id, usuario_id, tipo, fecha, descripcion, detalle)
                     VALUES ($1, $2, 'edicion_parcela', $3, $4, $5)`,
                    [parcela_id, usuario_id, hoyEnBolivia(), `Se modificó: ${cambios.map((c) => c.etiqueta.toLowerCase()).join(' y ')}.`, JSON.stringify({ cambios })]
                );
            }
            await client.query('COMMIT');

            res.status(200).json({ status: 'success', message: 'Parcela actualizada.', data: { ...result.rows[0], cambios: cambios.length } });
        } catch (errTx) {
            await client.query('ROLLBACK');
            throw errTx;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error al actualizar parcela:', error);
        res.status(500).json({ status: 'error', message: 'Error en el servidor al actualizar.' });
    }
};

/**
 * PATCH /api/parcelas/:id/baja — da de baja una parcela (baja lógica).
 * La parcela deja de aparecer en el mapa, el tablero y el monitoreo, pero se conservan su bitácora,
 * lotes y lecturas para el historial; en la bitácora queda el evento «Parcela dada de baja».
 */
const darDeBajaParcela = async (req, res) => {
    const parcela_id = req.params.id;
    const usuario_id = req.usuario.id;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parcela_id)) {
        return res.status(404).json({ status: 'error', message: 'Parcela no encontrada, sin permisos o ya dada de baja.' });
    }
    const { errores, datos } = validarBaja(req.body);
    if (errores.length > 0) {
        return res.status(400).json({ status: 'error', message: errores[0], errores });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const r = await client.query(
            `UPDATE parcelas
             SET activa = false, fecha_baja = CURRENT_TIMESTAMP, motivo_baja = $1, observacion_baja = $2, baja_por = $3
             WHERE parcela_id = $4 AND usuario_id = $3 AND activa
             RETURNING parcela_id, nombre, area_hectareas, ubicacion_nombre,
                       (SELECT nombre FROM tipos_cultivo t WHERE t.tipo_cultivo_id = parcelas.tipo_cultivo_id) AS cultivo`,
            [datos.motivo, datos.observacion, usuario_id, parcela_id]
        );
        if (r.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ status: 'error', message: 'Parcela no encontrada, sin permisos o ya dada de baja.' });
        }
        const p = r.rows[0];
        await client.query(
            `INSERT INTO actividades_parcela (parcela_id, usuario_id, tipo, fecha, descripcion, detalle)
             VALUES ($1, $2, 'baja_parcela', $3, $4, $5)`,
            [parcela_id, usuario_id, hoyEnBolivia(), datos.observacion,
                JSON.stringify({
                    motivo: datos.motivo,
                    motivo_texto: MOTIVOS_BAJA[datos.motivo],
                    nombre: p.nombre,
                    cultivo: p.cultivo,
                    area_ha: Number(p.area_hectareas),
                    ubicacion: p.ubicacion_nombre,
                })]
        );
        await client.query('COMMIT');
        res.status(200).json({ status: 'success', message: 'Parcela dada de baja. Su historial se conserva.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al dar de baja la parcela:', error);
        res.status(500).json({ status: 'error', message: 'Error en el servidor al dar de baja la parcela.' });
    } finally {
        client.release();
    }
};

module.exports = {
    crearParcela,
    obtenerParcelas,
    actualizarParcela,
    darDeBajaParcela
};