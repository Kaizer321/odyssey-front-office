insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

create policy "tenant reads own recordings" on storage.objects
for select to authenticated
using (
  bucket_id = 'recordings'
  and (
    (storage.foldername(name))[1] = (select private.current_client_id())::text
    or (select private.is_admin())
  )
);
