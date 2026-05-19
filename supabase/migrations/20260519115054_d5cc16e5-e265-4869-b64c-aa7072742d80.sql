ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS birthday_month smallint,
  ADD COLUMN IF NOT EXISTS birthday_day smallint;