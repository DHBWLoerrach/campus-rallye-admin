# Dateiverwaltung in Supabase einrichten

Wir brauchen zwei sogenannte "Buckets" im Supabase-Storage, um dort Dateien für die App und die Webapp zu verwalten:

- `question-pictures` für Bilder in Rallye-Fragen
- `upload-photos` für Foto-Uploads der Teams einer Rallye

Buckets in Supabase erstellen:

- Auf `Storage` in der linken Seitenleiste navigieren
- Im Bereich `Files` auf den Button `New Bucket` klicken
  - Bei beiden Buckets konfigurieren:
    - `Restrict file size`: 10 MB
    - `Restrict MIME types` einschalten und `image/*` eintragen
  - Bucket 1: `question-pictures` als Name und `Public` **aktivieren**
  - Bucket 2: `Upload-photos` als Name und `Public` **ausschalten**

Nun benötigen wir noch `Row Level Security (RLS)`-Policies für die beiden Buckets.
Dazu zum `SQL Editor` in der linken Seitenleiste navigieren, folgende SQL-Anweisungen einfügen und mit dem `Run`-Button ausführen.

```sql
-- RLS-Policies für question-pictures
-- Nur eingeloggte User dürfen Bilder hochladen (für Webapp)
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'question-pictures');

-- Nur eingeloggte User dürfen Bilder aktualisieren (für Webapp)
CREATE POLICY "Allow authenticated users to update"
ON storage.objects FOR UPDATE
TO authenticated
WITH CHECK (bucket_id = 'question-pictures');

-- Nur eingeloggte User dürfen Bilder löschen (für Webapp)
CREATE POLICY "Allow authenticated users to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'question-pictures');

-- Jeder darf Bilder von Fragen sehen
CREATE POLICY "Anyone can view media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'question-pictures');

-- RLS-Policies für upload-photos
-- App-Benutzer (Teams) dürfen Fotos hochladen
CREATE POLICY "Allow anon uploads"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'upload-photos');

-- Nur eingeloggte User dürfen Fotos ansehen (für Webapp)
CREATE POLICY "Allow authenticated users to view"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'upload-photos');

-- Nur eingeloggte User dürfen Fotos löschen (für Webapp)
CREATE POLICY "Allow authenticated users to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'upload-photos');
```
