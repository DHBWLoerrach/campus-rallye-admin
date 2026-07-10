export const questionTypes = [
  {
    id: 'knowledge',
    name: 'Wissensfrage',
    action: 'Antwort eingeben',
    description: 'Teams geben eine kurze Lösung als Text ein.',
    example: 'Zum Beispiel: Wo befindet sich die Mensa?',
  },
  {
    id: 'multiple_choice',
    name: 'Multiple Choice',
    action: 'Antwort auswählen',
    description: 'Teams wählen die richtige aus mehreren Antworten.',
    example: 'Zum Beispiel: Welche Fakultät ist hier untergebracht?',
  },
  {
    id: 'picture',
    name: 'Bild',
    action: 'Bild ansehen und antworten',
    description: 'Teams sehen ein Bild und geben die passende Lösung ein.',
    example: 'Zum Beispiel: Welches Gebäude ist abgebildet?',
  },
  {
    id: 'qr_code',
    name: 'QR Code',
    action: 'QR-Code finden',
    description: 'Teams finden einen ausgedruckten QR-Code und scannen ihn.',
    example: 'Zum Beispiel: Finde den Code am Eingang der Bibliothek.',
  },
  {
    id: 'upload',
    name: 'Upload',
    action: 'Foto hochladen',
    description: 'Teams nehmen ein Foto auf und reichen es zur Bewertung ein.',
    example: 'Zum Beispiel: Fotografiert das DHBW-Logo am Eingang.',
  },
];
