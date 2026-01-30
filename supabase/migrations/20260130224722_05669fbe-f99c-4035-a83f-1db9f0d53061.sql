-- =====================================================
-- COMPREHENSIVE SCHEMA UPDATE FOR ALL NEW FEATURES
-- =====================================================

-- 1. VERIFICATION TIERS: Add verification_tier to businesses
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS verification_tier TEXT NOT NULL DEFAULT 'none' CHECK (verification_tier IN ('none', 'verified', 'premium'));

-- 2. CART SYSTEM: Create cart_items table for persistent shopping cart
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT cart_item_has_product_or_service CHECK (
        (product_id IS NOT NULL AND service_id IS NULL) OR 
        (product_id IS NULL AND service_id IS NOT NULL)
    )
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their cart items"
ON public.cart_items FOR SELECT
USING (EXISTS (SELECT 1 FROM customers WHERE customers.id = cart_items.customer_id AND customers.user_id = auth.uid()));

CREATE POLICY "Customers can add to cart"
ON public.cart_items FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM customers WHERE customers.id = cart_items.customer_id AND customers.user_id = auth.uid()));

CREATE POLICY "Customers can update cart items"
ON public.cart_items FOR UPDATE
USING (EXISTS (SELECT 1 FROM customers WHERE customers.id = cart_items.customer_id AND customers.user_id = auth.uid()));

CREATE POLICY "Customers can delete cart items"
ON public.cart_items FOR DELETE
USING (EXISTS (SELECT 1 FROM customers WHERE customers.id = cart_items.customer_id AND customers.user_id = auth.uid()));

-- 3. PINNED MESSAGES / ADMIN ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.admin_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL,
    recipient_id UUID,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all', 'businesses', 'customers', 'specific')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    read_by UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage admin messages"
ON public.admin_messages FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view admin messages for them"
ON public.admin_messages FOR SELECT
USING (
    recipient_type = 'all' OR
    (recipient_type = 'businesses' AND get_user_type(auth.uid()) = 'business') OR
    (recipient_type = 'customers' AND get_user_type(auth.uid()) = 'customer') OR
    (recipient_type = 'specific' AND recipient_id = auth.uid())
);

-- 4. DELIVERY TRACKING: Add tracking details to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS current_location TEXT,
ADD COLUMN IF NOT EXISTS tracking_updates JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS estimated_arrival TIMESTAMP WITH TIME ZONE;

-- 5. PRODUCT/SERVICE IMAGES: Add images array to services
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 6. PREMIUM VERIFICATION SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    payment_reference TEXT,
    amount_paid NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage premium subscriptions"
ON public.premium_subscriptions FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Businesses can view their subscription"
ON public.premium_subscriptions FOR SELECT
USING (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = premium_subscriptions.business_id AND businesses.user_id = auth.uid()));

CREATE POLICY "Businesses can insert subscription"
ON public.premium_subscriptions FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = premium_subscriptions.business_id AND businesses.user_id = auth.uid()));

-- 7. CONTENT MODERATION: Table to log blocked content attempts
CREATE TABLE IF NOT EXISTS public.content_violations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    content_type TEXT NOT NULL,
    original_content TEXT NOT NULL,
    violation_reason TEXT NOT NULL,
    action_taken TEXT NOT NULL DEFAULT 'blocked',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view content violations"
ON public.content_violations FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert violations"
ON public.content_violations FOR INSERT
WITH CHECK (true);

-- 8. SYSTEM SETTINGS for admin configurations
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system settings"
ON public.system_settings FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read system settings"
ON public.system_settings FOR SELECT
USING (true);

-- Insert default content filter settings
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('content_filter', '{"enabled": true, "strictness": "strict"}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- 9. Add triggers for updated_at
CREATE OR REPLACE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_admin_messages_updated_at
BEFORE UPDATE ON public.admin_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_premium_subscriptions_updated_at
BEFORE UPDATE ON public.premium_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Enable realtime for new tables that need it
ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;

-- 11. Admin can update orders (for confirming delivery on behalf)
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders"
ON public.orders FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 12. Admin can update jobs
DROP POLICY IF EXISTS "Admins can update all jobs" ON public.jobs;
CREATE POLICY "Admins can manage all jobs"
ON public.jobs FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 13. Admin notification insertion for notifications
CREATE POLICY "Service role can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- 14. Give admins full access to customers table for management
CREATE POLICY "Admins can manage all customers"
ON public.customers FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 15. Give admins full access to businesses table for management  
CREATE POLICY "Admins can manage all businesses"
ON public.businesses FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));