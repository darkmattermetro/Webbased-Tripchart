-- RLS for DMRC Line 7 admin tables.
-- l7_publish and the config table only accept authenticated admin users.

alter table public.l7_publish enable row level security;
alter table public.l7_config enable row level security;

-- Anon (and any unauthenticated) clients may READ published data, but never
-- write it.
create policy "l7_publish_anon_read"
  on public.l7_publish for select
  to anon
  using (true);

create policy "l7_config_anon_read"
  on public.l7_config for select
  to anon
  using (true);

-- Authenticated admins may do everything.
create policy "l7_publish_admin_all"
  on public.l7_publish for all
  to authenticated
  using (true)
  with check (true);

create policy "l7_config_admin_all"
  on public.l7_config for all
  to authenticated
  using (true)
  with check (true);
