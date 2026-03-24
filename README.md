# String: Hyper-Local Service & Product Discovery Platform

Welcome to the String Platform codebase. String is a premium, AI-powered matchmaking platform designed to intelligently connect businesses and customers.

## Overview

The platform is designed with scale and performance in mind, using the following stack:

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI
- **Backend & Database**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State Management**: TanStack React Query
- **Routing**: React Router DOM (v6)

## Key Hardened Features

- **Secure Financial Settlement**: Atomic PostgreSQL RPCs for order and job settlement.
- **Unified Fee Model**: Consistent handling of platform fees and commissions across the entire stack.
- **Robust Payment Polling**: Memory-safe and optimized Paystack callback verification.
- **Production-Ready UI**: Unicode-safe currency rendering and data-driven insights.

## Project Structure

```text
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React Contexts (Auth, etc.)
│   ├── hooks/          # Custom hooks for data fetching (Supabase)
│   ├── integrations/   # Supabase client & generated types
│   ├── lib/            # Utility functions
│   └── pages/          # Main application routes
├── supabase/
│   ├── functions/      # Edge Functions (Paystack, etc.)
│   └── migrations/     # Database schema & RPCs
└── public/             # Static assets
```

## Getting Started

1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Environment Variables**
   Create a `.env` file with:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. **Run development server**
   ```bash
   npm run dev
   ```

## Production Verification (Codespaces)

To verify the build, run:
```bash
npm run build
```

To check for linting errors:
```bash
npm run lint
```
