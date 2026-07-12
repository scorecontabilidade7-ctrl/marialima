-- Migration to create inventory RPCs
-- marialima_get_inventory_kpis
-- marialima_get_inventory_treemap
-- marialima_get_inventory_abc_replenishment

CREATE OR REPLACE FUNCTION public.marialima_get_inventory_kpis(
  p_store TEXT
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

  SELECT jsonb_build_object(
    'total_items_qty', SUM(quantidade::numeric),
    'total_cost_value', SUM(quantidade::numeric * custo::numeric),
    'total_sale_value', SUM(quantidade::numeric * valor_venda::numeric),
    'unique_skus', COUNT(DISTINCT ean)
  ) INTO v_result
  FROM gigatech_estoque
  WHERE cliente_id = v_cliente_id AND quantidade::numeric > 0;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.marialima_get_inventory_treemap(
  p_store TEXT,
  p_group_by TEXT
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

  IF p_group_by = 'departamento' THEN
    WITH grouped AS (
      SELECT 
        COALESCE(departamento, 'Sem Departamento') AS name,
        SUM(quantidade::numeric * custo::numeric) AS value,
        SUM(quantidade::numeric) AS qty
      FROM gigatech_estoque
      WHERE cliente_id = v_cliente_id AND quantidade::numeric > 0
      GROUP BY departamento
      ORDER BY value DESC
    )
    SELECT COALESCE(jsonb_agg(row_to_json(g)), '[]'::jsonb) INTO v_result FROM grouped g;
  ELSIF p_group_by = 'marca' THEN
    WITH grouped AS (
      SELECT 
        COALESCE(marca, 'Sem Marca') AS name,
        SUM(quantidade::numeric * custo::numeric) AS value,
        SUM(quantidade::numeric) AS qty
      FROM gigatech_estoque
      WHERE cliente_id = v_cliente_id AND quantidade::numeric > 0
      GROUP BY marca
      ORDER BY value DESC
      LIMIT 50
    )
    SELECT COALESCE(jsonb_agg(row_to_json(g)), '[]'::jsonb) INTO v_result FROM grouped g;
  END IF;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.marialima_get_inventory_abc_replenishment(
  p_store TEXT,
  p_days INTEGER DEFAULT 30
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

  WITH sales_summary AS (
    SELECT 
      ean,
      SUM(quantidade::numeric) AS total_sold_qty,
      SUM(valor_venda::numeric * quantidade::numeric) AS total_sold_value,
      MAX(data_venda) AS last_sale_date
    FROM gigatech_vendas
    WHERE cliente_id = v_cliente_id
      AND data_venda >= (CURRENT_DATE - (p_days || ' days')::interval)
    GROUP BY ean
  ),
  total_sales AS (
    SELECT COALESCE(SUM(total_sold_value), 0.01) AS grand_total FROM sales_summary
  ),
  ranked_sales AS (
    SELECT 
      s.ean,
      s.total_sold_qty,
      s.total_sold_value,
      s.last_sale_date,
      SUM(s.total_sold_value) OVER (ORDER BY s.total_sold_value DESC) / t.grand_total AS cumulative_pct
    FROM sales_summary s
    CROSS JOIN total_sales t
  ),
  inventory AS (
    SELECT 
      ean,
      MAX(produto) as produto,
      MAX(marca) as marca,
      MAX(cor) as cor,
      MAX(departamento) as departamento,
      SUM(quantidade::numeric) as current_stock,
      AVG(custo::numeric) as custo_unitario,
      AVG(valor_venda::numeric) as venda_unitario
    FROM gigatech_estoque
    WHERE cliente_id = v_cliente_id
      AND quantidade::numeric > 0
    GROUP BY ean
  ),
  combined AS (
    SELECT 
      i.ean,
      i.produto,
      i.marca,
      i.cor,
      i.departamento,
      i.current_stock,
      i.custo_unitario,
      i.venda_unitario,
      (i.current_stock * i.custo_unitario) AS custo_total,
      COALESCE(rs.total_sold_qty, 0) AS total_sold_qty,
      COALESCE(rs.total_sold_value, 0) AS total_sold_value,
      COALESCE(
        rs.last_sale_date, 
        (SELECT MAX(data_venda) FROM gigatech_vendas v2 WHERE v2.cliente_id = v_cliente_id AND v2.ean = i.ean)
      ) AS last_sale_date,
      CASE 
        WHEN rs.cumulative_pct <= 0.80 THEN 'A'
        WHEN rs.cumulative_pct <= 0.95 THEN 'B'
        WHEN rs.cumulative_pct > 0.95 THEN 'C'
        ELSE 'Sem Venda'
      END AS curva_abc,
      (COALESCE(rs.total_sold_qty, 0) / p_days::numeric) AS avg_daily_sales
    FROM inventory i
    LEFT JOIN ranked_sales rs ON i.ean = rs.ean
  ),
  final_data AS (
    SELECT 
      c.*,
      CASE 
        WHEN c.avg_daily_sales > 0 THEN ROUND(c.current_stock / c.avg_daily_sales, 1)
        ELSE 9999
      END AS days_of_supply,
      CASE
        WHEN c.avg_daily_sales = 0 OR (c.current_stock / c.avg_daily_sales) > 120 THEN 
          CASE 
            WHEN c.last_sale_date IS NULL OR c.last_sale_date < (CURRENT_DATE - interval '90 days') THEN 'Bazar (Obsoleto)'
            ELSE 'Excesso de Estoque'
          END
        WHEN c.curva_abc = 'A' AND c.avg_daily_sales > 0 AND (c.current_stock / c.avg_daily_sales) <= 15 THEN 'Ruptura Crítica'
        WHEN c.curva_abc = 'A' AND c.avg_daily_sales > 0 AND (c.current_stock / c.avg_daily_sales) <= 30 THEN 'Atenção'
        WHEN c.curva_abc IN ('A', 'B') AND c.avg_daily_sales > 0 AND (c.current_stock / c.avg_daily_sales) BETWEEN 31 AND 90 THEN 'Estoque Saudável'
        ELSE 'Regular'
      END AS status
    FROM combined c
  )
  SELECT COALESCE(jsonb_agg(row_to_json(fd)), '[]'::jsonb) INTO v_result
  FROM final_data fd;

  RETURN v_result;
END;
$$;
