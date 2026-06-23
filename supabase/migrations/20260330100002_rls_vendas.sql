-- Function to check if user has access to a specific store based on cliente_id
CREATE OR REPLACE FUNCTION marialima_has_store_access(p_cliente_id uuid)
RETURNS boolean AS $$
DECLARE
  v_store text;
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  -- If not logged in, no access
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM marialima_user_roles
    WHERE user_id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN true;
  END IF;

  -- Determine the store string based on p_cliente_id (from gigatech_clientes_config)
  IF p_cliente_id = '567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72'::uuid THEN
    v_store := 'itapipoca';
  ELSIF p_cliente_id = '94759cb2-e37b-4b67-8f77-fb7ab251fff9'::uuid THEN
    v_store := 'sobral';
  ELSE
    RETURN false;
  END IF;

  -- Check if user has access to this store
  RETURN EXISTS (
    SELECT 1 FROM marialima_user_stores
    WHERE user_id = v_user_id AND store = v_store
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on gigatech_vendas
ALTER TABLE gigatech_vendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marialima_vendas_select_policy" ON gigatech_vendas;
CREATE POLICY "marialima_vendas_select_policy"
ON gigatech_vendas
FOR SELECT
TO authenticated
USING (marialima_has_store_access(cliente_id));

-- Enable RLS on gigatech_vendedores
ALTER TABLE gigatech_vendedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marialima_vendedores_select_policy" ON gigatech_vendedores;
CREATE POLICY "marialima_vendedores_select_policy"
ON gigatech_vendedores
FOR SELECT
TO authenticated
USING (marialima_has_store_access(cliente_id));

-- Allow service_role to bypass RLS (actually it bypasses automatically but explicit policies don't hurt if we want inserts)
-- Wait, service_role bypasses RLS by default. No need to add policies for it.
