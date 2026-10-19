/**
 * Reglas de la bitácora de labores agrícolas.
 * Los tipos coinciden con la restricción actividad_tipo_valido de la base de datos
 * y con lib/actividades.ts del frontend.
 */
const TIPOS_ACTIVIDAD = ['siembra', 'fertilizacion', 'encalado', 'riego', 'fitosanitario', 'muestreo', 'cosecha', 'otra'];
const UNIDADES = ['kg/ha', 'L/ha', 't/ha', 'qq/ha', 'mm', 'kg', 'L', 't', 'qq', 'unidades'];

const FECHA_MINIMA = '2000-01-01';
const esFechaISO = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/**
 * Valida los datos de una labor. Devuelve { errores, datos } con los datos ya normalizados.
 * @param {object} entrada  cuerpo de la solicitud
 * @param {string} hoyISO   fecha actual (YYYY-MM-DD) en la zona del usuario; se inyecta para poder probarla
 */
function validarActividad(entrada, hoyISO) {
    const errores = [];
    const e = entrada || {};

    if (!TIPOS_ACTIVIDAD.includes(e.tipo)) errores.push('Tipo de labor no válido.');

    if (!esFechaISO(e.fecha)) {
        errores.push('La fecha debe tener el formato AAAA-MM-DD.');
    } else if (e.fecha < FECHA_MINIMA) {
        errores.push('La fecha no puede ser anterior al año 2000.');
    } else if (e.fecha > hoyISO) {
        errores.push('No se pueden registrar labores con fecha futura.');
    }

    const texto = (v, max, campo) => {
        if (v === undefined || v === null || v === '') return null;
        if (typeof v !== 'string' || v.trim().length > max) {
            errores.push(`${campo} admite como máximo ${max} caracteres.`);
            return null;
        }
        return v.trim() || null;
    };
    const producto = texto(e.producto, 120, 'El producto');
    const descripcion = texto(e.descripcion, 500, 'La descripción');

    let cantidad = null;
    if (e.cantidad !== undefined && e.cantidad !== null && e.cantidad !== '') {
        cantidad = Number(e.cantidad);
        if (!Number.isFinite(cantidad) || cantidad < 0 || cantidad > 1000000) {
            errores.push('La cantidad debe ser un número entre 0 y 1 000 000.');
            cantidad = null;
        }
    }

    let unidad = null;
    if (e.unidad !== undefined && e.unidad !== null && e.unidad !== '') {
        if (!UNIDADES.includes(e.unidad)) errores.push('Unidad no válida.');
        else unidad = e.unidad;
    }
    if (cantidad !== null && !unidad) errores.push('Indique la unidad de la cantidad.');
    if (unidad && cantidad === null) errores.push('Indique la cantidad correspondiente a la unidad.');

    if (e.tipo === 'otra' && !descripcion) errores.push('Describa la labor cuando el tipo es «Otra».');

    return {
        errores,
        datos: { tipo: e.tipo, fecha: e.fecha, producto, cantidad, unidad, descripcion },
    };
}

/** Fecha de hoy en Bolivia (UTC-4), para que una labor registrada de noche no cuente como futura. */
function hoyEnBolivia(ahora = new Date()) {
    return new Date(ahora.getTime() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Eventos que el sistema registra solo (no se crean ni se anulan desde la API de labores). */
const EVENTOS_SISTEMA = ['registro_parcela', 'edicion_parcela', 'baja_parcela'];

/** Motivos de baja de una parcela (restricción parcela_motivo_baja_valido de la base de datos). */
const MOTIVOS_BAJA = {
    terreno_cerrado: 'Terreno cerrado',
    fin_campania: 'Fin del ensayo o campaña',
    venta_cesion: 'Venta o cesión del terreno',
    error_registro: 'Registro erróneo o duplicado',
    otro: 'Otro motivo',
};

/** Valida la solicitud de baja: motivo del catálogo y observación (obligatoria si el motivo es «otro»). */
function validarBaja(entrada) {
    const e = entrada || {};
    const errores = [];
    if (!Object.prototype.hasOwnProperty.call(MOTIVOS_BAJA, e.motivo)) errores.push('Seleccione un motivo de baja válido.');
    const observacion = typeof e.observacion === 'string' ? e.observacion.trim() : '';
    if (observacion.length > 500) errores.push('La observación admite como máximo 500 caracteres.');
    if (e.motivo === 'otro' && observacion.length < 5) errores.push('Describa el motivo de la baja.');
    return { errores, datos: { motivo: e.motivo, observacion: observacion || null } };
}

const CAMPOS_EDITABLES = {
    nombre: 'Nombre',
    cultivo: 'Cultivo',
};

/**
 * Compara los datos de una parcela antes y después de una edición.
 * Devuelve la lista de cambios [{ campo, etiqueta, antes, despues }] (vacía si no cambió nada).
 */
function cambiosParcela(antes, despues) {
    return Object.keys(CAMPOS_EDITABLES)
        .filter((campo) => (antes[campo] ?? null) !== (despues[campo] ?? null))
        .map((campo) => ({ campo, etiqueta: CAMPOS_EDITABLES[campo], antes: antes[campo] ?? null, despues: despues[campo] ?? null }));
}

module.exports = { TIPOS_ACTIVIDAD, UNIDADES, EVENTOS_SISTEMA, MOTIVOS_BAJA, validarActividad, validarBaja, hoyEnBolivia, cambiosParcela };
