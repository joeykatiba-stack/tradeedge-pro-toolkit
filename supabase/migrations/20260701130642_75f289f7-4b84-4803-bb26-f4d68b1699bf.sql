
DO $$ BEGIN
  CREATE TYPE public.plan_tier AS ENUM ('free', 'pro', 'elite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_tier public.plan_tier NOT NULL DEFAULT 'free';

-- price_levels (public read)
CREATE TABLE IF NOT EXISTS public.price_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  pdh numeric,
  pdl numeric,
  pwh numeric,
  pwl numeric,
  premium_discount_midpoint numeric,
  round_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_price numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.price_levels TO anon, authenticated;
GRANT ALL ON public.price_levels TO service_role;
ALTER TABLE public.price_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_levels are publicly readable"
  ON public.price_levels FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.price_levels;
ALTER TABLE public.price_levels REPLICA IDENTITY FULL;

-- structure_analysis
CREATE TABLE IF NOT EXISTS public.structure_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text,
  timeframe text NOT NULL,
  image_url text NOT NULL,
  result_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_structure_analysis_user_created
  ON public.structure_analysis (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.structure_analysis TO authenticated;
GRANT ALL ON public.structure_analysis TO service_role;
ALTER TABLE public.structure_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own analyses" ON public.structure_analysis
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own analyses" ON public.structure_analysis
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own analyses" ON public.structure_analysis
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage RLS for chart-screenshots
CREATE POLICY "Users upload own chart screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chart-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own chart screenshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chart-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own chart screenshots"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chart-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
