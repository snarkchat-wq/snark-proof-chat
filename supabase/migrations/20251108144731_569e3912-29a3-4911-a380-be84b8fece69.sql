-- Fix recursive RLS policy by using SECURITY DEFINER function public.is_admin
-- Drop and recreate policies safely

-- user_roles: replace recursive ALL policy
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles"
ON public.user_roles
AS PERMISSIVE
FOR ALL
TO public
USING (
  public.is_admin(((current_setting('request.jwt.claims', true))::json ->> 'wallet_address')::text)
)
WITH CHECK (
  public.is_admin(((current_setting('request.jwt.claims', true))::json ->> 'wallet_address')::text)
);

-- token_requirements: ensure only admins can modify
DROP POLICY IF EXISTS "Admins can update token requirements" ON public.token_requirements;
CREATE POLICY "Admins can update token requirements"
ON public.token_requirements
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (
  public.is_admin(((current_setting('request.jwt.claims', true))::json ->> 'wallet_address')::text)
);
