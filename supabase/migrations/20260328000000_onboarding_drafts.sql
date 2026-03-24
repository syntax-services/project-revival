CREATE TABLE public.onboarding_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 4),
    selected_user_type TEXT CHECK (selected_user_type IN ('customer', 'business')),
    draft JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding draft"
ON public.onboarding_drafts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own onboarding draft"
ON public.onboarding_drafts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding draft"
ON public.onboarding_drafts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own onboarding draft"
ON public.onboarding_drafts
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_onboarding_drafts_updated_at
BEFORE UPDATE ON public.onboarding_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
