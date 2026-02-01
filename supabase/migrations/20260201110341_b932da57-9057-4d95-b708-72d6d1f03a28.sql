-- Create withdrawal requests table for businesses
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  admin_notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin message replies table
CREATE TABLE public.admin_message_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.admin_messages(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'business', 'customer')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add balance tracking to businesses
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS available_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_withdrawn NUMERIC DEFAULT 0;

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_message_replies ENABLE ROW LEVEL SECURITY;

-- RLS for withdrawal_requests
CREATE POLICY "Businesses can view their own withdrawals"
ON public.withdrawal_requests FOR SELECT
USING (
  business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
);

CREATE POLICY "Businesses can create withdrawal requests"
ON public.withdrawal_requests FOR INSERT
WITH CHECK (
  business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
);

-- Admin can manage all withdrawals (using has_role function)
CREATE POLICY "Admins can manage all withdrawals"
ON public.withdrawal_requests FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS for admin_message_replies
CREATE POLICY "Users can view replies to messages they can see"
ON public.admin_message_replies FOR SELECT
USING (true);

CREATE POLICY "Users can create replies"
ON public.admin_message_replies FOR INSERT
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Admins can manage all replies"
ON public.admin_message_replies FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add premium fee tracking for services
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS promotion_expires_at TIMESTAMP WITH TIME ZONE;

-- Create trigger to update timestamps
CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_message_replies;