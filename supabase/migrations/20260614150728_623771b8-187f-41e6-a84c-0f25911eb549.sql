
-- 1) Remove the hardcoded 'novavoff' staff backdoor — rely solely on staff_admins table
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_admins WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_staff_owner_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_admins
    WHERE user_id = auth.uid() AND role = 'owner_admin'
  );
$$;

-- Defense in depth: forbid users from claiming reserved/staff usernames in verified_users
CREATE OR REPLACE FUNCTION public.verified_users_block_reserved()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.roblox_username IS NOT NULL
     AND lower(NEW.roblox_username) IN ('novavoff') THEN
    -- Allow only if the caller is already a staff admin OR running as service_role
    IF NOT public.is_staff_admin() THEN
      RAISE EXCEPTION 'Reserved roblox_username';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verified_users_block_reserved_ins ON public.verified_users;
CREATE TRIGGER verified_users_block_reserved_ins
BEFORE INSERT OR UPDATE ON public.verified_users
FOR EACH ROW EXECUTE FUNCTION public.verified_users_block_reserved();

-- 2) Restrict premium_grants — only staff can SELECT (claim flow uses SECURITY DEFINER function by token)
DROP POLICY IF EXISTS "Anyone authenticated can view grants" ON public.premium_grants;
-- The existing "Staff manage grants" ALL policy still covers SELECT for staff

-- 3) Restrict feedback_tickets — owner sees their own, staff sees all
DROP POLICY IF EXISTS "Authenticated can view tickets" ON public.feedback_tickets;
CREATE POLICY "Users view their own tickets"
ON public.feedback_tickets FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Staff view all tickets"
ON public.feedback_tickets FOR SELECT TO authenticated
USING (public.is_staff_admin());
CREATE POLICY "Staff manage all tickets"
ON public.feedback_tickets FOR UPDATE TO authenticated
USING (public.is_staff_admin())
WITH CHECK (public.is_staff_admin());

-- 4) Restrict feedback_messages — viewable only to the ticket owner or staff
DROP POLICY IF EXISTS "Authenticated can view messages" ON public.feedback_messages;
CREATE POLICY "Ticket owner views messages"
ON public.feedback_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.feedback_tickets t
    WHERE t.id = feedback_messages.ticket_id
      AND t.user_id = auth.uid()
  )
);
CREATE POLICY "Staff view all messages"
ON public.feedback_messages FOR SELECT TO authenticated
USING (public.is_staff_admin());
CREATE POLICY "Staff can post messages"
ON public.feedback_messages FOR INSERT TO authenticated
WITH CHECK (public.is_staff_admin());
