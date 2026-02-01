-- ==============================================
-- STRING PLATFORM - COMPLETE DATABASE SCHEMA
-- ==============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 1. ENUMS
-- ==============================================

-- User role enum for RBAC
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Order status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');

-- Job status enum  
CREATE TYPE public.job_status AS ENUM ('requested', 'quoted', 'accepted', 'rejected', 'ongoing', 'completed', 'cancelled', 'disputed');

-- Business type enum
CREATE TYPE public.business_type_enum AS ENUM ('goods', 'services', 'both');

-- Offer type enum
CREATE TYPE public.offer_type_enum AS ENUM ('product', 'service', 'employment', 'collaboration');

-- Urgency level enum
CREATE TYPE public.urgency_level AS ENUM ('low', 'medium', 'high', 'urgent');

-- Verification tier enum
CREATE TYPE public.verification_tier AS ENUM ('none', 'basic', 'verified', 'premium', 'elite');

-- ==============================================
-- 2. USER ROLES TABLE (for secure role checking)
-- ==============================================

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ==============================================
-- 3. PROFILES TABLE
-- ==============================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'business')),
    avatar_url TEXT,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 4. BUSINESSES TABLE
-- ==============================================

CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    industry TEXT,
    company_size TEXT,
    years_in_operation TEXT,
    business_location TEXT,
    website TEXT,
    business_goals TEXT[],
    target_customer_type TEXT,
    monthly_customer_volume TEXT,
    budget_range TEXT,
    marketing_channels TEXT[],
    pain_points TEXT[],
    products_services TEXT,
    competitive_landscape TEXT,
    growth_strategy TEXT,
    operating_region TEXT,
    internal_capacity TEXT,
    expectations_from_string TEXT,
    strategic_notes TEXT,
    street_address TEXT,
    area_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_verified BOOLEAN DEFAULT false,
    business_type business_type_enum DEFAULT 'both',
    cover_image_url TEXT,
    logo_url TEXT,
    description TEXT,
    reputation_score NUMERIC(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_completed_orders INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT false,
    verification_tier verification_tier DEFAULT 'none',
    available_balance NUMERIC(12,2) DEFAULT 0,
    pending_balance NUMERIC(12,2) DEFAULT 0,
    total_withdrawn NUMERIC(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 5. CUSTOMERS TABLE
-- ==============================================

CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    age_range TEXT,
    gender TEXT,
    location TEXT,
    interests TEXT[],
    spending_habits TEXT,
    preferred_categories TEXT[],
    lifestyle_preferences TEXT[],
    service_expectations TEXT,
    pain_points TEXT[],
    improvement_wishes TEXT,
    purchase_frequency TEXT,
    custom_preferences TEXT,
    street_address TEXT,
    area_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 6. PRODUCTS TABLE
-- ==============================================

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12,2),
    compare_at_price NUMERIC(12,2),
    image_url TEXT,
    images TEXT[],
    category TEXT,
    tags TEXT[],
    in_stock BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_rare BOOLEAN DEFAULT false,
    total_orders INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 7. SERVICES TABLE
-- ==============================================

CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_min NUMERIC(12,2),
    price_max NUMERIC(12,2),
    price_type TEXT DEFAULT 'range',
    images TEXT[],
    category TEXT,
    tags TEXT[],
    duration_estimate TEXT,
    is_promoted BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    total_jobs INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 8. ORDERS TABLE
-- ==============================================

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(12,2) DEFAULT 0,
    platform_fee NUMERIC(12,2) DEFAULT 0,
    commission_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    delivery_address TEXT,
    delivery_notes TEXT,
    tracking_number TEXT,
    confirmed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 9. JOBS TABLE (for services)
-- ==============================================

CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    status job_status NOT NULL DEFAULT 'requested',
    description TEXT,
    requirements TEXT,
    quoted_price NUMERIC(12,2),
    final_price NUMERIC(12,2),
    scheduled_date TIMESTAMPTZ,
    location TEXT,
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 10. REVIEWS TABLE
-- ==============================================

CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    reviewer_id UUID NOT NULL,
    reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('customer', 'business')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,
    images TEXT[],
    verified_purchase BOOLEAN DEFAULT false,
    response TEXT,
    response_at TIMESTAMPTZ,
    is_flagged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 11. CART ITEMS TABLE
-- ==============================================

CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cart_item_type CHECK (product_id IS NOT NULL OR service_id IS NOT NULL)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 12. SAVED BUSINESSES TABLE
-- ==============================================

CREATE TABLE public.saved_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (customer_id, business_id)
);

