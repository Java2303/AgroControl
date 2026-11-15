-- Nodos IoT reales: cada lote vinculado a un ESP32 guarda el hash SHA-256 de su clave.
-- La MAC identifica el lote; la clave autentica al dispositivo (la MAC sola se puede falsificar).
-- Un lote con clave recibe lecturas por POST /api/telemetria y el simulador deja de escribir en él.

-- La 007 renombró la columna (antes dispositivo_token_hash): no se vuelve a crear con el nombre anterior
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lotes'
                   AND column_name IN ('clave_dispositivo_hash', 'dispositivo_token_hash')) THEN
        ALTER TABLE public.lotes ADD COLUMN clave_dispositivo_hash character(64);
    END IF;
END $$;
