# Everfresh Water

Sales & reconciliation system for a water vending machine shop that also runs
bottled water and an M-Pesa agent line.

## Three money lines, one system

1. **Water sales** (`daily_records`) &mdash; machine reading vs cash + M-Pesa
   (Pochi la Biashara) + debt collected. Debt counts as revenue immediately;
   the deficit only flags genuinely unexplained loss.
2. **M-Pesa agent** (`mpesa_agent_records`) &mdash; a separate cash-in/cash-out
   business with its own float. Buying water stock with M-Pesa money
   automatically shows up as a deduction from that day's float in M-Pesa
   History (via `water_purchases.paid_from = 'mpesa'`).
3. **Bottled water** (`bottle_transactions`) &mdash; a separate product line
   with its own stock count.

Debts (`debts` table) are a **follow-up ledger only**. The money is already
counted as revenue the day it's earned; marking a debt "paid" just tracks
that it was collected later.

## Local setup

```
cd backend
npm install
cp .env.example .env
npm run dev          # http://localhost:4000

cd ../frontend
npm install
npm run dev           # http://localhost:5173
```

Default login PINs (placeholder auth &mdash; change before real use):
Owner/admin: `2580`, Attendant: `1234`.

## What's next, to actually host this

1. **Authentication** &mdash; replace the placeholder PIN gate with real
   PIN verification against `users.pin` (hash the PINs with bcrypt), and a
   short-lived session/JWT so the API routes can enforce
   attendant-vs-admin permissions (right now anyone can hit any endpoint).
2. **Swap SQLite for a hosted database.** SQLite is a single file on disk
   &mdash; fine for local development, but most hosting platforms (Render,
   Railway, Fly.io) either wipe the filesystem on redeploy or don't give you
   persistent disk on the free tier. Move to a small hosted Postgres
   (Railway/Render/Supabase all have free tiers) before deploying, or use a
   host with a persistent volume if you want to keep SQLite.
3. **Deploy the backend** to Render/Railway/Fly.io: point it at your Postgres
   URL, set `PORT` from the platform's env var, and add CORS restricted to
   your real frontend domain instead of `*`.
4. **Deploy the frontend** to Vercel/Netlify: set the API base URL
   (currently hardcoded to `http://localhost:4000` in `src/api.js`) to an
   environment variable pointing at your deployed backend URL.
5. **Backups** &mdash; once on Postgres, turn on your host's automatic daily
   backups; this is the shop's financial record.
6. **Input validation & audit trail** &mdash; who edited/deleted a record and
   when (an `edited_by`/`edited_at` column, or a simple audit log table),
   since this is money-tracking software.

Steps 1 and 2 are the two blockers before this should go anywhere near a
public URL - everything else can follow after.
