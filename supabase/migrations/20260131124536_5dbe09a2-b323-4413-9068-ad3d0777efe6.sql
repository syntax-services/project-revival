-- Create offers table for user requests (products/services/employment/collaboration)
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'business')),
  offer_type TEXT NOT NULL CHECK (offer_type IN ('product', 'service', 'employment', 'collaboration')),
  title TEXT NOT NULL,
  description TEXT,
  budget_min NUMERIC(10,2),
  budget_max NUMERIC(10,2),
  location TEXT,
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
  images TEXT[],
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'fulfilled', 'cancelled')),
  responses_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create offer responses table
CREATE TABLE public.offer_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  message TEXT,
  proposed_price NUMERIC(10,2),
  estimated_delivery TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offers
CREATE POLICY "Users can view all open offers" 
ON public.offers FOR SELECT 
USING (status = 'open' OR user_id = auth.uid());

CREATE POLICY "Authenticated users can create offers" 
ON public.offers FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own offers" 
ON public.offers FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own offers" 
ON public.offers FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for offer_responses
CREATE POLICY "Offer owners and responders can view responses" 
ON public.offer_responses FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.offers WHERE id = offer_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid())
);

CREATE POLICY "Businesses can create responses" 
ON public.offer_responses FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid())
);

CREATE POLICY "Businesses can update their responses" 
ON public.offer_responses FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid())
);

-- Add updated_at trigger for offers
CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_offers_status ON public.offers(status);
CREATE INDEX idx_offers_user_id ON public.offers(user_id);
CREATE INDEX idx_offers_offer_type ON public.offers(offer_type);
CREATE INDEX idx_offer_responses_offer_id ON public.offer_responses(offer_id);