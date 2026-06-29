-- Migration: Add RLS policy allowing Admins to update profiles
CREATE POLICY "Admins can update all profiles" ON public.marialima_profiles
FOR UPDATE
USING (marialima_has_role(auth.uid(), 'admin'::marialima_app_role));
