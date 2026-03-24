CREATE TABLE public.item_search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    search_term TEXT NOT NULL,
    suggested_item TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'fulfilled', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.item_search_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own item suggestions"
ON public.item_search_suggestions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own item suggestions"
ON public.item_search_suggestions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all item suggestions"
ON public.item_search_suggestions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update item suggestions"
ON public.item_search_suggestions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX item_search_suggestions_created_at_idx
ON public.item_search_suggestions (created_at DESC);

CREATE INDEX item_search_suggestions_status_idx
ON public.item_search_suggestions (status);

CREATE TRIGGER update_item_search_suggestions_updated_at
BEFORE UPDATE ON public.item_search_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
