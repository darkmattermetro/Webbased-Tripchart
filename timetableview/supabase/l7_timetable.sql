-- ============================================================================
--  DMRC Line 7 "Time Table View" - online timetable store
--
--  Run this once in the Supabase SQL editor (Dashboard -> SQL -> New query).
--  It creates the table the admin console publishes to and the end-user viewer
--  reads from. The viewer falls back to the data baked into its own file when
--  this table is empty or unreachable, so nothing breaks before you publish.
--
--  One row per published build. Exactly one row may carry is_current = true;
--  the partial unique index enforces that, and l7_publish() swaps the flag and
--  inserts the new build in a single transaction.
-- ============================================================================

create table if not exists public.l7_timetable (
  id            bigint generated always as identity primary key,
  version       text        not null,            -- publisher's stamp, e.g. an ISO timestamp
  source        text,                            -- workbook sheet, e.g. 07WDC09_24092026
  valid_for     date,                            -- WEF ("with effect from")
  label         text,                            -- WEEKDAY / SATURDAY / SUNDAY / SPECIAL
  data          jsonb       not null,            -- the L7_DATA document (corridor + trips)
  meta          jsonb       not null default '{}'::jsonb,  -- the L7_META document
  is_current    boolean     not null default false,
  published_by  text,
  created_at    timestamptz not null default now()
);

-- Only one current build. The WHERE clause makes this a partial index, so any
-- number of historical rows (is_current = false) may coexist.
create unique index if not exists l7_timetable_current_idx
  on public.l7_timetable (is_current) where is_current;

create index if not exists l7_timetable_created_idx
  on public.l7_timetable (created_at desc);

-- ----------------------------------------------------------------------------
--  Row level security
--
--  NOTE ON THE MODEL. This app authenticates its operators in the browser
--  (password_hash in public.profiles) while talking to Supabase with the public
--  anon key, so auth.uid() is always null here and SQL cannot tell an admin from
--  a visitor. Writes are therefore gated by the application (the Time Table tab
--  is admin-only and the console has its own passphrase), not by Postgres.
--
--  That matches the existing tables in this project, but it does mean anyone
--  holding the anon key can write to this table. The real fix is to move the
--  login to Supabase Auth and replace the write policy below with
--      using (exists (select 1 from public.profiles p
--                     where p.emp_id = auth.uid()::text
--                       and lower(p.access_level) = 'admin'))
-- ----------------------------------------------------------------------------
alter table public.l7_timetable enable row level security;

drop policy if exists l7_read  on public.l7_timetable;
drop policy if exists l7_write on public.l7_timetable;

create policy l7_read on public.l7_timetable
  for select using (true);

create policy l7_write on public.l7_timetable
  for all using (true) with check (true);

-- ----------------------------------------------------------------------------
--  l7_publish(): clear the current flag, then insert the new build as current.
--  Called by the admin console as POST /rest/v1/rpc/l7_publish.
-- ----------------------------------------------------------------------------
create or replace function public.l7_publish(
  p_version   text,
  p_source    text,
  p_valid_for date,
  p_label     text,
  p_data      jsonb,
  p_meta      jsonb,
  p_by        text default null
) returns bigint
language plpgsql
as $$
declare
  v_id bigint;
begin
  if p_data is null then
    raise exception 'l7_publish: p_data is required';
  end if;

  update public.l7_timetable set is_current = false where is_current;

  insert into public.l7_timetable
    (version, source, valid_for, label, data, meta, is_current, published_by)
  values
    (p_version, p_source, p_valid_for, p_label, p_data,
     coalesce(p_meta, '{}'::jsonb), true, p_by)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function
  public.l7_publish(text, text, date, text, jsonb, jsonb, text)
  to anon, authenticated;

-- ----------------------------------------------------------------------------
--  Handy after publishing:
--
--    select id, version, label, valid_for, is_current, created_at
--    from public.l7_timetable order by created_at desc;
--
--  Roll back to an earlier build:
--
--    update public.l7_timetable set is_current = (id = 3);
-- ----------------------------------------------------------------------------
