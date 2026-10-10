-- The profile bootstrap function is intended to run from its auth.users trigger, not as a client-callable RPC.
revoke all on function public.handle_new_user() from public, anon, authenticated;
