/**
 * Nivel de interpretación del motor de reglas (sección 3.3.3): clasifica pH, fósforo y potasio
 * con la tabla del laboratorio de suelos del CIAT (Cuadros 3.2 y 3.3) y arma el diagnóstico
 * de una lectura para el certificado de suelo. Funciones puras, sin acceso a la base de datos.
 */

// Cuadro 3.2: reacción del suelo según el pH (límite superior de cada clase; el sensor entrega un decimal)
const CLASES_PH = [
    { hasta: 4.5, clase: 'Muy fuertemente ácido', abierto: true },
    { hasta: 5.2, clase: 'Fuertemente ácido' },
    { hasta: 5.9, clase: 'Moderadamente ácido' },
    { hasta: 6.5, clase: 'Suavemente ácido' },
    { hasta: 7.0, clase: 'Neutro' },
    { hasta: 7.5, clase: 'Suavemente alcalino' },
    { hasta: 8.0, clase: 'Moderadamente alcalino' },
];

// K: el laboratorio lo expresa en cmolc/kg y el sensor en mg/kg (1 cmolc/kg de K = 391 mg/kg)
const MG_POR_CMOLC_K = 391;

const clasificarPh = (ph) => {
    const v = Math.round(Number(ph) * 10) / 10;
    for (const c of CLASES_PH) {
        if (c.abierto ? v < c.hasta : v <= c.hasta) return c.clase;
    }
    return 'Fuertemente alcalino';
};

// Cuadro 3.3: P en mg/kg (bajo < 6, medio 6 – 15, alto > 15)
const clasificarFosforo = (p) => (Number(p) < 6 ? 'Bajo' : Number(p) <= 15 ? 'Medio' : 'Alto');

// Cuadro 3.3: K en cmolc/kg (bajo < 0,21, medio 0,21 – 0,65, alto > 0,65)
const clasificarPotasio = (kMgKg) => {
    const cmolc = Number(kMgKg) / MG_POR_CMOLC_K;
    return cmolc < 0.21 ? 'Bajo' : cmolc <= 0.65 ? 'Medio' : 'Alto';
};

// Cuadro 3.26: umbrales operativos del semáforo
const UMBRALES = {
    humedad: { optimo: [40, 70], alerta: [30, 80] },
    temperatura: { optimo: [18, 28], alerta: [12, 35] },
    ph: { optimo: [6.0, 7.5], alerta: [5.5, 8.0] },
    nitrogeno: { optimo: [80, 150], alerta: [50, 180] },
};

const estadoOperativo = (variable, valor) => {
    const u = UMBRALES[variable];
    if (valor < u.alerta[0] || valor > u.alerta[1]) return 'critico';
    if (valor < u.optimo[0] || valor > u.optimo[1]) return 'alerta';
    return 'optimo';
};

/**
 * lectura: { humedad, temperatura, conductividad, ph, nitrogeno, fosforo, potasio } (valores del sensor)
 * Devuelve la categoría global, el diagnóstico y las recomendaciones de la base de reglas (Cuadro 3.27).
 */
const diagnosticarLectura = (lectura) => {
    const l = Object.fromEntries(Object.entries(lectura).map(([k, v]) => [k, Number(v)]));
    const estados = Object.fromEntries(Object.keys(UMBRALES).map((k) => [k, estadoOperativo(k, l[k])]));
    const interpretacion = {
        ph: clasificarPh(l.ph),
        fosforo: clasificarFosforo(l.fosforo),
        potasio: clasificarPotasio(l.potasio),
    };

    const hallazgos = [];
    const recomendaciones = [];
    if (l.ph < 6.0) {
        hallazgos.push(`suelo ${interpretacion.ph.toLowerCase()} (pH ${l.ph.toFixed(1)})`);
        recomendaciones.push({ regla: 'R-01', texto: 'Encalado agrícola (carbonato de calcio) para elevar el pH y mejorar la disponibilidad de fósforo.' });
    }
    if (l.nitrogeno < 80) {
        hallazgos.push(`nitrógeno bajo (${l.nitrogeno.toFixed(0)} mg/kg)`);
        recomendaciones.push({ regla: 'R-02', texto: 'Fertilización nitrogenada moderada (urea o sulfato de amonio) antes de la siguiente fase activa.' });
    }
    if (l.humedad < 40) {
        hallazgos.push(`humedad baja (${l.humedad.toFixed(1)} %)`);
        recomendaciones.push({ regla: 'R-03', texto: 'Riego suplementario prioritario o cobertura con rastrojo.' });
    }
    const bajos = [interpretacion.fosforo === 'Bajo' && 'fósforo', interpretacion.potasio === 'Bajo' && 'potasio'].filter(Boolean);
    if (bajos.length) {
        hallazgos.push(`${bajos.join(' y ')} en nivel bajo según la tabla del CIAT`);
        recomendaciones.push({ regla: 'R-04', texto: `Fertilización ${bajos.map((b) => (b === 'fósforo' ? 'fosfatada' : 'potásica')).join(' y ')} y análisis de laboratorio confirmatorio.` });
    }
    if (recomendaciones.length === 0) {
        recomendaciones.push({ regla: 'R-05', texto: 'Mantener el manejo actual; monitoreo estable.' });
    }

    const valores = Object.values(estados);
    const calificacion = valores.includes('critico') ? 'Crítico'
        : valores.includes('alerta') || bajos.length ? 'Requiere atención' : 'Óptimo';
    const diagnostico = hallazgos.length
        ? `Se identifica ${hallazgos.join('; ')}.`
        : 'Las variables medidas se encuentran dentro de los rangos óptimos y los niveles de fósforo y potasio no son limitantes.';

    return { estados, interpretacion, calificacion, diagnostico, recomendaciones };
};

module.exports = { clasificarPh, clasificarFosforo, clasificarPotasio, estadoOperativo, diagnosticarLectura, MG_POR_CMOLC_K };
