# AstroTalk MVP — Setup Guide

Follow these steps in order. Nothing here can be automated from my side — each
step needs your dashboard access.

## 1. Create Supabase Project

1. Go to https://supabase.com/dashboard → **New Project**
2. Choose a name (e.g. `astrotalk-mvp`), a strong DB password (save it), and region closest to India (Mumbai `ap-south-1` if available)
3. Wait for provisioning (~2 min)

## 2. Run the SQL migrations

1. In your new project, go to **SQL Editor**
2. Run these three files **in order**, each as a separate query:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_wallet_functions.sql`
3. Confirm no errors after each run (green success message)

## 3. Get your Supabase keys

1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** → goes in app's `.env` as `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public key** → goes in app's `.env` as `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → **NEVER put this in the app or `.env`**. This only goes into Edge Function secrets (step 5). Treat it like a master password.

## 4. Set up Razorpay (test mode)

1. Go to https://dashboard.razorpay.com → sign up/log in
2. Make sure you're in **Test Mode** (toggle top-right) while developing
3. Go to **Settings → API Keys → Generate Test Key**
4. Copy:
   - **Key ID** (starts with `rzp_test_`) — this is public, safe to put in app config
   - **Key Secret** — **NEVER put this in the app**. Only goes into Edge Function secrets.

## 5. Deploy Edge Functions

You'll need the Supabase CLI installed locally (`npm install -g supabase`).

```bash
cd astrotalk-mvp
supabase login
supabase link --project-ref YOUR_PROJECT_REF   # found in Project Settings → General
```

Set the secrets (these stay server-side, never in git, never in the app):

```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
supabase secrets set RAZORPAY_KEY_SECRET=your_test_key_secret
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected into Edge Functions by Supabase — you don't need to set those manually.

Deploy the functions:

```bash
supabase functions deploy razorpay-create-order
supabase functions deploy razorpay-verify-payment
supabase functions deploy bill-active-sessions
```

## 6. Schedule the billing function

The `bill-active-sessions` function needs to run every minute to charge active chats.

Easiest option — **Supabase Dashboard**:
1. Go to **Edge Functions → bill-active-sessions**
2. Look for **Cron/Schedule** tab (Supabase has been rolling this out — if not visible yet, use the `pg_cron` option below)

**Alternative — `pg_cron` (if dashboard scheduling isn't available on your plan):**

Run this in SQL Editor, replacing the URL and adding your `service_role` key as a header (via **Vault**, not hardcoded):

```sql
select cron.schedule(
  'bill-active-chat-sessions',
  '* * * * *', -- every minute
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/bill-active-sessions',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY')
  );
  $$
);
```

(This requires the `pg_cron` and `pg_net` extensions — enable them under **Database → Extensions** first.)

## 7. Approve your first astrologer (manual, for MVP)

There's no admin panel yet, so approve astrologers directly:

1. Have the astrologer sign up through the app (role = astrologer)
2. In **Table Editor → astrologer_profiles**, find their row
3. Set `is_approved = true`

## 8. Configure the Expo app

```bash
cd astrotalk-mvp
cp .env.example .env
```

Fill in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
```

Then:
```bash
npm install
npx expo start
```

## Security notes — read this before going further

- `service_role` key and Razorpay `Key Secret` must **never** appear in the Expo app, `.env` committed to git, or chat. They only live in Supabase Edge Function secrets.
- `.env` is gitignored — only `.env.example` (no real values) is committed.
- Wallet balance can only change via the `credit_wallet` and `deduct_for_chat_minute` SQL functions, both `security definer` and **not** granted to the `authenticated` role — so a compromised client can't fake a top-up or dodge a charge.
- When you move Razorpay from test mode to live mode, generate live keys and repeat step 4-5 with the live credentials.

## What's deliberately NOT in this MVP

- Voice/video calls
- Admin panel UI (use Table Editor directly for now)
- Kundli generation, horoscopes, matchmaking
- Push notifications
- Astrologer payout automation (you'll need to handle payouts manually or add Razorpay Route/Stripe Connect later)
