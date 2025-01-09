um supabase auf windows aufzusetzen:
scoop installieren
auf windows:
powershell öffnen
"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
"

[ansonsten https://scoop.sh/ Doku lesen]

dann supabase installieren

auf windows:
"
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
"

[ansonsten https://supabase.com/docs/guides/local-development/cli/getting-started?queryGroups=platform&platform=windows Doku lesen]

Docker Desktop installieren https://docs.docker.com/desktop/

verzeichnis erstellen, etwa "projects/rallye-db"

mit terminal rein mit cd "rallye-db"

ausführen "supabase init"

ausführen "supabase start"

auf windows kann folgender fehler auftreten "https://github.com/supabase/cli/issues/2505"

hierfür in "projects/rallye-db/supabase/config.toml" im abschnitt "[analytics]" enabled auf "false" zu setzen

Datenbankschema in "rallye-db/supabase/migrations/" und seed datei in "rallye-db/supabase/"

ausführen "supabase db reset"
