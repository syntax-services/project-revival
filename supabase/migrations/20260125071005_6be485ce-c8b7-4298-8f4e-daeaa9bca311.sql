-- Add location coordinates to profiles for proximity matching
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

-- Add location coordinates to businesses
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Add location coordinates to customers
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

-- Create products table for business product/service images
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price decimal(10,2),
  image_url text,
  in_stock boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products policies - public can view, business owners can manage
CREATE POLICY "Anyone can view products" ON public.products
FOR SELECT USING (true);

CREATE POLICY "Business owners can insert products" ON public.products
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = products.business_id 
    AND businesses.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can update products" ON public.products
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = products.business_id 
    AND businesses.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete products" ON public.products
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = products.business_id 
    AND businesses.user_id = auth.uid()
  )
);

-- Create ratings/likes table
CREATE TABLE public.business_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(business_id, customer_id)
);

-- Enable RLS on business_likes
ALTER TABLE public.business_likes ENABLE ROW LEVEL SECURITY;

-- Likes policies
CREATE POLICY "Anyone can view likes count" ON public.business_likes
FOR SELECT USING (true);

CREATE POLICY "Customers can add likes" ON public.business_likes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM customers 
    WHERE customers.id = business_likes.customer_id 
    AND customers.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can remove their likes" ON public.business_likes
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM customers 
    WHERE customers.id = business_likes.customer_id 
    AND customers.user_id = auth.uid()
  )
);

-- Create conversations table
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(customer_id, business_id)
);

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Customers can view their conversations" ON public.conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM customers 
    WHERE customers.id = conversations.customer_id 
    AND customers.user_id = auth.uid()
  )
);

CREATE POLICY "Businesses can view their conversations" ON public.conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = conversations.business_id 
    AND businesses.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can start conversations" ON public.conversations
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM customers 
    WHERE customers.id = conversations.customer_id 
    AND customers.user_id = auth.uid()
  )
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'business')),
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat messages policies
CREATE POLICY "Conversation participants can view messages" ON public.chat_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN customers cu ON c.customer_id = cu.id
    WHERE c.id = chat_messages.conversation_id AND cu.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM conversations c
    JOIN businesses b ON c.business_id = b.id
    WHERE c.id = chat_messages.conversation_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Conversation participants can send messages" ON public.chat_messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN customers cu ON c.customer_id = cu.id
    WHERE c.id = chat_messages.conversation_id AND cu.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM conversations c
    JOIN businesses b ON c.business_id = b.id
    WHERE c.id = chat_messages.conversation_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Conversation participants can update message read status" ON public.chat_messages
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN customers cu ON c.customer_id = cu.id
    WHERE c.id = chat_messages.conversation_id AND cu.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM conversations c
    JOIN businesses b ON c.business_id = b.id
    WHERE c.id = chat_messages.conversation_id AND b.user_id = auth.uid()
  )
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create storage bucket for business images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-images', 'business-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for business images
CREATE POLICY "Anyone can view business images" ON storage.objects
FOR SELECT USING (bucket_id = 'business-images');

CREATE POLICY "Business owners can upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Business owners can update their images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'business-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Business owners can delete their images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'business-images' 
  AND auth.uid() IS NOT NULL
);

-- Create trigger for updated_at on new tables
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();