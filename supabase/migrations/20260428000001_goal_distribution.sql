ALTER TABLE public.monthly_goals
  ADD COLUMN IF NOT EXISTS distribution_mode TEXT NOT NULL DEFAULT 'uniform';

ALTER TABLE public.monthly_goals
  ADD COLUMN IF NOT EXISTS distribution_percentages JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'monthly_goals_distribution_mode_check'
  ) THEN
    ALTER TABLE public.monthly_goals
      ADD CONSTRAINT monthly_goals_distribution_mode_check
      CHECK (distribution_mode IN ('uniform','day','week'));
  END IF;
END
$$;

UPDATE public.monthly_goals
SET distribution_mode = 'uniform'
WHERE distribution_mode IS NULL;

DROP FUNCTION IF EXISTS public.admin_upsert_monthly_goal(TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INTEGER);

CREATE OR REPLACE FUNCTION public.admin_upsert_monthly_goal(
  p_year_month  TEXT,
  p_meta_minima NUMERIC,
  p_meta_top1   NUMERIC,
  p_meta_top2   NUMERIC,
  p_meta_master NUMERIC,
  p_dias_uteis  INTEGER,
  p_distribution_mode TEXT DEFAULT 'uniform',
  p_distribution_percentages JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Permissão negada: apenas admins e managers podem gerenciar metas';
  END IF;

  INSERT INTO public.monthly_goals
    (year_month, meta_minima, meta_top1, meta_top2, meta_master, dias_uteis, distribution_mode, distribution_percentages, created_by)
  VALUES
    (p_year_month, p_meta_minima, p_meta_top1, p_meta_top2, p_meta_master, p_dias_uteis, COALESCE(p_distribution_mode,'uniform'), p_distribution_percentages, auth.uid())
  ON CONFLICT (year_month) DO UPDATE SET
    meta_minima  = EXCLUDED.meta_minima,
    meta_top1    = EXCLUDED.meta_top1,
    meta_top2    = EXCLUDED.meta_top2,
    meta_master  = EXCLUDED.meta_master,
    dias_uteis   = EXCLUDED.dias_uteis,
    distribution_mode = EXCLUDED.distribution_mode,
    distribution_percentages = EXCLUDED.distribution_percentages;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_monthly_goal(TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INTEGER, TEXT, JSONB)
  TO authenticated;
