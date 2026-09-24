---
status: accepted
---

# Team-Rallyes auf höchstens eine Upload-Frage beschränken

Eine Team-Rallye enthält höchstens eine Upload-Frage und damit höchstens eine Abstimmungsfrage. Gründe: Die Abstimmung ist eine gemeinsame Foto-Runde am Ende, in der der Organisator die Upload-Fotos aus der Admin-App auf eine Projektionsfläche bringt und die Teams in der Rallye-App abstimmen. Eine Runde bleibt ein klarer Abschluss; mehrere Runden hintereinander ziehen den Abschluss in die Länge. Das Ergebnis zeigt genau ein Upload-Foto pro Team, und weniger Upload-Fotos bedeuten weniger personenbezogene Daten.

## Considered Options

- **Mehrere Upload-Fragen erlauben:** Datenbank und Abstimmung werten Stimmen bereits pro Abstimmungsfrage aus. Es fehlt aber ein geführter Ablauf: Alle Abstimmungsfragen sind im Status Abstimmung gleichzeitig offen, sodass Teams zu einer Frage abstimmen können, deren Upload-Fotos noch nicht gezeigt wurden. Das Ergebnis müsste zudem pro Team zwischen mehreren Upload-Fotos wählen.
- **Mehrere Upload-Fragen, aber nur eine Abstimmungsfrage:** Löst die Auswahl des Upload-Fotos im Ergebnis nicht, und Upload-Fragen ohne Abstimmung können ihren Punktwert an kein Team vergeben.

## Consequences

- Die Admin-App verhindert beim Zuordnen und beim Erstellen einer Rallye, dass eine zweite Upload-Frage hinzukommt. Die Datenbank erzwingt die Regel nicht, weil nur die Admin-App Rallye-Fragen schreibt.
- Organisatoren können nicht mehr mehrere Foto-Aufgaben in einer Team-Rallye stellen.
