-- ==============================================================================
-- MIGRATION: BUMP LATEST TERMS VERSION & ENFORCE COMPREHENSIVE PLATFORM CONSENT
-- ==============================================================================

-- Ensure system_config contains latest_terms_version set to 2
INSERT INTO public.system_config (key, value, description)
VALUES (
  'latest_terms_version',
  '2',
  'Version number of the current Terms of Service and Privacy Policy'
)
ON CONFLICT (key) DO UPDATE
SET value = '2',
    updated_at = now();

COMMENT ON TABLE public.system_config IS 'Platform configuration constants and version guards';
