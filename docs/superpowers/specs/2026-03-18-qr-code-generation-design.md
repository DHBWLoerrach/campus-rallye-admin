# QR-Code-Generierung für QR-Code-Fragen

## Summary

Bei Fragen vom Typ `qr_code` soll im Fragen-Formular (Erstellen/Bearbeiten) ein QR-Code aus der Antwort generiert und als PNG heruntergeladen werden können. Die Antwort bleibt Text-Eingabe; der QR-Code wird on-demand per Button erzeugt.

## Requirements

- **Scope:** Nur Fragetyp `qr_code`, eine Antwort pro Frage
- **Trigger:** QR-Code wird erst nach Klick auf „QR-Code generieren“ erzeugt (nicht live)
- **Download:** PNG-Format
- **Erweiterbarkeit:** Architektur soll später SVG-Download ermöglichen

## Design

### 1. UI-Integration

- **Sichtbarkeit:** QR-Bereich nur wenn `formData.type === 'qr_code'`
- **Platzierung:** Direkt unter dem Antwortfeld (analog zu `QuestionImage` bei `picture`)
- **Antwortquelle:** Die erste Antwort (`formData.answers?.[0]?.text`) – bei `qr_code` gibt es nur ein Antwortfeld
- **Inhalt:**
  - Button „QR-Code generieren“ (disabled wenn Antwort leer)
  - Nach Klick: Vorschau des QR-Codes (200×200 px)
  - Button „PNG herunterladen“ (nur sichtbar wenn QR-Code bereits generiert)
- **Auflösung:** Vorschau 200×200 px; Download 400×400 px (für Druck). Beide über Props konfigurierbar (`previewSize`, `downloadSize`, jeweils default 200 bzw. 400)
- **Reset:** Änderung des Antworttexts setzt die Vorschau zurück (QR-Code muss neu generiert werden)

### 2. Technische Umsetzung

- **Bibliothek:** `qrcode.react` (npm)
- **Komponente:** `QuestionQRCode.tsx` – Client Component (`"use client"`)
  - Props: `answerText: string`, optional `questionContent?: string` (für Dateiname), optional `previewSize?: number` (default 200), optional `downloadSize?: number` (default 400), optional `questionId?: number` (Fallback für Dateiname)
- **Implementierung:**
  - `QRCodeCanvas` für Vorschau (previewSize) und PNG-Download (downloadSize)
  - `canvas.toDataURL('image/png')` für Download
  - **Error Correction Level:** `M` (Medium) – robuster für gedruckte QR-Codes bei Campus-Rallye (draußen, Abnutzung)
  - **Encoding:** UTF-8 – qrcode.react kodiert Sonderzeichen/Umlaute korrekt, keine Sonderbehandlung nötig
  - Struktur so, dass später `QRCodeSVG` für SVG-Download ergänzt werden kann
- **Dateiname:** Benutzerfreundlich aus dem Fragetext ableiten (z.B. slugify der ersten ~50 Zeichen von `content`), Fallback: `questionId`, sonst Timestamp. Beispiel: `qr-code-campus-bibliothek-eingang.png` statt `qr-code-174231...png`

### 3. Validierung

- Bestehende Validierung bleibt: Bei `qr_code` muss mindestens eine Antwort mit Text vorhanden sein
- Keine zusätzlichen Regeln

### 4. Fehlerbehandlung

- Leerer Text: Button „QR-Code generieren“ disabled
- Keine hart codierte Längengrenze: Generierung versuchen; bei Fehlschlag (z.B. Kapazitätsüberschreitung) Fehlermeldung „Text zu lang für QR-Code“ anzeigen. Die tatsächliche QR-Kapazität hängt von Inhalt und Fehlerkorrektur ab

### 5. Dateistruktur

```
components/questions/id/
  QuestionForm.tsx      # Einbindung von QuestionQRCode bei type === 'qr_code'
  QuestionQRCode.tsx    # Neue Komponente (Client Component)
```

## Out of Scope (this iteration)

- SVG-Download (später ergänzbar)
- Speicherung des QR-Codes in Supabase Storage
