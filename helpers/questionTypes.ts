export type QuestionTypeIconName =
  'text-input' | 'list-checks' | 'image' | 'qr-code' | 'camera' | 'map-pin';

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

/**
 * Whether a question defaults to voting when assigned to a rallye. Upload
 * answers are photos that can only score through the voting phase, so opting
 * in by default closes the trap of an unmarked upload question silently
 * awarding no points. Editors can still deselect voting per rallye question.
 * Only upload questions can ever be voting questions.
 */
export const defaultIsVoting = (type: string | null | undefined): boolean =>
  type === 'upload';

export interface QuestionTypeDefinition {
  id: QuestionTypeId;
  name: string;
  action: string;
  description: string;
  example: string;
  /**
   * What participants see and do below the question text in the Rallye-App,
   * which always shows the question first. Mirrors the
   * question components in CampusRallyeApp/components/rallye/questions/ and
   * must be updated when their flow changes.
   */
  participantFlow: string;
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
    participantFlow:
      'Teilnehmende tippen ihre Antwort ein und haben dafür einen Versuch.',
  },
  {
    id: 'multiple_choice',
    icon: 'list-checks',
    name: 'Multiple Choice',
    action: 'Antwort auswählen',
    description: 'Teams wählen die richtige aus mehreren Antworten.',
    example: 'Zum Beispiel: Welche Fakultät ist hier untergebracht?',
    participantFlow:
      'Teilnehmende wählen eine Lösungsoption und haben dafür einen Versuch. Die Lösungsoptionen erscheinen in zufälliger Reihenfolge.',
  },
  {
    id: 'picture',
    icon: 'image',
    name: 'Bild',
    action: 'Bild ansehen und antworten',
    description: 'Teams sehen ein Bild und geben die passende Lösung ein.',
    example: 'Zum Beispiel: Welches Gebäude ist abgebildet?',
    participantFlow:
      'Das Fragebild. Teilnehmende tippen ihre Antwort ein und haben dafür einen Versuch.',
  },
  {
    id: 'qr_code',
    icon: 'qr-code',
    name: 'QR Code',
    action: 'QR-Code finden',
    description: 'Teams finden einen ausgedruckten QR-Code und scannen ihn.',
    example: 'Zum Beispiel: Finde den Code am Eingang der Bibliothek.',
    participantFlow:
      'Teilnehmende scannen den QR-Code mit der Kamera. Ein falscher QR-Code wird abgelehnt und kann erneut gescannt werden.',
  },
  {
    id: 'upload',
    icon: 'camera',
    name: 'Upload',
    action: 'Foto hochladen',
    description: 'Teams nehmen ein Foto auf und reichen es zur Bewertung ein.',
    example: 'Zum Beispiel: Fotografiert das DHBW-Logo am Eingang.',
    participantFlow:
      'Teilnehmende nehmen ein Foto auf und senden es ab. Team-Punkte gibt es nur über die Abstimmung.',
  },
  {
    id: 'geocaching',
    icon: 'map-pin',
    name: 'Geocaching-Frage',
    action: 'Zielort finden',
    description:
      'Teilnehmende navigieren zu einem Zielort und lösen dort eine Frage.',
    example: 'Zum Beispiel: Finde den Haupteingang und scanne den QR-Code.',
    participantFlow:
      'Ein Kompasspfeil mit Entfernungsanzeige führt zum Zielort. Die Frage ist schon unterwegs sichtbar; antworten können Teilnehmende erst innerhalb des Näherungsbereichs.',
  },
];