ALTER TABLE public.saved_businesses ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 13. OFFERS TABLE (requests/opportunities)
-- ==============================================

CREATE TABLE public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'business')),
    offer_type offer_type_enum NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    budget_min NUMERIC(12,2),
    budget_max NUMERIC(12,2),
    location TEXT,
    urgency urgency_level,
    images TEXT[],
    video_url TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fulfilled', 'cancelled', 'expired')),
    responses_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 14. REQUESTS TABLE (customer-business interactions)
-- ==============================================

CREATE TABLE public.requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    message TEXT,
    response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 15. NOTIFICATIONS TABLE
-- ==============================================

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 16. ADMIN MESSAGES TABLE
-- ==============================================

CREATE TABLE public.admin_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all', 'businesses', 'customers', 'specific')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    read_by UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 17. ADMIN MESSAGE REPLIES TABLE
-- ==============================================

CREATE TABLE public.admin_message_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.admin_messages(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'business', 'admin')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_message_replies ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 18. LOCATION REQUESTS TABLE
-- ==============================================

CREATE TABLE public.location_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'business')),
    street_address TEXT NOT NULL,
    area_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    admin_notes TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.location_requests ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 19. WITHDRAWAL REQUESTS TABLE
-- ==============================================

CREATE TABLE public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    admin_notes TEXT,
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 20. CONVERSATIONS TABLE (for messaging)
-- ==============================================

CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (customer_id, business_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 21. MESSAGES TABLE
-- ==============================================

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'business')),
    content TEXT NOT NULL,
    attachments TEXT[],
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS POLICIES
-- ==============================================

-- User Roles Policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Profiles Policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Businesses Policies
CREATE POLICY "Anyone can view active businesses" ON public.businesses FOR SELECT USING (is_active = true);
CREATE POLICY "Business owner can insert" ON public.businesses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Business owner can update" ON public.businesses FOR UPDATE USING (auth.uid() = user_id);

-- Customers Policies
CREATE POLICY "Customers can view own data" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Customer can insert own data" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Customer can update own data" ON public.customers FOR UPDATE USING (auth.uid() = user_id);

-- Products Policies
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Business owner can manage products" ON public.products FOR ALL 
    USING (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = products.business_id AND businesses.user_id = auth.uid()));

-- Services Policies
CREATE POLICY "Anyone can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Business owner can manage services" ON public.services FOR ALL 
    USING (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = services.business_id AND businesses.user_id = auth.uid()));

-- Orders Policies
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT 
    USING (EXISTS (SELECT 1 FROM customers WHERE customers.id = orders.customer_id AND customers.user_id = auth.uid()));
CREATE POLICY "Businesses can view their orders" ON public.orders FOR SELECT 
    USING (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = orders.business_id AND businesses.user_id = auth.uid()));
CREATE POLICY "Customers can create orders" ON public.orders FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM customers WHERE customers.id = orders.customer_id AND customers.user_id = auth.uid()));
CREATE POLICY "Businesses can update their orders" ON public.orders FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = orders.business_id AND businesses.user_id = auth.uid()));

-- Jobs Policies
CREATE POLICY "Customers can view own jobs" ON public.jobs FOR SELECT 
    USING (EXISTS (SELECT 1 FROM customers WHERE customers.id = jobs.customer_id AND customers.user_id = auth.uid()));
CREATE POLICY "Businesses can view their jobs" ON public.jobs FOR SELECT 
    USING (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = jobs.business_id AND businesses.user_id = auth.uid()));
CREATE POLICY "Customers can create jobs" ON public.jobs FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM customers WHERE customers.id = jobs.customer_id AND customers.user_id = auth.uid()));
CREATE POLICY "Businesses can update their jobs" ON public.jobs FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = jobs.business_id AND businesses.user_id = auth.uid()));

