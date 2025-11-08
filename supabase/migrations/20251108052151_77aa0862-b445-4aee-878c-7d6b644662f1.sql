-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create token requirements table
CREATE TABLE public.token_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_mint_address TEXT NOT NULL,
  threshold_amount BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.token_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for token_requirements (everyone can read, only admins can update)
CREATE POLICY "Anyone can view token requirements"
  ON public.token_requirements
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update token requirements"
  ON public.token_requirements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
      AND role = 'admin'
    )
  );

-- RLS policies for user_roles
CREATE POLICY "Anyone can view user roles"
  ON public.user_roles
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
      AND ur.role = 'admin'
    )
  );

-- Insert initial token requirement
INSERT INTO public.token_requirements (token_mint_address, threshold_amount)
VALUES ('Ks9pAZRCp6Lsz3VfNH2tbzRWK2tz9ZGWkmsiVF3pump', 10000);

-- Insert admin user
INSERT INTO public.user_roles (wallet_address, role)
VALUES ('76qCJUDdJ4kCuy7QzXCKUr6dsTnEnYo6jUtGnuLcmErE', 'admin');

-- Create function to check if wallet is admin
CREATE OR REPLACE FUNCTION public.is_admin(wallet_addr TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE wallet_address = wallet_addr
    AND role = 'admin'
  );
$$;