create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.current_client_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select client_id from public.profiles where id = (select auth.uid())
$$;

create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
$$;

grant execute on function private.current_client_id() to authenticated;
grant execute on function private.is_admin() to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'clients','profiles','customers','enquiries','calls','jobs','emergencies',
    'post_call_events','flags','usage_daily','test_runs','integration_errors',
    'onboarding_phases'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'customers','enquiries','calls','jobs','emergencies','post_call_events'
  ] loop
    execute format(
      'create policy "tenant read" on public.%I for select to authenticated
       using (client_id = (select private.current_client_id())
              or (select private.is_admin()))', t);
  end loop;
end $$;

create policy "own client read" on public.clients for select to authenticated
  using (id = (select private.current_client_id()) or (select private.is_admin()));

create policy "own profile read" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy "tenant read flags" on public.flags for select to authenticated
  using (client_id = (select private.current_client_id()) or (select private.is_admin()));

create policy "client create flag" on public.flags for insert to authenticated
  with check (
    client_id = (select private.current_client_id())
    and flagged_by = (select auth.uid())
    and source = 'client'
  );

create policy "admin manage flags" on public.flags for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

do $$
declare t text;
begin
  foreach t in array array[
    'usage_daily','test_runs','integration_errors','onboarding_phases'
  ] loop
    execute format(
      'create policy "admin only" on public.%I for all to authenticated
       using ((select private.is_admin())) with check ((select private.is_admin()))', t);
  end loop;
end $$;
