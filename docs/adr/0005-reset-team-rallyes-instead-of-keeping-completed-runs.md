---
status: accepted
---

# Team-Rallyes zurücksetzen statt abgeschlossene Durchläufe aufzubewahren

Eine Team-Rallye kann zurückgesetzt werden: Alle Durchlaufdaten (Teams, Spielzeiten, Team-Antworten, Upload-Fotos, Stimmen der Abstimmung) werden endgültig gelöscht, die Rallye kehrt mit ihren Rallye-Fragen in den Status Entwurf zurück, Rallye-Code und Rallye-Ende werden geleert. Das löst ADR-0002 ab. Gründe: Dieselbe Rallye soll wiederholt gespielt werden, Testläufe der Organisatoren sollen sich verwerfen lassen, und nach dem Event sollen personenbezogene Daten wie Fotos nicht liegen bleiben. Ein historischer Endstand hat wenig Wert, weil Rallyes ohne Preise und ohne Wettbewerb gespielt werden.

## Considered Options

- **Aufbewahren und über Rallye-Vorlagen oder Duplizieren wiederverwenden (ADR-0002):** Bewahrt die Historie, erzeugt aber pro Durchlauf eine neue Rallye mit neuem Rallye-Code und lässt Fotos unbegrenzt liegen. Duplizieren (`duplicateRallye`) bleibt als eigene Funktion bestehen, ist aber nicht der Weg zur Wiederholung.

## Consequences

- Zurücksetzen ist in jedem Team-Rallye-Status außer Entwurf möglich, auch während Läuft und Abstimmung (für Testläufe), dort mit verschärfter Bestätigung.
- Campus-Touren haben keine Durchlaufdaten und können nicht zurückgesetzt werden.
- Rallye-Sitzungen in der Rallye-App können danach auf ein nicht mehr existierendes Team verweisen; die Rallye-App muss damit umgehen.
