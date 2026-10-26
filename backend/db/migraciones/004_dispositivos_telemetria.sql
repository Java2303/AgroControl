-- Nodos IoT reales: cada lote vinculado a un ESP32 guarda el hash SHA-256 de su clave.
-- La MAC identifica el lote; la clave autentica al dispositivo (la MAC sola se puede falsificar).
-- Un lote con clave recibe lecturas por POST /api/telemetria y el simulador deja de escribir en él.
-- Idempotente: se puede ejecutar varias veces (npm run db:init).

ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS dispositivo_token_hash character(64);

COMMENT ON COLUMN public.lotes.dispositivo_token_hash IS 'SHA-256 de la clave del nodo ESP32; NULL si el lote usa el simulador.';
