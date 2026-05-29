
ALTER TABLE public.partner_portals
  ADD COLUMN IF NOT EXISTS use_hyra_ui boolean NOT NULL DEFAULT false;

-- Seed portals for the three existing partner workspaces (idempotent on subdomain).
INSERT INTO public.partner_portals (subdomain, workspace_id, name, tagline, accent_color, use_hyra_ui, status, created_by, links)
VALUES
  ('bargains', 'b4de7ffa-81e6-4d05-8e9d-8ce0a4904630', 'Bloxy Bargains', 'The Roblox marketplace community', '#06b6d4', true, 'active', 'edf6b944-6341-4870-9e45-34e462149725', '[]'::jsonb),
  ('shoply',   '9f2c9234-c02f-492b-8121-74324e0df624', 'Shoply Shopping', 'Roblox''s leading Ro-Store', '#10b981', true, 'active', '68cef0a8-b906-42b7-ba60-8f97bcea2055', '[]'::jsonb),
  ('downtown', 'c47e0e07-c5e6-41c5-8519-6ae974b717fb', 'Bloxy Bargains Downtown', 'Downtown district staff portal', '#f59e0b', true, 'active', '5b990bef-4a00-44fa-83e1-3df0c860e86e', '[]'::jsonb),
  ('almore',   'b4de7ffa-81e6-4d05-8e9d-8ce0a4904630', 'Almore', 'Almore staff portal', '#8b5cf6', false, 'active', 'edf6b944-6341-4870-9e45-34e462149725', '[]'::jsonb)
ON CONFLICT (subdomain) DO UPDATE SET use_hyra_ui = EXCLUDED.use_hyra_ui;
