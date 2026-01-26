-- Add business_type enum
CREATE TYPE public.business_type AS ENUM ('goods', 'services', 'both');

-- Add business_type to businesses table
ALTER TABLE public.businesses 
ADD COLUMN business_type public.business_type DEFAULT 'goods';

-- Add delivery/service radius
ALTER TABLE public.businesses
ADD COLUMN service_radius_km integer DEFAULT 50,
ADD COLUMN delivery_available boolean DEFAULT false,
ADD COLUMN pickup_available boolean DEFAULT true,
ADD COLUMN average_response_time text,
ADD COLUMN verified boolean DEFAULT false,
ADD COLUMN reputation_score numeric(3,2) DEFAULT 0.00,
ADD COLUMN total_reviews integer DEFAULT 0,
ADD COLUMN total_completed_orders integer DEFAULT 0;

-- Enhance products table for variations and more details
ALTER TABLE public.products
ADD COLUMN category text,
ADD COLUMN sku text,
ADD COLUMN min_order_quantity integer DEFAULT 1,
ADD COLUMN unit text DEFAULT 'piece',
ADD COLUMN weight numeric(10,2),
ADD COLUMN dimensions jsonb,
ADD COLUMN is_featured boolean DEFAULT false,
ADD COLUMN total_views integer DEFAULT 0,
ADD COLUMN total_orders integer DEFAULT 0;

-- Create services table for service-based businesses
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  price_type text NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'hourly', 'range', 'quote')),
  price_min numeric(12,2),
  price_max numeric(12,2),
  duration_estimate text,
  availability text DEFAULT 'available' CHECK (availability IN ('available', 'busy', 'unavailable')),
  location_coverage text[],
  portfolio_images text[],
  is_featured boolean DEFAULT false,
  total_views integer DEFAULT 0,
  total_jobs integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Services RLS policies
CREATE POLICY "Anyone can view services" ON public.services
FOR SELECT USING (true);

CREATE POLICY "Business owners can insert services" ON public.services
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = services.business_id AND businesses.user_id = auth.uid())
);

CREATE POLICY "Business owners can update services" ON public.services
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = services.business_id AND businesses.user_id = auth.uid())
);

CREATE POLICY "Business owners can delete services" ON public.services
FOR DELETE USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = services.business_id AND businesses.user_id = auth.uid())
);

-- Create orders table for goods
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL DEFAULT 'ORD-' || substr(gen_random_uuid()::text, 1, 8),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(12,2) DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  delivery_address text,
  delivery_method text DEFAULT 'pickup' CHECK (delivery_method IN ('pickup', 'delivery')),
  notes text,
  estimated_delivery timestamptz,
  confirmed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Orders RLS policies
CREATE POLICY "Customers can view their orders" ON public.orders
FOR SELECT USING (
  EXISTS (SELECT 1 FROM customers WHERE customers.id = orders.customer_id AND customers.user_id = auth.uid())
);

CREATE POLICY "Businesses can view their orders" ON public.orders
FOR SELECT USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = orders.business_id AND businesses.user_id = auth.uid())
);

CREATE POLICY "Customers can create orders" ON public.orders
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM customers WHERE customers.id = orders.customer_id AND customers.user_id = auth.uid())
);

CREATE POLICY "Businesses can update order status" ON public.orders
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = orders.business_id AND businesses.user_id = auth.uid())
);

-- Create jobs table for services
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number text UNIQUE NOT NULL DEFAULT 'JOB-' || substr(gen_random_uuid()::text, 1, 8),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  service_id uuid REFERENCES public.services(id),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'quoted', 'accepted', 'ongoing', 'completed', 'cancelled', 'disputed')),
  title text NOT NULL,
  description text,
  location text,
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  quoted_price numeric(12,2),
  final_price numeric(12,2),
  scheduled_date timestamptz,
  scheduled_time text,
  notes text,
  attachments text[],
  quoted_at timestamptz,
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Jobs RLS policies
CREATE POLICY "Customers can view their jobs" ON public.jobs
FOR SELECT USING (
  EXISTS (SELECT 1 FROM customers WHERE customers.id = jobs.customer_id AND customers.user_id = auth.uid())
);

CREATE POLICY "Businesses can view their jobs" ON public.jobs
FOR SELECT USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = jobs.business_id AND businesses.user_id = auth.uid())
);

CREATE POLICY "Customers can create jobs" ON public.jobs
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM customers WHERE customers.id = jobs.customer_id AND customers.user_id = auth.uid())
);

CREATE POLICY "Businesses can update jobs" ON public.jobs
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = jobs.business_id AND businesses.user_id = auth.uid())
);

CREATE POLICY "Customers can update their jobs" ON public.jobs
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM customers WHERE customers.id = jobs.customer_id AND customers.user_id = auth.uid())
);

-- Create reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL,
  reviewer_type text NOT NULL CHECK (reviewer_type IN ('customer', 'business')),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text,
  images text[],
  verified_purchase boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  response text,
  response_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_target_check CHECK (
    (business_id IS NOT NULL) OR (product_id IS NOT NULL) OR (service_id IS NOT NULL)
  )
);

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Reviews RLS policies
CREATE POLICY "Anyone can view reviews" ON public.reviews
FOR SELECT USING (true);

CREATE POLICY "Customers can create reviews" ON public.reviews
FOR INSERT WITH CHECK (
  reviewer_type = 'customer' AND
  EXISTS (SELECT 1 FROM customers WHERE customers.id = reviews.reviewer_id AND customers.user_id = auth.uid())
);

CREATE POLICY "Reviewers can update their reviews" ON public.reviews
FOR UPDATE USING (
  (reviewer_type = 'customer' AND EXISTS (SELECT 1 FROM customers WHERE customers.id = reviews.reviewer_id AND customers.user_id = auth.uid()))
  OR
  (reviewer_type = 'business' AND EXISTS (SELECT 1 FROM businesses WHERE businesses.id = reviews.reviewer_id AND businesses.user_id = auth.uid()))
);

-- Business can respond to reviews
CREATE POLICY "Businesses can respond to reviews" ON public.reviews
FOR UPDATE USING (
  business_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = reviews.business_id AND businesses.user_id = auth.uid())
);

-- Create updated_at triggers for new tables
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();