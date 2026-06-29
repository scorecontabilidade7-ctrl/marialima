-- Atualizar a trigger do Maria Lima para inserir apenas se system = marialima
CREATE OR REPLACE FUNCTION public.marialima_handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'system' = 'marialima' THEN
    INSERT INTO public.marialima_profiles (id, username, full_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username', '')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar a trigger do Formen para inserir apenas se system = formen
CREATE OR REPLACE FUNCTION public.formen_handle_new_user()
RETURNS trigger AS $$
DECLARE
  _is_first boolean;
BEGIN
  IF NEW.raw_user_meta_data->>'system' = 'formen' THEN
    INSERT INTO public.formen_profiles (id, full_name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
      NEW.email
    )
    ON CONFLICT (id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email;

    SELECT COUNT(*) = 0
      INTO _is_first
    FROM public.formen_user_roles
    WHERE role = 'admin';

    IF _is_first THEN
      INSERT INTO public.formen_user_roles (user_id, role)
      VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      INSERT INTO public.formen_user_roles (user_id, role)
      VALUES (NEW.id, 'user')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
