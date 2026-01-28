-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all customers
CREATE POLICY "Admins can view all customers"
ON public.customers FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all businesses  
CREATE POLICY "Admins can view all businesses"
ON public.businesses FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to update orders
CREATE POLICY "Admins can update all orders"
ON public.orders FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all jobs
CREATE POLICY "Admins can view all jobs"
ON public.jobs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to update all jobs
CREATE POLICY "Admins can update all jobs"  
ON public.jobs FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Allow customers to update their orders (for confirmation)
CREATE POLICY "Customers can update their orders"
ON public.orders FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM customers 
  WHERE customers.id = orders.customer_id 
  AND customers.user_id = auth.uid()
));

-- Allow admins to insert notifications (for system alerts)
CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow service role to insert notifications (for system alerts)
CREATE POLICY "Service can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);