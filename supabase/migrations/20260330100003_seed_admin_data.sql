-- Insert profile for yan (trigger may not have fired if table didn't exist at signup time)
INSERT INTO public.profiles (id, username, full_name)
VALUES ('6ea8d367-cb82-4321-bf77-f1c5e0fd59fa', 'yan', 'Yan')
ON CONFLICT (id) DO NOTHING;

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('6ea8d367-cb82-4321-bf77-f1c5e0fd59fa', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Seed March 2026 goals
INSERT INTO public.monthly_goals (year_month, meta_minima, meta_top1, meta_top2, meta_master, dias_uteis, created_by)
VALUES ('2026-03', 90000, 110000, 130000, 150000, 24, '6ea8d367-cb82-4321-bf77-f1c5e0fd59fa')
ON CONFLICT (year_month) DO NOTHING;
