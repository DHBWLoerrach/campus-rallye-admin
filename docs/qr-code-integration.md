# QR-Code Integration für die Campus Rallye App

## Übersicht

Der Fragetyp `qr_code` ermöglicht standortbasierte Fragen. Teams scannen einen physischen QR-Code an einem bestimmten Ort, um die Frage zu beantworten.

**Ablauf:**
1. Admin erstellt eine Frage vom Typ `qr_code` mit Beschreibung des Ortes
2. System generiert automatisch einen eindeutigen QR-Code
3. Admin druckt den QR-Code und hängt ihn am Zielort auf
4. Teams scannen den QR-Code mit der App

## QR-Code-Datenformat

Der QR-Code enthält einen JSON-String:

```json
{
  "type": "campus-rallye-qr",
  "question_id": 123,
  "code": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `type` | `string` | Immer `"campus-rallye-qr"` – identifiziert gültige Rallye-QR-Codes |
| `question_id` | `number` | ID der zugehörigen Frage |
| `code` | `string` | Eindeutige UUID, wird bei jeder Regenerierung neu erstellt |

## Datenbank

Der QR-Code-Inhalt wird in der `answers`-Tabelle gespeichert:

```sql
SELECT id, question_id, text, qr_generated_at
FROM answers
WHERE question_id = <frage_id>;
```

- `text`: JSON-String des QR-Codes
- `qr_generated_at`: Timestamp der letzten QR-Code-Generierung

## Verifizierung eines gescannten QR-Codes

```typescript
async function handleQRScan(scannedData: string): Promise<ScanResult> {
  // 1. JSON parsen
  const qrData = JSON.parse(scannedData);

  // 2. Typ prüfen
  if (qrData.type !== 'campus-rallye-qr') {
    return { valid: false, error: 'Kein gültiger Campus Rallye QR-Code' };
  }

  // 3. Gegen Datenbank verifizieren
  const { data: question } = await supabase
    .from('questions')
    .select('id, content, type, hint, answers(text)')
    .eq('id', qrData.question_id)
    .eq('type', 'qr_code')
    .single();

  if (!question) {
    return { valid: false, error: 'Frage nicht gefunden' };
  }

  // 4. Code verifizieren
  const storedQR = JSON.parse(question.answers[0].text);
  if (storedQR.code !== qrData.code) {
    return { valid: false, error: 'QR-Code ist veraltet' };
  }

  return { valid: true, question };
}
```

## Fehlerbehandlung

| Szenario | Empfohlene Meldung |
|----------|-------------------|
| Kein JSON | Ungültiger QR-Code |
| Falscher `type` | Kein gültiger Campus Rallye QR-Code |
| Frage nicht gefunden | Frage nicht gefunden oder nicht mehr aktiv |
| Code stimmt nicht überein | QR-Code ist veraltet. Bitte wende dich an den Veranstalter. |
| Bereits beantwortet | Dein Team hat diese Frage bereits beantwortet |

## Hinweise

- **Regenerierung:** Wenn ein Admin den QR-Code neu generiert, werden alle alten Codes ungültig.
- **Rallye-Zugehörigkeit prüfen:** Vor dem Markieren als beantwortet prüfen, ob die Frage zur aktuellen Rallye gehört.
- **Doppelte Antworten:** Prüfen, ob das Team die Frage bereits beantwortet hat.
