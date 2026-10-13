const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const authHeader = req.header('Authorization') || '';
    const [esquema, token] = authHeader.split(' ');

    if (esquema !== 'Bearer' || !token) {
        return res.status(401).json({
            message: "Acceso denegado. No se proporciono un token de seguridad."
        });
    }

    try {
        // Solo se aceptan tokens firmados con el secreto del servidor (HS256)
        const verificado = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        if (!verificado || !verificado.id) {
            return res.status(401).json({ message: "Token invalido." });
        }

        req.usuario = { id: verificado.id, rol: verificado.rol };
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Token invalido o expirado. Por favor, inicie sesion nuevamente."
        });
    }
};

/**
 * Restringe una ruta a los roles indicados (Cuadro 3.36 - Matriz de permisos por rol).
 * Debe usarse despues de verificarToken.
 */
const permitirRoles = (...roles) => (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
        return res.status(403).json({
            message: "No tiene permisos para realizar esta operacion."
        });
    }
    next();
};

module.exports = verificarToken;
module.exports.permitirRoles = permitirRoles;
