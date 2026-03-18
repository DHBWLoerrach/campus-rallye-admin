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
- **Inhalt:**
  - Button „QR-Code generieren“ (disabled wenn Antwort leer)
  - Nach Klick: Vorschau des QR-Codes (z.B. 200×200 px)
  - Button „PNG herunterladen“ (nur sichtbar wenn QR-Code bereits generiert)
- **Reset:** Änderung des Antworttexts setzt die Vorschau zurück (QR-Code muss neu generiert werden)

### 2. Technische Umsetzung

- **Bibliothek:** `qrcode.react` (npm)
- **Komponente:** `QuestionQRCode.tsx` – Client Component (`"use client"`)
  - Props: `answerText: string`, optional `size?: number`
- **Implementierung:**
  - `QRCodeCanvas` für Vorschau und PNG-Download
  - `canvas.toDataURL('image/png')` für Download
  - Struktur so, dass später `QRCodeSVG` für SVG-Download ergänzt werden kann
- **Dateiname:** z.B. `qr-code-{questionId oder timestamp}.png`

### 3. Validierung

- Bestehende Validierung bleibt: Bei `qr_code` muss mindestens eine Antwort mit Text vorhanden sein
- Keine zusätzlichen Regeln

### 4. Fehlerbehandlung

- Leerer Text: Button „QR-Code generieren“ disabled
- Sehr langer Text (> 2.9 KB): Fehlermeldung „Text zu lang für QR-Code“ anzeigen

### 5. Dateistruktur

```
components/questions/id/
  QuestionForm.tsx      # Einbindung von QuestionQRCode bei type === 'qr_code'
  QuestionQRCode.tsx    # Neue Komponente (Client Component)
```

## Out of Scope (this iteration)

- SVG-Download (später ergänzbar)
- Speicherung des QR-Codes in Supabase Storage
