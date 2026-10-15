# New Patriotic Party — Realtime Member Enrolment (Next.js 16 + Supabase)

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


## Branding

- Colours: red / white / blue tokens live at the top of `src/app/globals.css` (`--blue`, `--red`).
- Font: Lato Light (300), loaded in `src/app/layout.tsx`.
- Logo: place the official logo at `public/npp-logo.png`. It is used in the headers, on the membership card and in the PDF card. Until it exists, a simple "NPP" tile is shown instead.

## Add to Apple Wallet / Google Wallet

After enrolling (and later on the dashboard) members see an **Add to Apple Wallet** button on iPhones and **Add to Google Wallet** on Android phones; on a computer they see whichever you have set up. A button only appears once its settings below are filled in (copy `.env.example` to `.env.local`, or add them in your hosting dashboard). The pass shows the member's name, Member ID, state and join date with a QR code that opens their `/verify` page. It never includes the ID number or date of birth.

### Apple Wallet (needs a paid Apple Developer account)
1. In the Apple Developer portal create a **Pass Type ID** (for example `pass.org.yourparty.membership`) and a certificate for it, then export the certificate and private key as `.pem` files (`openssl pkcs12 -in cert.p12 -nodes -out signer.pem` gives both).
2. Download Apple's **WWDR** intermediate certificate and convert it to `.pem`.
3. Set `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_WWDR_CERT`, `APPLE_SIGNER_CERT`, `APPLE_SIGNER_KEY` (plus `APPLE_SIGNER_KEY_PASSPHRASE` if the key has one) and `WALLET_LINK_SECRET` (any long random string). Certificates can be pasted as PEM text or as base64 of the file.

### Google Wallet (free)
1. Create an issuer account in the [Google Pay & Wallet Console](https://pay.google.com/business/console) and note the **Issuer ID**.
2. In Google Cloud, create a service account, enable the **Google Wallet API**, create a JSON key, and add the service account's email as a user in the Wallet console.
3. Set `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_WALLET_PRIVATE_KEY` (the `private_key` from the JSON key).
4. Passes work in demo mode until your issuer account is approved for production. The logo only shows on a public `https` site, not on localhost.

Set `NEXT_PUBLIC_APP_URL` to your site's public address so the QR code points to the right place.
