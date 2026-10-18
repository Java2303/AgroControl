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

module.exports = { TIPOS_ACTIVIDAD, UNIDADES, validarActividad, hoyEnBolivia };
