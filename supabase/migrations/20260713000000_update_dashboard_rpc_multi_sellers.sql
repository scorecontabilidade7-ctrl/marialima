-- Migration: Support multiple sellers, multi-store consolidated view and performance optimization
CREATE INDEX IF NOT EXISTS idx_gigatech_vendedores_client_date ON public.gigatech_vendedores(cliente_id, data_venda);
CREATE INDEX IF NOT EXISTS idx_gigatech_vendedores_cupom ON public.gigatech_vendedores(cliente_id, n_cupom);
CREATE INDEX IF NOT EXISTS idx_gigatech_vendas_cupom ON public.gigatech_vendas(cliente_id, n_cupom);
CREATE INDEX IF NOT EXISTS idx_gigatech_vendas_dept ON public.gigatech_vendas(cliente_id, data_venda, departamento);

CREATE OR REPLACE FUNCTION public.marialima_get_dashboard_data(
    p_cliente_id UUID DEFAULT NULL,
    p_year INTEGER DEFAULT 2026,
    p_month INTEGER DEFAULT 1,
    p_vendedor TEXT DEFAULT NULL,
    p_departamento TEXT DEFAULT NULL,
    p_data_inicio DATE DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL,
    p_vendedores TEXT[] DEFAULT NULL,
    p_cliente_ids UUID[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_start_date DATE;
    v_end_date DATE;
    v_has_custom_dates BOOLEAN;
BEGIN
    v_has_custom_dates := (p_data_inicio IS NOT NULL OR p_data_fim IS NOT NULL);
    
    IF v_has_custom_dates THEN
        v_start_date := COALESCE(p_data_inicio, make_date(p_year, p_month, 1));
        v_end_date := COALESCE(p_data_fim, (make_date(p_year, p_month, 1) + INTERVAL '1 month' - INTERVAL '1 day')::date);
    ELSE
        v_start_date := make_date(p_year, p_month, 1);
        v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::date;
    END IF;

    WITH base_vendas AS (
        SELECT v.* 
        FROM gigatech_vendedores v
        WHERE (
            (p_cliente_ids IS NOT NULL AND cardinality(p_cliente_ids) > 0 AND v.cliente_id = ANY(p_cliente_ids))
            OR
            ((p_cliente_ids IS NULL OR cardinality(p_cliente_ids) = 0) AND (p_cliente_id IS NULL OR v.cliente_id = p_cliente_id))
        )
          AND v.data_venda >= v_start_date 
          AND v.data_venda <= v_end_date
          AND (
              (p_vendedores IS NOT NULL AND cardinality(p_vendedores) > 0 AND (p_vendedores = ARRAY['all']::TEXT[] OR v.nome_vendedor = ANY(p_vendedores)))
              OR
              ((p_vendedores IS NULL OR cardinality(p_vendedores) = 0) AND (p_vendedor IS NULL OR p_vendedor = 'all' OR v.nome_vendedor = p_vendedor))
          )
          AND (p_departamento IS NULL OR p_departamento = 'all' OR EXISTS (
              SELECT 1 FROM gigatech_vendas d
              WHERE d.cliente_id = v.cliente_id 
                AND d.n_cupom = v.n_cupom
                AND d.data_venda = v.data_venda
                AND d.departamento = p_departamento
          ))
    ),
    base_detalhada AS (
        SELECT d.*
        FROM gigatech_vendas d
        JOIN base_vendas v ON v.cliente_id = d.cliente_id AND v.n_cupom = d.n_cupom AND v.data_venda = d.data_venda
        WHERE (p_departamento IS NULL OR p_departamento = 'all' OR d.departamento = p_departamento)
    ),
    kpis AS (
        SELECT 
            COALESCE(SUM(valor_total::numeric), 0) AS total_vendas,
            COUNT(DISTINCT (cliente_id, n_cupom)) AS qtd_vendas,
            CASE WHEN COUNT(DISTINCT (cliente_id, n_cupom)) > 0 
                 THEN COALESCE(SUM(valor_total::numeric), 0) / COUNT(DISTINCT (cliente_id, n_cupom)) 
                 ELSE 0 END AS ticket_medio,
            COALESCE(SUM(COALESCE(comissao_vendedor::numeric, 0) + COALESCE(comissao_supervisor::numeric, 0)), 0) AS total_comissoes
        FROM base_vendas
    ),
    ranking AS (
        SELECT 
            nome_vendedor AS vendedor,
            SUM(valor_total::numeric) AS total,
            SUM(comissao_vendedor::numeric) AS comissao,
            COUNT(DISTINCT (cliente_id, n_cupom)) AS qtd_vendas
        FROM base_vendas
        WHERE nome_vendedor IS NOT NULL AND nome_vendedor != ''
        GROUP BY nome_vendedor
        ORDER BY total DESC
    ),
    timeline AS (
        SELECT 
            data_venda::text AS date,
            SUM(valor_total::numeric) AS total,
            COUNT(DISTINCT (cliente_id, n_cupom)) AS count
        FROM base_vendas
        GROUP BY data_venda
        ORDER BY date ASC
    ),
    departamentos AS (
        SELECT 
            departamento,
            SUM(valor_venda::numeric) AS total
        FROM base_detalhada
        WHERE departamento IS NOT NULL AND departamento != ''
        GROUP BY departamento
        ORDER BY total DESC
    ),
    all_sellers AS (
        SELECT DISTINCT nome_vendedor AS vendedor
        FROM gigatech_vendedores v
        WHERE (
            (p_cliente_ids IS NOT NULL AND cardinality(p_cliente_ids) > 0 AND v.cliente_id = ANY(p_cliente_ids))
            OR
            ((p_cliente_ids IS NULL OR cardinality(p_cliente_ids) = 0) AND (p_cliente_id IS NULL OR v.cliente_id = p_cliente_id))
        )
          AND v.data_venda >= v_start_date 
          AND v.data_venda <= v_end_date
          AND nome_vendedor IS NOT NULL AND nome_vendedor != ''
        ORDER BY vendedor
    ),
    all_departments AS (
        SELECT DISTINCT d.departamento
        FROM gigatech_vendas d
        WHERE (
            (p_cliente_ids IS NOT NULL AND cardinality(p_cliente_ids) > 0 AND d.cliente_id = ANY(p_cliente_ids))
            OR
            ((p_cliente_ids IS NULL OR cardinality(p_cliente_ids) = 0) AND (p_cliente_id IS NULL OR d.cliente_id = p_cliente_id))
        )
          AND d.data_venda >= v_start_date 
          AND d.data_venda <= v_end_date
          AND d.departamento IS NOT NULL AND d.departamento != ''
        ORDER BY d.departamento
    )
    SELECT jsonb_build_object(
        'kpis', (SELECT row_to_json(k) FROM kpis k),
        'ranking', COALESCE((SELECT jsonb_agg(row_to_json(r)) FROM ranking r), '[]'::jsonb),
        'timeline', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM timeline t), '[]'::jsonb),
        'departamentos', COALESCE((SELECT jsonb_agg(row_to_json(dp)) FROM departamentos dp), '[]'::jsonb),
        'filter_options', jsonb_build_object(
            'vendedores', COALESCE((SELECT jsonb_agg(vendedor) FROM all_sellers), '[]'::jsonb),
            'departamentos', COALESCE((SELECT jsonb_agg(departamento) FROM all_departments), '[]'::jsonb)
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;