-- Reviews Policies
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Business can respond to reviews" ON public.reviews FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = reviews.business_id AND businesses.user_id = auth.uid()));

-- Cart Items Policies
CREATE POLICY "Customers can manage their cart" ON public.cart_items FOR ALL 
    USING (EXISTS (SELECT 1 FROM customers WHERE customers.id = cart_items.customer_id AND customers.user_id = auth.uid()));

-- Saved Businesses Policies
CREATE POLICY "Customers can manage saved businesses" ON public.saved_businesses FOR ALL 
    USING (EXISTS (SELECT 1 FROM customers WHERE customers.id = saved_businesses.customer_id AND customers.user_id = auth.uid()));

-- Offers Policies
CREATE POLICY "Anyone can view open offers" ON public.offers FOR SELECT USING (status = 'open');
CREATE POLICY "Users can view own offers" ON public.offers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create offers" ON public.offers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own offers" ON public.offers FOR UPDATE USING (auth.uid() = user_id);

-- Requests Policies
CREATE POLICY "Customers can view own requests" ON public.requests FOR SELECT 
    USING (EXISTS (SELECT 1 FROM customers WHERE customers.id = requests.customer_id AND customers.user_id = auth.uid()));
CREATE POLICY "Businesses can view their requests" ON public.requests FOR SELECT 
    USING (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = requests.business_id AND businesses.user_id = auth.uid()));
CREATE POLICY "Customers can create requests" ON public.requests FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM customers WHERE customers.id = requests.customer_id AND customers.user_id = auth.uid()));
CREATE POLICY "Businesses can update requests" ON public.requests FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = requests.business_id AND businesses.user_id = auth.uid()));

-- Notifications Policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Admin Messages Policies
CREATE POLICY "Users can view admin messages for their type" ON public.admin_messages FOR SELECT USING (
    recipient_type = 'all' 
    OR (recipient_type = 'specific' AND recipient_id = auth.uid())
    OR (recipient_type = 'businesses' AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'business'))
    OR (recipient_type = 'customers' AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'customer'))
);
CREATE POLICY "Admins can manage messages" ON public.admin_messages FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'));

-- Admin Message Replies Policies
CREATE POLICY "Users can view replies to messages they can see" ON public.admin_message_replies FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_messages WHERE id = message_id)
);
CREATE POLICY "Users can insert replies" ON public.admin_message_replies FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Location Requests Policies
CREATE POLICY "Users can view own location requests" ON public.location_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create location requests" ON public.location_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage location requests" ON public.location_requests FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'));

-- Withdrawal Requests Policies
CREATE POLICY "Businesses can view own withdrawals" ON public.withdrawal_requests FOR SELECT 
    USING (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = withdrawal_requests.business_id AND businesses.user_id = auth.uid()));
CREATE POLICY "Businesses can create withdrawals" ON public.withdrawal_requests FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = withdrawal_requests.business_id AND businesses.user_id = auth.uid()));
CREATE POLICY "Admins can manage withdrawals" ON public.withdrawal_requests FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'));

-- Conversations Policies
CREATE POLICY "Participants can view conversations" ON public.conversations FOR SELECT USING (
    EXISTS (SELECT 1 FROM customers WHERE customers.id = conversations.customer_id AND customers.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM businesses WHERE businesses.id = conversations.business_id AND businesses.user_id = auth.uid())
);
CREATE POLICY "Participants can create conversations" ON public.conversations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM customers WHERE customers.id = conversations.customer_id AND customers.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM businesses WHERE businesses.id = conversations.business_id AND businesses.user_id = auth.uid())
);

-- Messages Policies
CREATE POLICY "Conversation participants can view messages" ON public.messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM conversations c 
        WHERE c.id = messages.conversation_id 
        AND (
            EXISTS (SELECT 1 FROM customers WHERE customers.id = c.customer_id AND customers.user_id = auth.uid())
            OR EXISTS (SELECT 1 FROM businesses WHERE businesses.id = c.business_id AND businesses.user_id = auth.uid())
        )
    )
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id);

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_admin_messages_updated_at BEFORE UPDATE ON public.admin_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update conversation last_message_at when message is sent
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_conversation_on_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- Update business reputation score when review is added
CREATE OR REPLACE FUNCTION public.update_business_reputation()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.businesses 
    SET 
        reputation_score = (
            SELECT COALESCE(AVG(rating), 0) FROM public.reviews WHERE business_id = NEW.business_id
        ),
        total_reviews = (
            SELECT COUNT(*) FROM public.reviews WHERE business_id = NEW.business_id
        )
    WHERE id = NEW.business_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_business_reputation_on_review AFTER INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_business_reputation();

