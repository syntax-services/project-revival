-- Update Order and Job Lifecycles & Notifications
-- This migration ensures the database supports the 'draft' state and automatic customer notifications.

-- 1. Update order_status enum to include 'draft'
-- We have to use a workaround since ALTER TYPE ADD VALUE cannot be run inside a transaction block in some Postgres versions,
-- but Supabase migrations usually allow it.
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending';

-- 2. Create notification function for Orders
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
            NEW.customer_id,
            'order_status',
            'Order Update',
            'Your order #' || substring(NEW.id::text, 1, 8) || ' is now ' || NEW.status || '.',
            jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create notification function for Jobs
CREATE OR REPLACE FUNCTION public.notify_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
            NEW.customer_id,
            'job_status',
            'Job Update',
            'Your job request for ' || (SELECT name FROM services WHERE id = NEW.service_id) || ' is now ' || NEW.status || '.',
            jsonb_build_object('job_id', NEW.id, 'status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create Triggers
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_order_status_change();

DROP TRIGGER IF EXISTS on_job_status_change ON public.jobs;
CREATE TRIGGER on_job_status_change
    AFTER UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_job_status_change();

-- 5. Fix missing columns just in case previous migrations were skipped
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(4,2) DEFAULT 10.0;
ALTER TABLE public.location_requests ADD COLUMN IF NOT EXISTS verified_latitude DOUBLE PRECISION;
ALTER TABLE public.location_requests ADD COLUMN IF NOT EXISTS verified_longitude DOUBLE PRECISION;
ALTER TABLE public.location_requests ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);
