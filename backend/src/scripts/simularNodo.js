/**
 * Imita a un nodo ESP32: envía lecturas a POST /api/telemetria con el mismo paquete que el firmware.
 * Sirve para probar la ingesta sin hardware.
 *
 * Uso (desde backend/):
 *   npm run nodo:simular -- <url_api> <mac> <clave> [segundos_entre_lecturas]
 *   npm run nodo:simular -- https://agro-control-api.onrender.com/api AA:BB:CC:DD:EE:FF <clave> 60
 */
const [url, mac, token, segundos = '60'] = process.argv.slice(2);
if (!url || !mac || !token) {
    console.error('Uso: npm run nodo:simular -- <url_api> <mac> <clave> [segundos_entre_lecturas]');
    process.exit(1);
}

const variar = (base, rango, decimales = 1) => Number((base + (Math.random() - 0.5) * rango).toFixed(decimales));

const enviar = async () => {
    const paquete = {
        mac,
        timestamp: new Date().toISOString(),
        humedad: variar(52, 8), temperatura: variar(25, 3), conductividad: Math.round(variar(420, 80)),
        ph: variar(6.3, 0.4), nitrogeno: variar(95, 20), fosforo: variar(55, 10), potasio: variar(140, 30),
    };
    try {
        const r = await fetch(`${url.replace(/\/$/, '')}/telemetria`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Dispositivo-Token': token },
            body: JSON.stringify(paquete),
        });
        const cuerpo = await r.json().catch(() => ({}));
        console.log(`${new Date().toLocaleTimeString()}  HTTP ${r.status}  ${cuerpo.message || ''}  pH ${paquete.ph}  N ${paquete.nitrogeno}`);
    } catch (err) {
        console.error(`${new Date().toLocaleTimeString()}  Sin conexión con la API: ${err.message}`);
    }
};

enviar();
setInterval(enviar, Math.max(5, Number(segundos)) * 1000);
