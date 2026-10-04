-- Agregar email y contraseña a las barberías existentes
ALTER TABLE barberias ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE barberias ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Crear tabla para la galería de fotos de los trabajos de cada barbería
CREATE TABLE IF NOT EXISTS galerias_barberia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barberia_id UUID NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
  imagen_url TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
