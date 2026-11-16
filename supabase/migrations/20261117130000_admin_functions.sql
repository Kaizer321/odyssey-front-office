create or replace function public.admin_client_health()
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(h) order by h.name), '[]'::jsonb)
  from (
    select c.id, c.name, c.trade, c.agent_status, c.job_system,
      (select t.ran_at from public.test_runs t where t.client_id = c.id order by t.ran_at desc limit 1) as last_test_at,
      (select t.passed from public.test_runs t where t.client_id = c.id order by t.ran_at desc limit 1) as last_test_passed,
      (select t.details from public.test_runs t where t.client_id = c.id order by t.ran_at desc limit 1) as last_test_details,
      (select count(*) from public.test_runs t where t.client_id = c.id and not t.passed and t.ran_at >= now() - interval '7 days') as failed_tests_7d,
      (select count(*) from public.integration_errors e where e.client_id = c.id and not e.resolved) as open_errors,
      (select max(ca.started_at) from public.calls ca where ca.client_id = c.id) as last_call_at,
      (select count(*) from public.calls ca where ca.client_id = c.id and ca.started_at >= now() - interval '7 days') as calls_7d,
      (select count(*) from public.flags f where f.client_id = c.id and f.status = 'open') as open_flags
    from public.clients c
    where (select private.is_admin())
  ) h
$$;

create or replace function public.admin_add_weekly_sample(p_count int default 5)
returns int language plpgsql security invoker set search_path = '' as $$
declare n int;
begin
  if not (select private.is_admin()) then raise exception 'admin only'; end if;
  with picked as (
    select c.id, c.client_id from public.calls c join public.enquiries e on e.id = c.enquiry_id
    where c.started_at >= now() - interval '7 days' and e.category <> 'spam'
      and not exists (select 1 from public.flags f where f.call_id = c.id)
    order by random() limit p_count
  ), ins as (
    insert into public.flags (client_id, call_id, source, status)
    select client_id, id, 'random_sample', 'open' from picked returning 1
  ) select count(*) into n from ins;
  return n;
end
$$;

revoke execute on function public.admin_client_health() from public, anon;
revoke execute on function public.admin_add_weekly_sample(int) from public, anon;
grant execute on function public.admin_client_health() to authenticated;
grant execute on function public.admin_add_weekly_sample(int) to authenticated;
