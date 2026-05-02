-- database/migrations/add_delete_account_rpc.sql
--
-- Lets the currently logged-in user permanently delete their own account.
--
-- Safety:
--   * SECURITY DEFINER runs the function with elevated privileges so it can
--     delete from auth.users, BUT we only ever delete auth.uid() — the caller
--     themselves. A malicious user cannot use this to delete anyone else.
--   * REVOKE from public + GRANT only to `authenticated` so anonymous
--     (logged-out) callers can't invoke it.
--   * Because our other tables reference auth.users with ON DELETE CASCADE,
--     deleting the auth user automatically deletes:
--       - user_profiles
--       - binders (and all binder_cards via cascade)
--       - any other per-user tables referencing auth.users
--
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();

  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Deleting from auth.users cascades to user_profiles, binders, binder_cards, etc.
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

-- Only authenticated users may call it. Anonymous callers are blocked.
REVOKE ALL ON FUNCTION public.delete_user_account() FROM public;
REVOKE ALL ON FUNCTION public.delete_user_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
