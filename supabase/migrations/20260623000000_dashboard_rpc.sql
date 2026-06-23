CREATE OR REPLACE FUNCTION public.marialima_get_dashboard_data(
    p_cliente_id UUID,
    p_year INTEGER,
    p_month INTEGER,
    p_vendedor TEXT DEFAULT NULL,
    p_departamento TEXT DEFAULT NULL,
    p_data_inicio DATE DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH base_vendas AS (
        SELECT v.* 
        FROM gigatech_vendedores v
        WHERE v.cliente_id = p_cliente_id
          AND (
              (p_data_inicio IS NOT NULL OR p_data_fim IS NOT NULL) 
              OR 
              (EXTRACT(YEAR FROM timezone('UTC', v.data_venda)::date) = p_year AND EXTRACT(MONTH FROM timezone('UTC', v.data_venda)::date) = p_month)
          )
          AND (p_vendedor IS NULL OR p_vendedor = 'all' OR v.nome_vendedor = p_vendedor)
          AND (p_data_inicio IS NULL OR timezone('UTC', v.data_venda)::date >= p_data_inicio)
          AND (p_data_fim IS NULL OR timezone('UTC', v.data_venda)::date <= p_data_fim)
          AND (p_departamento IS NULL OR p_departamento = 'all' OR EXISTS (
              SELECT 1 FROM gigatech_vendas d
              WHERE d.cliente_id = v.cliente_id 
                AND d.n_cupom = v.n_cupom
                AND d.departamento = p_departamento
          ))
    ),
    base_detalhada AS (
        SELECT d.*
        FROM gigatech_vendas d
        WHERE d.cliente_id = p_cliente_id
          AND (p_departamento IS NULL OR p_departamento = 'all' OR d.departamento = p_departamento)
          AND EXISTS (
              SELECT 1 FROM base_vendas v WHERE v.n_cupom = d.n_cupom
          )
    ),
    kpis AS (
        SELECT 
            COALESCE(SUM(valor_total::numeric), 0) AS total_vendas,
            COUNT(DISTINCT n_cupom) AS qtd_vendas,
            CASE WHEN COUNT(DISTINCT n_cupom) > 0 THEN COALESCE(SUM(valor_total::numeric), 0) / COUNT(DISTINCT n_cupom) ELSE 0 END AS ticket_medio,
            COALESCE(SUM(COALESCE(comissao_vendedor::numeric, 0) + COALESCE(comissao_supervisor::numeric, 0)), 0) AS total_comissoes
        FROM base_vendas
    ),
    ranking AS (
        SELECT 
            nome_vendedor AS vendedor,
            SUM(valor_total::numeric) AS total,
            SUM(comissao_vendedor::numeric) AS comissao,
            COUNT(DISTINCT n_cupom) AS qtd_vendas
        FROM base_vendas
        WHERE nome_vendedor IS NOT NULL AND nome_vendedor != ''
        GROUP BY nome_vendedor
        ORDER BY total DESC
    ),
    timeline AS (
        SELECT 
            timezone('UTC', data_venda)::date::text AS date,
            SUM(valor_total::numeric) AS total,
            COUNT(DISTINCT n_cupom) AS count
        FROM base_vendas
        GROUP BY timezone('UTC', data_venda)::date
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
        FROM gigatech_vendedores
        WHERE cliente_id = p_cliente_id 
          AND (
              (p_data_inicio IS NOT NULL OR p_data_fim IS NOT NULL) 
              OR 
              (EXTRACT(YEAR FROM timezone('UTC', data_venda)::date) = p_year AND EXTRACT(MONTH FROM timezone('UTC', data_venda)::date) = p_month)
          )
          AND (p_data_inicio IS NULL OR timezone('UTC', data_venda)::date >= p_data_inicio)
          AND (p_data_fim IS NULL OR timezone('UTC', data_venda)::date <= p_data_fim)
          AND nome_vendedor IS NOT NULL AND nome_vendedor != ''
        ORDER BY vendedor
    ),
    all_departments AS (
        SELECT DISTINCT departamento
        FROM gigatech_vendas d
        JOIN gigatech_vendedores v ON v.n_cupom = d.n_cupom AND v.cliente_id = d.cliente_id
        WHERE d.cliente_id = p_cliente_id 
          AND (
              (p_data_inicio IS NOT NULL OR p_data_fim IS NOT NULL) 
              OR 
              (EXTRACT(YEAR FROM timezone('UTC', v.data_venda)::date) = p_year AND EXTRACT(MONTH FROM timezone('UTC', v.data_venda)::date) = p_month)
          )
          AND (p_data_inicio IS NULL OR timezone('UTC', v.data_venda)::date >= p_data_inicio)
          AND (p_data_fim IS NULL OR timezone('UTC', v.data_venda)::date <= p_data_fim)
          AND d.departamento IS NOT NULL AND d.departamento != ''
        ORDER BY departamento
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
