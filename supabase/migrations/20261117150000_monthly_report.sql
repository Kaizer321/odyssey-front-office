create table public.report_notes (
  client_id uuid not null references public.clients(id) on delete cascade,
  month date not null,
  changes jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  primary key (client_id, month)
);
alter table public.report_notes enable row level security;
create policy "tenant read notes" on public.report_notes for select to authenticated
  using (client_id = (select private.current_client_id()) or (select private.is_admin()));
create policy "admin manage notes" on public.report_notes for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create or replace function public.report_best_catches(p_start timestamptz, p_end timestamptz, p_limit int default 5, p_client_id uuid default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  from (
    select j.external_job_number as job_number, j.title, j.value, e.contact_name as customer, e.received_at, ca.id as call_id,
      case when e.is_after_hours then 'after_hours' else 'overflow' end as kind
    from public.jobs j join public.enquiries e on e.id = j.enquiry_id left join public.calls ca on ca.enquiry_id = e.id
    where j.client_id = coalesce(p_client_id, (select private.current_client_id())) and j.status = 'completed' and j.value is not null
      and e.received_at >= p_start and e.received_at < p_end and (e.is_after_hours or ca.handling = 'overflow')
    order by j.value desc limit p_limit
  ) t
$$;
revoke execute on function public.report_best_catches(timestamptz, timestamptz, int, uuid) from public, anon;
grant execute on function public.report_best_catches(timestamptz, timestamptz, int, uuid) to authenticated;
