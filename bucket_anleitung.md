Bucket konfigurieren:
    - Die unten stehende SQL Befehle in Supabase in den SQL Editor ausführen
    - Anschließend zum Storage navigieren
    - Hier sollte der Bucket namens `question-media` zusehen sein
    - diesen bearbeiten und auf `public` setzen, da der Code sonst nicht darauf zugreifen kann

```sql
-- Erstelle den Bucket
insert into storage.buckets (id, name)
values ('question-media', 'question-media');

-- Setze die Policies für den Bucket
create policy "Authenticated users can upload media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'question-media');

create policy "Authenticated users can update media"
on storage.objects for update
to authenticated
with check (bucket_id = 'question-media');

create policy "Authenticated users can delete media"
on storage.objects for delete
to authenticated
using (bucket_id = 'question-media');

create policy "Anyone can view media"
on storage.objects for select
to public
using (bucket_id = 'question-media');

-- das gleiche für upload_photo_answers

-- Erstelle den Bucket
insert into storage.buckets (id, name)
values ('upload_photo_answers', 'upload_photo_answers');

-- Setze die Policies für den Bucket
create policy "Anyone can upload media (upload_photo_answers)"
on storage.objects for insert
to public
with check (bucket_id = 'upload_photo_answers');

create policy "Authenticated users can update media (upload_photo_answers)"
on storage.objects for update
to authenticated
with check (bucket_id = 'upload_photo_answers');

create policy "Authenticated users can delete media (upload_photo_answers)"
on storage.objects for delete
to authenticated
using (bucket_id = 'upload_photo_answers');

create policy "Anyone can view media (upload_photo_answers)"
on storage.objects for select
to public
using (bucket_id = 'upload_photo_answers');
```
