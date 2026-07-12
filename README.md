# AstroTalk MVP

A minimal, real chat-consultation marketplace: customers browse online astrologers, start a
per-minute-billed chat, and pay via Razorpay wallet top-ups. Astrologers set their own rate,
toggle online/offline, and accept/decline incoming requests.

**➡️ Start with [`SETUP.md`](./SETUP.md) — it has the exact steps to provision Supabase, run the
SQL migrations, configure Razorpay, and deploy the Edge Functions.**

## Stack

- **App**: React Native + Expo (TypeScript)
- **Backend**: Supabase (Postgres + Auth + Realtime + Edge Functions)
- **Payments**: Razorpay (order creation + signature verification via Edge Functions)
- **Navigation**: React Navigation (role-based: customer stack vs astrologer stack)

## What's included

- Full Postgres schema with RLS (`supabase/migrations/`)
- Atomic, race-condition-safe wallet functions — balance changes only happen via
  `security definer` SQL functions, never directly from the client
- Razorpay integration: order creation and payment verification both happen server-side
  (Edge Functions), so a compromised client can never fake a wallet credit
- Per-minute billing via a scheduled Edge Function (`bill-active-sessions`)
- Customer flow: browse astrologers → view profile/reviews → start chat → live wallet deduction
- Astrologer flow: online/offline toggle, incoming request accept/decline, chat, earnings + rate management

## What's deliberately NOT included (see SETUP.md for full list)

- Voice/video calls
- Admin panel UI (use Supabase Table Editor to approve astrologers for now)
- Kundli generation, horoscopes, matchmaking
- Push notifications
- Automated astrologer payouts

## Project structure

```
supabase/
  migrations/        SQL schema, RLS policies, wallet functions — run in order
  functions/         Edge Functions (Razorpay order/verify, per-minute billing)
src/
  screens/customer/   Astrologer list, detail, chat, wallet
  screens/astrologer/ Dashboard (online toggle + requests), earnings
  screens/auth/        Login, sign up (with role selection)
  hooks/                useWallet, useChatSession (realtime)
  contexts/             AuthContext
  navigation/           Role-based navigator
  services/             Supabase client
  types/                Shared TypeScript types
```

## Quick start (after completing SETUP.md)

```bash
npm install
cp .env.example .env   # fill in your Supabase + Razorpay values
npx expo start
```

Scan the QR code with Expo Go, or run on a simulator.
