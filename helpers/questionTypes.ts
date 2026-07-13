export type QuestionTypeIconName =
  | 'text-input'
  | 'list-checks'
  | 'image'
  | 'qr-code'
  | 'camera'
  | 'map-pin';

export const QUESTION_TYPE_IDS = [
  'multiple_choice',
  'knowledge',
  'picture',
  'qr_code',
  'upload',
  'geocaching',
] as const;

export type QuestionTypeId = (typeof QUESTION_TYPE_IDS)[number];
export type GeocachingInputType = 'text' | 'qr';

export interface QuestionTypeDefinition {
  id: QuestionTypeId;
  name: string;
  action: string;
  description: string;
  example: string;
  icon: QuestionTypeIconName;
}

export const questionTypes: readonly QuestionTypeDefinition[] = [
  {
    id: 'knowledge',
    icon: 'text-input',
    name: 'Wissensfrage',
    action: 'Antwort eingeben',
    description: 'Teams geben eine kurze Lösung als Text ein.',
    example: 'Zum Beispiel: Wo befindet sich die Mensa?',
  },
  {
    id: 'multiple_choice',
    icon: 'list-checks',
    name: 'Multiple Choice',
    action: 'Antwort auswählen',
    description: 'Teams wählen die richtige aus mehreren Antworten.',
    example: 'Zum Beispiel: Welche Fakultät ist hier untergebracht?',
  },
  {
    id: 'picture',
    icon: 'image',
    name: 'Bild',
    action: 'Bild ansehen und antworten',
    description: 'Teams sehen ein Bild und geben die passende Lösung ein.',
    example: 'Zum Beispiel: Welches Gebäude ist abgebildet?',
  },
  {
    id: 'qr_code',
    icon: 'qr-code',
    name: 'QR Code',
    action: 'QR-Code finden',
    description: 'Teams finden einen ausgedruckten QR-Code und scannen ihn.',
    example: 'Zum Beispiel: Finde den Code am Eingang der Bibliothek.',
  },
  {
    id: 'upload',
    icon: 'camera',
    name: 'Upload',
    action: 'Foto hochladen',
    description: 'Teams nehmen ein Foto auf und reichen es zur Bewertung ein.',
    example: 'Zum Beispiel: Fotografiert das DHBW-Logo am Eingang.',
  },
  {
    id: 'geocaching',
    icon: 'map-pin',
    name: 'Geocaching-Frage',
    action: 'Zielort finden',
    description:
      'Teilnehmende navigieren zu einem Zielort und lösen dort eine Aufgabe.',
    example: 'Zum Beispiel: Finde den Haupteingang und scanne den QR-Code.',
  },
];
