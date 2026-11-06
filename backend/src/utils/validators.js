/**
 * Valida si una parcela cumple con las reglas de negocio del CIAT.
 * @param {number} hectareas - El tamaño de la parcela en hectáreas.
 * @returns {boolean} True si la parcela es válida, False si excede el límite.
 */
function validarLimiteHectareas(hectareas) {
  const LIMITE_MAXIMO = 50;
  
  if (typeof hectareas !== 'number' || hectareas <= 0) {
    return false;
  }
  
  return hectareas <= LIMITE_MAXIMO;
}

module.exports = { validarLimiteHectareas };