-- ==========================================
-- SCRIPT DE MIGRACIÓN PARA AISLAMIENTO DE DATOS
-- ==========================================
-- Ejecuta este script completo en el SQL Editor de Supabase.

-- 1. Crear la tabla de fincas
CREATE TABLE IF NOT EXISTS public.fincas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  propietario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en fincas
ALTER TABLE public.fincas ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad RLS
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias fincas" ON public.fincas;
CREATE POLICY "Usuarios pueden ver sus propias fincas" ON public.fincas
  FOR SELECT TO authenticated USING (auth.uid() = propietario_id);

DROP POLICY IF EXISTS "Usuarios pueden crear sus propias fincas" ON public.fincas;
CREATE POLICY "Usuarios pueden crear sus propias fincas" ON public.fincas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = propietario_id);

DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propias fincas" ON public.fincas;
CREATE POLICY "Usuarios pueden actualizar sus propias fincas" ON public.fincas
  FOR UPDATE TO authenticated USING (auth.uid() = propietario_id);

DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propias fincas" ON public.fincas;
CREATE POLICY "Usuarios pueden eliminar sus propias fincas" ON public.fincas
  FOR DELETE TO authenticated USING (auth.uid() = propietario_id);

-- 2. Función y Trigger para auto-crear una finca por defecto al registrar un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user_finca()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.fincas (id, nombre, propietario_id)
  VALUES (
    new.id, -- El ID de la finca inicial coincide con el ID de usuario para compatibilidad directa
    'Finca Principal',
    new.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created_finca
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_finca();

-- 3. Migrar usuarios existentes agregando su finca por defecto (si no la tienen ya)
INSERT INTO public.fincas (id, nombre, propietario_id)
SELECT id, 'Finca Principal', id
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. Modificar la tabla potreros para incluir relación con finca
ALTER TABLE public.potreros 
ADD COLUMN IF NOT EXISTS finca_id UUID REFERENCES public.fincas(id) ON DELETE CASCADE;

-- Si hay potreros existentes sin finca_id, asociarlos a la finca por defecto del primer usuario
DO $$
DECLARE
  v_first_user UUID;
BEGIN
  SELECT id INTO v_first_user FROM auth.users LIMIT 1;
  IF v_first_user IS NOT NULL THEN
    UPDATE public.potreros SET finca_id = v_first_user WHERE finca_id IS NULL;
  END IF;
END $$;

-- 5. Modificar la tabla de alertas para incluir relación con finca
ALTER TABLE public.alertas 
ADD COLUMN IF NOT EXISTS propietario_id UUID REFERENCES public.fincas(id) ON DELETE CASCADE;

DO $$
DECLARE
  v_first_user UUID;
BEGIN
  SELECT id INTO v_first_user FROM auth.users LIMIT 1;
  IF v_first_user IS NOT NULL THEN
    UPDATE public.alertas SET propietario_id = v_first_user WHERE propietario_id IS NULL;
  END IF;
END $$;
