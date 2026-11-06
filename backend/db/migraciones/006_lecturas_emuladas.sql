-- Un nodo ESP32 en modo emulador (sin sensor 7 en 1 conectado) envía valores generados por el
-- firmware. Se marcan para que el certificado no los presente como mediciones (RN-10).

ALTER TABLE public.lecturas_suelo ADD COLUMN IF NOT EXISTS emulada boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public.lecturas_suelo.emulada IS 'true si el nodo envió valores de su emulador de sensor y no mediciones.';