-- Update product order count
CREATE OR REPLACE FUNCTION public.update_product_order_count()
RETURNS TRIGGER AS $$
DECLARE
    item JSONB;
    product_id UUID;
BEGIN
    IF NEW.status = 'delivered' AND (OLD IS NULL OR OLD.status != 'delivered') THEN
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
        LOOP
            product_id := (item->>'product_id')::UUID;
            IF product_id IS NOT NULL THEN
                UPDATE public.products SET total_orders = total_orders + 1 WHERE id = product_id;
            END IF;
        END LOOP;
        
        UPDATE public.businesses SET total_completed_orders = total_completed_orders + 1 WHERE id = NEW.business_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_product_count_on_order AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_product_order_count();

-- Update service job count
CREATE OR REPLACE FUNCTION public.update_service_job_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        IF NEW.service_id IS NOT NULL THEN
            UPDATE public.services SET total_jobs = total_jobs + 1 WHERE id = NEW.service_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_service_count_on_job AFTER UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_service_job_count();

-- ==============================================
-- INDEXES
-- ==============================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX idx_businesses_location ON public.businesses(latitude, longitude);
CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_customers_location ON public.customers(latitude, longitude);
CREATE INDEX idx_products_business_id ON public.products(business_id);
CREATE INDEX idx_services_business_id ON public.services(business_id);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_business_id ON public.orders(business_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_jobs_customer_id ON public.jobs(customer_id);
CREATE INDEX idx_jobs_business_id ON public.jobs(business_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX idx_reviews_service_id ON public.reviews(service_id);
CREATE INDEX idx_cart_items_customer_id ON public.cart_items(customer_id);
CREATE INDEX idx_saved_businesses_customer_id ON public.saved_businesses(customer_id);
CREATE INDEX idx_offers_user_id ON public.offers(user_id);
CREATE INDEX idx_offers_status ON public.offers(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_conversations_customer_id ON public.conversations(customer_id);
CREATE INDEX idx_conversations_business_id ON public.conversations(business_id);

-- ==============================================
-- STORAGE BUCKETS
-- ==============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('service-images', 'service-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('business-media', 'business-media', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('offer-media', 'offer-media', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('review-images', 'review-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', false);

-- Avatar storage policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Product images policies
CREATE POLICY "Product images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Business owners can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Business owners can update product images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Business owners can delete product images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service images policies
CREATE POLICY "Service images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'service-images');
CREATE POLICY "Business owners can upload service images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'service-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Business owners can update service images" ON storage.objects FOR UPDATE USING (bucket_id = 'service-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Business owners can delete service images" ON storage.objects FOR DELETE USING (bucket_id = 'service-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Business media policies
CREATE POLICY "Business media is publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'business-media');
CREATE POLICY "Business owners can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'business-media' AND auth.uid() IS NOT NULL);
CREATE POLICY "Business owners can update media" ON storage.objects FOR UPDATE USING (bucket_id = 'business-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Business owners can delete media" ON storage.objects FOR DELETE USING (bucket_id = 'business-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Offer media policies  
CREATE POLICY "Offer media is publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'offer-media');
CREATE POLICY "Users can upload offer media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'offer-media' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own offer media" ON storage.objects FOR UPDATE USING (bucket_id = 'offer-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own offer media" ON storage.objects FOR DELETE USING (bucket_id = 'offer-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Review images policies
CREATE POLICY "Review images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'review-images');
CREATE POLICY "Users can upload review images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'review-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own review images" ON storage.objects FOR UPDATE USING (bucket_id = 'review-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own review images" ON storage.objects FOR DELETE USING (bucket_id = 'review-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Message attachments policies (private)
CREATE POLICY "Conversation participants can view attachments" ON storage.objects FOR SELECT USING (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can upload message attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own attachments" ON storage.objects FOR DELETE USING (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);