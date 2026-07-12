CREATE TABLE IF NOT EXISTS public.marialima_monitoramento_acoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL CHECK (store IN ('sobral', 'itapipoca')),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.marialima_monitoramento_acoes ENABLE ROW LEVEL SECURITY;

-- Select is allowed for authenticated users
CREATE POLICY "Authenticated users can read monitoramento_acoes" ON public.marialima_monitoramento_acoes
  FOR SELECT TO authenticated USING (true);

-- Insert/Update/Delete only for admins
CREATE POLICY "Admins can manage monitoramento_acoes" ON public.marialima_monitoramento_acoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.marialima_user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RPC to get actions with realized value
CREATE OR REPLACE FUNCTION public.marialima_get_monitoramento_acoes(
  p_store TEXT,
  p_year INTEGER,
  p_month INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_id UUID;
  v_result JSONB;
BEGIN
  v_cliente_id := CASE 
    WHEN p_store = 'sobral' THEN '94759cb2-e37b-4b67-8f77-fb7ab251fff9'::UUID
    WHEN p_store = 'itapipoca' THEN '567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72'::UUID
    ELSE NULL
  END;

  WITH actions AS (
    SELECT 
      m.id,
      m.store,
      m.name,
      m.start_date,
      m.end_date,
      m.target_value,
      COALESCE((
        SELECT SUM(v.valor_total::numeric)
        FROM gigatech_vendedores v
        WHERE v.cliente_id = v_cliente_id
          AND timezone('UTC', v.data_venda)::date >= m.start_date
          AND timezone('UTC', v.data_venda)::date <= m.end_date
      ), 0) AS realized_value
    FROM public.marialima_monitoramento_acoes m
    WHERE m.store = p_store
      AND (
        (EXTRACT(YEAR FROM m.start_date) = p_year AND EXTRACT(MONTH FROM m.start_date) = p_month)
        OR 
        (EXTRACT(YEAR FROM m.end_date) = p_year AND EXTRACT(MONTH FROM m.end_date) = p_month)
      )
    ORDER BY m.start_date DESC
  )
  SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb) INTO v_result
  FROM actions a;

  RETURN v_result;
END;
$$;
