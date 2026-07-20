ALTER TABLE public.price_levels
  ADD COLUMN IF NOT EXISTS pmh numeric,
  ADD COLUMN IF NOT EXISTS pml numeric,
  ADD COLUMN IF NOT EXISTS pqh numeric,
  ADD COLUMN IF NOT EXISTS pql numeric,
  ADD COLUMN IF NOT EXISTS equilibrium numeric,
  ADD COLUMN IF NOT EXISTS asset_class text;