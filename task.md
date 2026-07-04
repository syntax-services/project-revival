# Checklist - Squad, Verification, and AML

- `[x]` 1. Create SQL Migration (`supabase/migrations/20260701010000_squad_aml_verification.sql`)
- `[x]` 2. NIN/BVN Verification Panels
  - `[x]` Add verification form to `CustomerProfile.tsx` and `CustomerSettings.tsx`.
- `[x]` 3. Verification Blocks & Badges
  - `[x]` Enforce Level 2 block for delivery orders in `Checkout.tsx`.
  - `[x]` Display "Unverified User" badges in `CustomerMessages.tsx` and `BusinessMessages.tsx`.
- `[x]` 4. Squad Payment Gateway
  - `[x]` Rewrite `initialize-payment` edge function for Squad.
  - `[x]` Create `squad-webhook` edge function.
- `[x]` 5. Anti-Money Laundering (AML) Controls
  - `[x]` Add deposit-to-spent checks and limit velocity block controls in withdrawal code.
- `[x]` 6. Verification & Compilation
  - `[x]` Run TypeScript type-safety check (Successful, 0 errors).

## Minimalist Wallets, Chat Handshake, and Storage Audit Phase
- `[x]` 1. Delete complete onboarding blockers & CompleteOnboarding page
- `[x]` 2. Change Add to Cart features to Contact Business Owner direct chat
- `[x]` 3. Design minimalist in-app wallets for shopper & business settings
- `[x]` 4. Secure Didit identity verification on customer profile
- `[x]` 5. Audit storage buckets and deploy unrestricted RLS policies
- `[x]` 6. Verify project-wide TypeScript safety & build correctness
