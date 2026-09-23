-- Migration: Create marialima_faturamento_historico and seed 2023-2025 data

CREATE TABLE IF NOT EXISTS public.marialima_faturamento_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    loja TEXT NOT NULL CHECK (loja IN ('sobral', 'itapipoca')),
    total_vendas NUMERIC NOT NULL DEFAULT 0,
    qtd_vendas INTEGER DEFAULT 0,
    ticket_medio NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unq_faturamento_historico UNIQUE (ano, mes, loja)
);

-- Enable RLS
ALTER TABLE public.marialima_faturamento_historico ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated and anon users
DROP POLICY IF EXISTS "Allow select for all" ON public.marialima_faturamento_historico;
CREATE POLICY "Allow select for all" ON public.marialima_faturamento_historico
    FOR SELECT USING (true);

-- Allow insert/update/delete for authenticated users
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.marialima_faturamento_historico;
CREATE POLICY "Allow all for authenticated" ON public.marialima_faturamento_historico
    FOR ALL USING (auth.role() = 'authenticated');

-- Seed Data (2023, 2024, 2025 for Sobral and Itapipoca)
INSERT INTO public.marialima_faturamento_historico (ano, mes, loja, total_vendas) VALUES
-- SOBRAL 2023
(2023, 1, 'sobral', 69665.00),
(2023, 2, 'sobral', 66339.90),
(2023, 3, 'sobral', 112868.20),
(2023, 4, 'sobral', 110771.00),
(2023, 5, 'sobral', 76196.00),
(2023, 6, 'sobral', 124891.00),
(2023, 7, 'sobral', 97317.40),
(2023, 8, 'sobral', 95136.00),
(2023, 9, 'sobral', 116125.00),
(2023, 10, 'sobral', 144644.10),
(2023, 11, 'sobral', 228425.88),
(2023, 12, 'sobral', 278369.22),

-- SOBRAL 2024
(2024, 1, 'sobral', 56409.40),
(2024, 2, 'sobral', 119124.91),
(2024, 3, 'sobral', 152166.95),
(2024, 4, 'sobral', 86346.00),
(2024, 5, 'sobral', 175012.98),
(2024, 6, 'sobral', 151309.90),
(2024, 7, 'sobral', 266098.30),
(2024, 8, 'sobral', 188534.80),
(2024, 9, 'sobral', 142266.70),
(2024, 10, 'sobral', 232186.56),
(2024, 11, 'sobral', 185973.04),
(2024, 12, 'sobral', 273769.10),

-- SOBRAL 2025
(2025, 1, 'sobral', 74329.00),
(2025, 2, 'sobral', 119813.50),
(2025, 3, 'sobral', 234836.65),
(2025, 4, 'sobral', 119501.00),
(2025, 5, 'sobral', 173353.00),
(2025, 6, 'sobral', 168340.47),
(2025, 7, 'sobral', 186236.10),
(2025, 8, 'sobral', 154793.00),
(2025, 9, 'sobral', 243869.83),
(2025, 10, 'sobral', 164821.00),
(2025, 11, 'sobral', 304447.60),
(2025, 12, 'sobral', 389079.00),

-- ITAPIPOCA 2023
(2023, 1, 'itapipoca', 19874.00),
(2023, 2, 'itapipoca', 14184.94),
(2023, 3, 'itapipoca', 31306.95),
(2023, 4, 'itapipoca', 24315.00),
(2023, 5, 'itapipoca', 61782.50),
(2023, 6, 'itapipoca', 42011.00),
(2023, 7, 'itapipoca', 33355.00),
(2023, 8, 'itapipoca', 41895.00),
(2023, 9, 'itapipoca', 33729.10),
(2023, 10, 'itapipoca', 32190.00),
(2023, 11, 'itapipoca', 66009.00),
(2023, 12, 'itapipoca', 93436.00),

-- ITAPIPOCA 2024
(2024, 1, 'itapipoca', 18528.00),
(2024, 2, 'itapipoca', 25658.70),
(2024, 3, 'itapipoca', 48575.60),
(2024, 4, 'itapipoca', 66407.90),
(2024, 5, 'itapipoca', 68016.90),
(2024, 6, 'itapipoca', 53766.90),
(2024, 7, 'itapipoca', 76693.00),
(2024, 8, 'itapipoca', 55215.50),
(2024, 9, 'itapipoca', 43394.60),
(2024, 10, 'itapipoca', 30796.00),
(2024, 11, 'itapipoca', 69122.20),
(2024, 12, 'itapipoca', 108361.60),

-- ITAPIPOCA 2025
(2025, 1, 'itapipoca', 19820.00),
(2025, 2, 'itapipoca', 35317.00),
(2025, 3, 'itapipoca', 38451.90),
(2025, 4, 'itapipoca', 82472.90),
(2025, 5, 'itapipoca', 115378.60),
(2025, 6, 'itapipoca', 62464.00),
(2025, 7, 'itapipoca', 101707.40),
(2025, 8, 'itapipoca', 76569.60),
(2025, 9, 'itapipoca', 109635.70),
(2025, 10, 'itapipoca', 77294.00),
(2025, 11, 'itapipoca', 200669.80),
(2025, 12, 'itapipoca', 215342.03)

ON CONFLICT (ano, mes, loja) DO UPDATE 
SET total_vendas = EXCLUDED.total_vendas,
    updated_at = now();
