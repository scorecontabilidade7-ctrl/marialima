CREATE OR REPLACE FUNCTION public.marialima_has_store_access(p_cliente_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  ) OR EXISTS (
    SELECT 1 FROM marialima_profiles
    WHERE id = v_user_id AND loja = v_store
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.marialima_has_store_access(_user_id uuid, _cliente_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _store_name TEXT;
  _accessible BOOLEAN;
  _profile_store TEXT;
BEGIN
  -- 1. Se o usuário for Admin geral do Maria Lima, libera tudo
  IF public.marialima_has_role(_user_id, 'admin') THEN
    RETURN TRUE;
  END IF;

  -- 2. Buscar o nome da loja a partir do cliente_id (UUID)
  SELECT nome_loja INTO _store_name 
  FROM public.gigatech_clientes_config 
  WHERE id = _cliente_id;

  IF _store_name IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check profile store
  SELECT loja INTO _profile_store
  FROM public.marialima_profiles
  WHERE id = _user_id;

  -- 3. Checar permissão de acordo com as regras de marialima_user_stores e profile
  SELECT EXISTS (
    SELECT 1 FROM public.marialima_user_stores us
    WHERE us.user_id = _user_id
      AND (
        (us.store = 'sobral' AND _store_name ILIKE '%Sobral%') OR
        (us.store = 'itapipoca' AND _store_name ILIKE '%Itapipoca%')
      )
  ) OR (
    (_profile_store = 'sobral' AND _store_name ILIKE '%Sobral%') OR
    (_profile_store = 'itapipoca' AND _store_name ILIKE '%Itapipoca%')
  ) INTO _accessible;

  RETURN _accessible;
END;
$function$;
