create or replace function public.overview_stats(
  p_start timestamptz,
  p_end timestamptz,
  p_client_id uuid default null
)
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with c as (
    select id, timezone, avg_job_value
    from public.clients
    where id = coalesce(p_client_id, (select private.current_client_id()))
  ),
  en as (
    select x.id, x.channel, x.outcome, x.is_after_hours, x.received_at, x.logged_at,
           (x.received_at at time zone c.timezone)::date as local_day
    from public.enquiries x
    join c on c.id = x.client_id
    where x.received_at >= p_start and x.received_at < p_end
  ),
  cl as (
    select ca.answered, ca.handling, en.is_after_hours, en.local_day
    from public.calls ca
    join en on en.id = ca.enquiry_id
  ),
  jb as (
    select j.id
    from public.jobs j
    join en on en.id = j.enquiry_id
    where j.status in ('booked', 'in_progress', 'completed')
  ),
  jr as (
    select j.id
    from public.jobs j
    join en on en.id = j.enquiry_id
    left join public.calls ca on ca.enquiry_id = en.id
    where j.status in ('booked', 'in_progress', 'completed')
      and (en.is_after_hours or ca.handling = 'overflow')
  ),
  em as (
    select m.transfer_succeeded
    from public.emergencies m
    join en on en.id = m.enquiry_id
  )
  select jsonb_build_object(
    'calls_total', (select count(*) from cl),
    'calls_answered', (select count(*) from cl where answered),
    'enquiries', (select count(*) from en),
    'jobs_booked', (select count(*) from jb),
    'after_hours_calls', (select count(*) from cl where is_after_hours),
    'emergencies', (select count(*) from em),
    'emergencies_ok', (select count(*) from em where transfer_succeeded),
    'avg_time_to_log_seconds', (select round(avg(extract(epoch from (logged_at - received_at)))::numeric, 1) from en where logged_at is not null),
    'recovered_jobs', (select count(*) from jr),
    'avg_job_value', (select avg_job_value from c),
    'value_recovered', (select count(*) from jr) * coalesce((select avg_job_value from c), 0),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', d.local_day, 'business', d.b, 'after_hours', d.a) order by d.local_day) from (select local_day, count(*) filter (where not is_after_hours) as b, count(*) filter (where is_after_hours) as a from cl group by local_day) d), '[]'::jsonb),
    'by_channel', coalesce((select jsonb_agg(jsonb_build_object('channel', t.channel, 'count', t.n)) from (select channel, count(*) as n from en group by channel) t), '[]'::jsonb),
    'outcomes', coalesce((select jsonb_agg(jsonb_build_object('outcome', t.outcome, 'count', t.n) order by t.n desc) from (select outcome, count(*) as n from en group by outcome) t), '[]'::jsonb)
  )
$$;

revoke execute on function public.overview_stats(timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.overview_stats(timestamptz, timestamptz, uuid) to authenticated;
