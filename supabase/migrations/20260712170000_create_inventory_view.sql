-- Migration to create inventory view for complete list
CREATE OR REPLACE VIEW public.marialima_inventory_view AS
SELECT 
  e.id,
  e.cliente_id,
  e.ean,
  e.produto,
  e.marca,
  e.cor,
  e.departamento,
  e.quantidade::numeric AS quantidade,
  e.custo::numeric AS custo,
  e.valor_venda::numeric AS valor_venda,
  (e.valor_venda::numeric - e.custo::numeric) AS lucro,
  v.last_sale_date,
  CASE 
    WHEN v.last_sale_date IS NOT NULL THEN (CURRENT_DATE - v.last_sale_date::date)
    ELSE NULL
  END AS dias_parado
FROM gigatech_estoque e
LEFT JOIN (
  SELECT cliente_id, ean, MAX(data_venda) AS last_sale_date
  FROM gigatech_vendas
  GROUP BY cliente_id, ean
) v ON e.cliente_id = v.cliente_id AND e.ean = v.ean
WHERE e.quantidade::numeric > 0;
