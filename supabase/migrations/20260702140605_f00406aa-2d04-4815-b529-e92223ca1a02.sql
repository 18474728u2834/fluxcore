-- Auto-link workspace_members.user_id when a Roblox account gets verified.
-- Root cause: cron-sync-staff imports group members with user_id = NULL (they aren't
-- signed in yet). When they later verify via Roblox, nothing was attaching their
-- auth uid to the pre-created member rows, so is_workspace_member() returned false
-- and they couldn't see or open the workspace.

CREATE OR REPLACE FUNCTION public.link_workspace_members_on_verify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.roblox_user_id IS NOT NULL THEN
    UPDATE public.workspace_members
       SET user_id = NEW.user_id,
           roblox_username = COALESCE(NEW.roblox_username, roblox_username),
           verified = true,
           updated_at = now()
     WHERE roblox_user_id = NEW.roblox_user_id
       AND (user_id IS NULL OR user_id <> NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verified_users_link_members ON public.verified_users;
CREATE TRIGGER verified_users_link_members
AFTER INSERT OR UPDATE OF user_id, roblox_user_id ON public.verified_users
FOR EACH ROW EXECUTE FUNCTION public.link_workspace_members_on_verify();

-- Backfill: attach existing verified users to any pre-imported member rows.
UPDATE public.workspace_members wm
   SET user_id = vu.user_id,
       roblox_username = COALESCE(vu.roblox_username, wm.roblox_username),
       verified = true,
       updated_at = now()
  FROM public.verified_users vu
 WHERE wm.roblox_user_id = vu.roblox_user_id
   AND wm.user_id IS NULL
   AND vu.user_id IS NOT NULL;
