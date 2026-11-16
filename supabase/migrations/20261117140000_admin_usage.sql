create or replace function public.admin_usage(p_start date, p_end date)
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(u) order by u.name), '[]'::jsonb)
  from (
    select c.id, c.name, c.trade, c.monthly_fee, c.agent_status,
      coalesce(sum(d.retell_minutes), 0) as minutes,
      coalesce(sum(d.sms_count), 0) as sms,
      coalesce(sum(d.cost), 0) as cost
    from public.clients c
    left join public.usage_daily d on d.client_id = c.id and d.day >= p_start and d.day < p_end
    where (select private.is_admin())
    group by c.id
  ) u
$$;

revoke execute on function public.admin_usage(date, date) from public, anon;
grant execute on function public.admin_usage(date, date) to authenticated;
