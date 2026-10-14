-- Run once in the Supabase SQL Editor.
-- Lets the sign-in page turn a Member ID into the email of the auth account that owns it,
-- so people can sign in with Member ID + password. Supabase still checks the password.
create or replace function public.login_email_for_member(p_membership_id text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select u.email::text
  from public.members m
  join auth.users u on u.id = m.user_id
  where m.membership_id = upper(trim(p_membership_id))
  limit 1;
$$;

revoke all on function public.login_email_for_member(text) from public;
grant execute on function public.login_email_for_member(text) to anon, authenticated;
