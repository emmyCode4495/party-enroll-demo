import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Member = {
  id?: string;
  membership_id: string;
  full_name: string;
  dob: string;
  id_number: string;
  phone: string;
  email: string;
  address: string;
  gender: string;
  state: string | null;
  match_score: string;
  distance: number;
  verified: boolean;
  registered_at: string;
  created_at?: string;
};
