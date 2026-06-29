-- Migration: Adicionar campo loja na tabela de vendedores config e novo RPC para buscar infos
ALTER TABLE public.marialima_vendedores_config ADD COLUMN IF NOT EXISTS loja TEXT;

CREATE OR REPLACE FUNCTION public.marialima_get_vendedores_info()
RETURNS TABLE (nome_vendedor TEXT, loja TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        v.nome_vendedor, 
        lower(split_part(c.nome_loja, ' - ', 2)) AS loja
    FROM public.gigatech_vendedores v
    JOIN public.gigatech_clientes_config c ON v.cliente_id = c.id
    WHERE v.nome_vendedor IS NOT NULL AND v.nome_vendedor != ''
      AND c.nome_loja ILIKE 'Maria Lima%';
END;
$$;
