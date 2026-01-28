-- Add manual location fields and admin verification system
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS street_address text,
ADD COLUMN IF NOT EXISTS area_name text,
ADD COLUMN IF NOT EXISTS location_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS location_verified_at timestamptz,
ADD COLUMN IF NOT EXISTS location_verified_by uuid;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS street_address text,
ADD COLUMN IF NOT EXISTS area_name text,
ADD COLUMN IF NOT EXISTS location_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS location_verified_at timestamptz,
ADD COLUMN IF NOT EXISTS location_verified_by uuid;

-- Add commission and delivery fields to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS commission_percent numeric DEFAULT 10 CHECK (commission_percent >= 1 AND commission_percent <= 20),
ADD COLUMN IF NOT EXISTS is_rare boolean DEFAULT false;

-- Create location verification requests table
CREATE TABLE IF NOT EXISTS public.location_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('customer', 'business')),
  street_address text NOT NULL,
  area_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_notes text,
  verified_latitude double precision,
  verified_longitude double precision,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create delivery options table
CREATE TABLE IF NOT EXISTS public.delivery_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_type text NOT NULL DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'standard', 'express')),
  delivery_fee numeric NOT NULL DEFAULT 0,
  estimated_delivery_hours integer,
  delivery_instructions text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add delivery type to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_type text DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'standard', 'express')),
ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0;

-- Create payment transactions table for Paystack
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  paystack_reference text UNIQUE,
  paystack_access_code text,
  payment_method text,
  paid_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.location_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Location requests policies
CREATE POLICY "Users can view their own location requests"
ON public.location_requests FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create location requests"
ON public.location_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all location requests"
ON public.location_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update location requests"
ON public.location_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Delivery options policies
CREATE POLICY "Users can view delivery options for their orders"
ON public.delivery_options FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.id = delivery_options.order_id AND c.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM orders o
    JOIN businesses b ON o.business_id = b.id
    WHERE o.id = delivery_options.order_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can create delivery options"
ON public.delivery_options FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.id = delivery_options.order_id AND c.user_id = auth.uid()
  )
);

-- Payment transactions policies
CREATE POLICY "Users can view their own transactions"
ON public.payment_transactions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create transactions"
ON public.payment_transactions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can update transactions"
ON public.payment_transactions FOR UPDATE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_location_requests_updated_at
BEFORE UPDATE ON public.location_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();