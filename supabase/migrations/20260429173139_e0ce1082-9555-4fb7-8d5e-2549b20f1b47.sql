REVOKE ALL ON FUNCTION public.get_accessible_workspaces() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_workspace_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_accessible_workspaces() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_context(uuid) TO authenticated;