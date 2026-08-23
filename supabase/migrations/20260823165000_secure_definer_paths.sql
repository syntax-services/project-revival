-- ==============================================================================
-- SECURITY HARDENING: ADD SEARCH_PATH TO TRIGGERS
-- ==============================================================================
-- Prevents Search Path Injection vulnerabilities in SECURITY DEFINER functions.

BEGIN;

CREATE OR REPLACE FUNCTION public.notify_order_status_change() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$ 
DECLARE 
  v_user_id UUID; 
BEGIN 
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN 
    SELECT user_id INTO v_user_id FROM public.customers WHERE id = NEW.customer_id; 
    IF v_user_id IS NOT NULL THEN 
      INSERT INTO public.notifications (user_id, type, title, message, data) 
      VALUES (
        v_user_id, 
        'order_status', 
        'Order Update', 
        'Your order #' || substring(NEW.id::text, 1, 8) || ' is now ' || NEW.status || '.', 
        jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
      ); 
    END IF; 
  END IF; 
  RETURN NEW; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.notify_job_status_change() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$ 
DECLARE 
  v_user_id UUID; 
BEGIN 
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN 
    SELECT user_id INTO v_user_id FROM public.customers WHERE id = NEW.customer_id; 
    IF v_user_id IS NOT NULL THEN 
      INSERT INTO public.notifications (user_id, type, title, message, data) 
      VALUES (
        v_user_id, 
        'job_status', 
        'Job Update', 
        'Your job request for ' || COALESCE((SELECT name FROM services WHERE id = NEW.service_id), 'service') || ' is now ' || NEW.status || '.', 
        jsonb_build_object('job_id', NEW.id, 'status', NEW.status)
      ); 
    END IF; 
  END IF; 
  RETURN NEW; 
END; 
$$;

COMMIT;
