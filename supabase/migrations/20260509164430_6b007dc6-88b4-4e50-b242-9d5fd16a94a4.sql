ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
ALTER TABLE public.farmers ADD CONSTRAINT farmers_language_check CHECK (language IN ('en','ha','yo','pcm'));