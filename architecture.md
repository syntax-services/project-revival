# System Architecture & Design Decisions

## 1. System Overview
**String** is a campus marketplace platform operating an escrow and service-matching ecosystem across student merchants and customers.

## 2. Directory & Component Architecture
```text
src/
├── components/
│   ├── admin/tabs/          # Modular tab panels for StringAdmin operations
│   ├── atoms/               # Pure, stateless atoms (e.g., TikTokIcon)
│   ├── business/
│   │   ├── growth/          # TikTokBoostHub and merchant reach automation
│   │   └── settings/        # Modular merchant profile & wallet settings
│   ├── checkout/            # Delivery matrix, order summaries, dynamic virtual account modal
│   ├── customer/profile/    # Customer profile, wallet, and identity verification sections
│   ├── location/            # Structured campus location pickers and landmark components
│   ├── messages/            # Chat bubbles, conversation lists, voice note audio player
│   └── ui/                  # Shadcn UI primitive design components
├── contexts/                # AuthContext & global providers
├── hooks/                   # Custom business logic hooks (useCart, useSmartMatching, etc.)
├── integrations/supabase/   # Typed Supabase client and schema bindings
├── lib/                     # Image optimizer, distance estimators, audio signals, utilities
├── pages/                   # Route-level views (admin, business, customer, public)
└── types/                   # Centralized TypeScript domain interfaces
```

## 3. TikTok Social Commerce & Auto-Boost Architecture
- **Purpose**: Enables campus merchants to link their TikTok business profiles and automatically feature newly listed goods in video clips with embedded direct store backlinks (`https://www.string.com.ng/product/<id>`).
- **OAuth 2.0 Flow**:
  - Scopes: `user.info.basic`, `video.upload`, `video.publish`.
  - Frontend triggers TikTok authorization with `state=${businessId}` and `redirect_uri=https://www.string.com.ng/callback`.
  - Supabase Edge Function `tiktok-oauth-exchange` performs server-to-server token exchange with client secret safeguarding.
- **Database Schema**:
  - `public.business_tiktok_connections`: Stores encrypted tokens, expiry timestamps, auto-boost preferences, cadence settings, and aggregate view/like counters.
  - `public.tiktok_product_promotions`: Logs published video campaigns with product references, video URLs, backlink URLs, and engagement analytics.
  - Security Definer RPCs: `connect_or_update_business_tiktok` and `disconnect_business_tiktok` enforce caller ownership (`user_id = auth.uid() OR owner_id = auth.uid()`).
- **UI System**:
  - Deep Monochrome (`#0A0A0A`) with Liquid Glass surface (`backdrop-blur-xl`, `border-white/10`).
  - Tactile states, animated status pills, performance bento grid, and campaign tables.

## 4. Security & Transaction Integrity
- **Escrow Settlement**: Squad GTCO payment gateway integration with dynamic virtual accounts and card payments.
- **Identity Hardening**: Level 2 Didit verification (NIN/BVN) required for delivery orders and bank payouts.
- **Database Safety**: Parameterized queries and PostgreSQL RPCs (`pay_with_wallet`, keep-alive cron) for financial integrity.
- **Zero-Bug Verification**: Automated TypeScript validation (`tsc --noEmit`) and Vitest test coverage for all core services.
