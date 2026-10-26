/**
 * Validación del paquete que envía el nodo ESP32 a POST /api/telemetria (Cuadro 3.30 de la tesis)
 * y utilidades de la clave del dispositivo.
 */
const crypto = require('crypto');

// Rangos físicos posibles (RN-15) según la hoja de datos del sensor 7 en 1 RS485.
// Una lectura fuera de rango indica un sensor dañado o mal cableado y no se persiste.
const RANGOS = {
    humedad: { min: 0, max: 100, columna: 'humedad_suelo', nombre: 'La humedad' },
    temperatura: { min: -40, max: 80, columna: 'temperatura_suelo', nombre: 'La temperatura' },
    conductividad: { min: 0, max: 20000, columna: 'conductividad_electrica', nombre: 'La conductividad eléctrica' },
    ph: { min: 0, max: 14, columna: 'ph', nombre: 'El pH' },
    nitrogeno: { min: 0, max: 1999, columna: 'nitrogeno', nombre: 'El nitrógeno' },
    fosforo: { min: 0, max: 1999, columna: 'fosforo', nombre: 'El fósforo' },
    potasio: { min: 0, max: 1999, columna: 'potasio', nombre: 'El potasio' },
};

// Tolerancia del reloj del nodo: el ESP32 no tiene reloj propio y lo sincroniza por NTP
const ADELANTO_MAX_MS = 5 * 60 * 1000;
const ANTIGUEDAD_MAX_MS = 24 * 60 * 60 * 1000;

/** «aa:bb:cc:dd:ee:ff» o «AA-BB-…» → «AA:BB:CC:DD:EE:FF»; null si no es una MAC. */
const normalizarMac = (valor) => {
    if (typeof valor !== 'string') return null;
    const mac = valor.trim().toUpperCase().replace(/-/g, ':');
    return /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac) ? mac : null;
};

const generarToken = () => crypto.randomBytes(24).toString('base64url');
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

/** Compara la clave recibida con el hash guardado sin filtrar información por tiempo de respuesta. */
const tokenValido = (token, hashGuardado) => {
    if (typeof token !== 'string' || !token || typeof hashGuardado !== 'string' || hashGuardado.length !== 64) return false;
    return crypto.timingSafeEqual(Buffer.from(hashToken(token), 'hex'), Buffer.from(hashGuardado, 'hex'));
};

/**
 * Devuelve { errores, datos }. datos = { mac, fecha (Date), valores: { columna: número } }.
 * Si el nodo no envía la hora, o la envía fuera de tolerancia, se usa la hora del servidor.
 */
const validarTelemetria = (body, ahora = Date.now()) => {
    const errores = [];
    const b = body && typeof body === 'object' ? body : {};
    const mac = normalizarMac(b.mac);
    if (!mac) errores.push('La dirección MAC del dispositivo es obligatoria y debe tener el formato AA:BB:CC:DD:EE:FF.');

    const valores = {};
    for (const [campo, r] of Object.entries(RANGOS)) {
        const v = typeof b[campo] === 'string' && b[campo].trim() !== '' ? Number(b[campo]) : b[campo];
        if (typeof v !== 'number' || !Number.isFinite(v)) {
            errores.push(`${r.nombre} es obligatorio y debe ser numérico.`);
        } else if (v < r.min || v > r.max) {
            errores.push(`${r.nombre} (${v}) está fuera del rango físico del sensor (${r.min} a ${r.max}).`);
        } else {
            valores[r.columna] = r.columna === 'conductividad_electrica' ? Math.round(v) : Math.round(v * 100) / 100;
        }
    }

    let fecha = new Date(ahora);
    if (b.timestamp !== undefined && b.timestamp !== null && b.timestamp !== '') {
        const t = Date.parse(b.timestamp);
        if (Number.isFinite(t) && t <= ahora + ADELANTO_MAX_MS && t >= ahora - ANTIGUEDAD_MAX_MS) fecha = new Date(t);
    }

    return { errores, datos: errores.length ? null : { mac, fecha, valores } };
};

module.exports = { RANGOS, normalizarMac, generarToken, hashToken, tokenValido, validarTelemetria };
