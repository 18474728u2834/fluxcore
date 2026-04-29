REVOKE EXECUTE ON FUNCTION public.claim_premium_grant(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.apply_grant_to_workspace(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_premium_grant(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_grant_to_workspace(uuid, uuid) TO authenticated;