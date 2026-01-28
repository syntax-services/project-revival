-- Fix overly permissive RLS policy on payment_transactions
DROP POLICY IF EXISTS "Service role can update transactions" ON public.payment_transactions;

-- Only allow authenticated users to update their own pending transactions
CREATE POLICY "Users can update their pending transactions"
ON public.payment_transactions FOR UPDATE
USING (user_id = auth.uid() AND status = 'pending');