-- 1. Adiciona coluna store em monthly_goals (metas existentes ficam como 'sobral')
ALTER TABLE monthly_goals
  ADD COLUMN IF NOT EXISTS store TEXT NOT NULL DEFAULT 'sobral';

-- 2. Remove constraint única antiga (apenas year_month) e cria nova (year_month + store)
ALTER TABLE monthly_goals
  DROP CONSTRAINT IF EXISTS monthly_goals_year_month_key;

ALTER TABLE monthly_goals
  ADD CONSTRAINT monthly_goals_year_month_store_key UNIQUE (year_month, store);

-- 3. Cria tabela de acesso às lojas por usuário
CREATE TABLE IF NOT EXISTS user_stores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store      TEXT NOT NULL CHECK (store IN ('sobral', 'itapipoca')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, store)
);

-- 4. Habilita RLS na nova tabela
ALTER TABLE user_stores ENABLE ROW LEVEL SECURITY;

-- Admins podem ver e gerenciar tudo
CREATE POLICY "Admins gerenciam user_stores" ON user_stores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Usuários leem o próprio acesso
CREATE POLICY "Usuarios leem proprio acesso" ON user_stores
  FOR SELECT USING (user_id = auth.uid());

-- 5. Atualiza a função RPC para aceitar p_store
CREATE OR REPLACE FUNCTION admin_upsert_monthly_goal(
  p_year_month             TEXT,
  p_meta_minima            NUMERIC,
  p_meta_top1              NUMERIC,
  p_meta_top2              NUMERIC,
  p_meta_master            NUMERIC,
  p_dias_uteis             INTEGER,
  p_distribution_mode      TEXT    DEFAULT 'uniform',
  p_distribution_percentages JSONB DEFAULT NULL,
  p_store                  TEXT    DEFAULT 'sobral'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO monthly_goals (
    year_month, store, meta_minima, meta_top1, meta_top2,
    meta_master, dias_uteis, distribution_mode, distribution_percentages
  )
  VALUES (
    p_year_month, p_store, p_meta_minima, p_meta_top1, p_meta_top2,
    p_meta_master, p_dias_uteis, p_distribution_mode, p_distribution_percentages
  )
  ON CONFLICT (year_month, store) DO UPDATE SET
    meta_minima             = EXCLUDED.meta_minima,
    meta_top1               = EXCLUDED.meta_top1,
    meta_top2               = EXCLUDED.meta_top2,
    meta_master             = EXCLUDED.meta_master,
    dias_uteis              = EXCLUDED.dias_uteis,
    distribution_mode       = EXCLUDED.distribution_mode,
    distribution_percentages = EXCLUDED.distribution_percentages;
END;
$$;
