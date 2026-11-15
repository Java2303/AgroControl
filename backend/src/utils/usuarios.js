const ROLES = ['admin_ciat', 'agronomo', 'productor'];

/**
 * Valida el cambio que el administrador del CIAT pide sobre una cuenta (UC-04).
 * Devuelve { error } o { cambios } con solo los campos válidos recibidos.
 */
const validarCambioUsuario = (cuerpo, idAdministrador, idObjetivo) => {
    const { rol, activo } = cuerpo || {};
    if (rol === undefined && activo === undefined) {
        return { error: 'Indique el rol o el estado de la cuenta.' };
    }
    if (rol !== undefined && !ROLES.includes(rol)) {
        return { error: 'El rol no es válido.' };
    }
    if (activo !== undefined && typeof activo !== 'boolean') {
        return { error: 'El estado de la cuenta no es válido.' };
    }
    // Evita que el administrador se quite a sí mismo el acceso y deje el sistema sin quien lo gestione
    if (idAdministrador === idObjetivo) {
        return { error: 'No puede cambiar el rol ni desactivar su propia cuenta.' };
    }
    const cambios = {};
    if (rol !== undefined) cambios.rol = rol;
    if (activo !== undefined) cambios.activo = activo;
    return { cambios };
};

module.exports = { ROLES, validarCambioUsuario };
