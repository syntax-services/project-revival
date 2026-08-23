# System Architecture & Design Decisions

## 1. System Overview
**String** is a campus marketplace platform operating an escrow and service-matching ecosystem across student merchants and customers.

## 2. Directory & Component Architecture
```text
src/
├── components/
│   ├── admin/tabs/          # Modular tab panels for StringAdmin operations
│   ├── business/settings/   # Modular merchant profile & wallet settings
│   ├── checkout/            # Delivery matrix, order summaries, dynamic virtual account modal
│   ├── customer/profile/    # Customer profile, wallet, and identity verification sections
│   ├── location/            # Structured campus location pickers and landmark components
│   ├── messages/            # Chat bubbles, conversation lists, voice note audio player
│   └── ui/                  # Shadcn UI primitive design components
├── contexts/                # AuthContext & global providers
├── hooks/                   # Custom business logic hooks (useCart, useSmartMatching, etc.)
├── integrations/supabase/   # Typed Supabase client and schema bindings
├── lib/                     # Image optimizer, distance estimators, audio signals, utilities
└── pages/                   # Route-level views (admin, business, customer, public)
```

## 3. Security & Transaction Integrity
- **Escrow Settlement**: Squad GTCO payment gateway integration with dynamic virtual accounts and card payments.
- **Identity Hardening**: Level 2 Didit verification (NIN/BVN) required for delivery orders and bank payouts.
- **Database Safety**: Parameterized queries and PostgreSQL RPCs (`pay_with_wallet`, keep-alive cron) for financial integrity.
- **Zero-Bug Verification**: Automated TypeScript validation (`tsc --noEmit`) and Vitest test coverage for all core services.
