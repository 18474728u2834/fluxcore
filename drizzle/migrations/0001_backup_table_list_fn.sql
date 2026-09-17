CREATE OR REPLACE FUNCTION public.list_backup_tables()
RETURNS TABLE(table_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.relname::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname <> 'backup_runs'
  ORDER BY 1
$$;

REVOKE ALL ON FUNCTION public.list_backup_tables() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_backup_tables() TO service_role;