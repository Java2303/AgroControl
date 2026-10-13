/**
 * Limitador de solicitudes en memoria por IP (ventana fija).
 * Protege login y registro contra fuerza bruta y enumeracion de cuentas.
 */
const limitarIntentos = ({ ventanaMs = 15 * 60 * 1000, maximo = 10 } = {}) => {
    const intentos = new Map();

    // Limpieza periodica para no acumular IPs antiguas
    const limpieza = setInterval(() => {
        const ahora = Date.now();
        for (const [ip, registro] of intentos) {
            if (registro.reinicio <= ahora) intentos.delete(ip);
        }
    }, ventanaMs);
    limpieza.unref();

    return (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress;
        const ahora = Date.now();
        let registro = intentos.get(ip);

        if (!registro || registro.reinicio <= ahora) {
            registro = { total: 0, reinicio: ahora + ventanaMs };
            intentos.set(ip, registro);
        }

        registro.total += 1;

        if (registro.total > maximo) {
            res.set('Retry-After', String(Math.ceil((registro.reinicio - ahora) / 1000)));
            return res.status(429).json({
                message: "Demasiados intentos. Intente nuevamente mas tarde."
            });
        }
        next();
    };
};

module.exports = { limitarIntentos };
