-- =============================================================
-- PASSO 1: Rodar no SQL Editor do Supabase para se tornar admin
-- =============================================================
-- Execute as linhas abaixo para descobrir seu UUID e se tornar admin:
--
--   SELECT id, email FROM auth.users;
--
-- Copie seu UUID e rode:
--
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('<SEU-UUID-AQUI>', 'admin')
--   ON CONFLICT (user_id, role) DO NOTHING;
--
-- Ou use o email diretamente (mais prático):
--
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = '<SEU-EMAIL-AQUI>'
--   ON CONFLICT (user_id, role) DO NOTHING;
-- =============================================================

-- =============================================================
-- PASSO 2: Criar função SECURITY DEFINER para upsert de metas
-- Isso garante que o insert/update funciona mesmo com RLS
-- =============================================================

CREATE OR REPLACE FUNCTION public.admin_upsert_monthly_goal(
  p_year_month  TEXT,
  p_meta_minima NUMERIC,
  p_meta_top1   NUMERIC,
  p_meta_top2   NUMERIC,
  p_meta_master NUMERIC,
  p_dias_uteis  INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas admins e managers podem usar esta função
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Permissão negada: apenas admins e managers podem gerenciar metas';
  END IF;

  INSERT INTO public.monthly_goals
    (year_month, meta_minima, meta_top1, meta_top2, meta_master, dias_uteis, created_by)
  VALUES
    (p_year_month, p_meta_minima, p_meta_top1, p_meta_top2, p_meta_master, p_dias_uteis, auth.uid())
  ON CONFLICT (year_month) DO UPDATE SET
    meta_minima  = EXCLUDED.meta_minima,
    meta_top1    = EXCLUDED.meta_top1,
    meta_top2    = EXCLUDED.meta_top2,
    meta_master  = EXCLUDED.meta_master,
    dias_uteis   = EXCLUDED.dias_uteis;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_monthly_goal(TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INTEGER)
  TO authenticated;
