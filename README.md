# Unity Party — Realtime Member Enrolment (Next.js 16 + Supabase)

Modern political party membership registration with **client-side facial recognition** and **Supabase Realtime**.

Every successful registration is saved to Supabase and appears **instantly** on all open Members / Admin views.

## Stack
- Next.js 16.4 (App Router) + React 19
- Tailwind CSS v4
- Supabase (Postgres + Realtime)
- face-api.js (CDN) for biometric matching

## 1. Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run this:

```sql
create table public.members (
  id uuid primary key default gen_random_uuid(),
  membership_id text unique not null,
  full_name text not null,
  dob date not null,
  id_number text not null,
  phone text not null,
  email text not null,
  address text not null,
  gender text not null,
  state text,
  match_score text,
  distance float8,
  verified boolean default true,
  registered_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Enable Realtime
alter publication supabase_realtime add table public.members;

-- Optional: allow public insert/select for demo (tighten later with RLS)
alter table public.members enable row level security;

create policy "Allow public read"
  on public.members for select
  using (true);

create policy "Allow public insert"
  on public.members for insert
  with check (true);

create policy "Allow public delete"
  on public.members for delete
  using (true);
```

3. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` `public` key

## 2. Local Setup

```bash
cp .env.local.example .env.local
# Edit .env.local and paste your Supabase URL + anon key

npm install
npm run dev
```

Open http://localhost:3000

## Features
- Multi-step enrolment with face verification against uploaded ID
- Live camera capture + face landmarks
- Instant save to Supabase on successful verification
- Realtime members list & admin dashboard (updates across browsers/tabs)
- Privacy-first: face processing stays in the browser

## Notes
- For production: add proper RLS policies, authentication, rate limiting, and never expose the service_role key.
- Face matching threshold is 0.55 (editable in EnrolmentWizard.tsx)
