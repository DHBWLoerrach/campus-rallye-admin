export interface Route {
  href: string;
  label: string;
}

// Team-rallye lifecycle states.
export const RALLYE_STATUSES = [
  'draft',
  'ready',
  'running',
  'voting',
  'results',
  'ended',
] as const;

export type RallyeStatus = (typeof RALLYE_STATUSES)[number];

export interface Rallye {
  id: number;
  name: string;
  status: RallyeStatus;
  rallye_end: string | null;
  rallye_code: string;
  created_at: string;
}

export type RallyeOption = Pick<Rallye, 'id' | 'name'>;

// Helper functions for status logic
export const getRallyeStatusLabel = (status: RallyeStatus): string => {
  switch (status) {
    case 'draft':
      return 'Entwurf';
    case 'running':
      return 'Läuft';
    case 'voting':
      return 'Abstimmung';
    case 'results':
      return 'Ergebnisse';
    case 'ended':
      return 'Abgeschlossen';
    case 'ready':
      return 'Bereit';
    default:
      return 'Unbekannt';
  }
};

export const isRallyeActive = (status: RallyeStatus): boolean =>
  status === 'running';

// Teams can join a team rallye in the Rallye-App while it is ready (lobby) or
// running, so a rallye code is required in these statuses.
export const isRallyeJoinable = (status: RallyeStatus): boolean =>
  status === 'ready' || status === 'running';

// Only a draft has no run data to discard; every other status can be reset
// back to a draft (see ADR-0005).
export const canResetRallye = (status: RallyeStatus): boolean =>
  status !== 'draft';

// Guided phase transitions for the rallye lifecycle. The next action is
// derived from the current status; 'ended' has no further transition and can
// only be reset (see ADR-0005).
export interface RallyeTransition {
  target: RallyeStatus;
  actionLabel: string;
  confirmText: string;
}

export const getNextRallyeTransition = (
  status: RallyeStatus,
  hasVotingQuestions: boolean
): RallyeTransition | null => {
  switch (status) {
    case 'draft':
      return {
        target: 'ready',
        actionLabel: 'Entwurf abschließen',
        confirmText:
          'Die Rallye ist danach in der Rallye-App sichtbar. Teams können mit dem Rallye-Code beitreten, aber noch nicht spielen.',
      };
    case 'ready':
      return {
        target: 'running',
        actionLabel: 'Rallye starten',
        confirmText:
          'Teams können ab jetzt die Fragen beantworten. Weitere Teams können weiterhin beitreten.',
      };
    case 'running':
      return hasVotingQuestions
        ? {
            target: 'voting',
            actionLabel: 'Abstimmung starten',
            confirmText:
              'Teams können nicht mehr antworten und stimmen über die eingereichten Fotos ab.',
          }
        : {
            target: 'results',
            actionLabel: 'Ergebnisse anzeigen',
            confirmText:
              'Teams können nicht mehr antworten. Die Ergebnisse werden sichtbar.',
          };
    case 'voting':
      return {
        target: 'results',
        actionLabel: 'Ergebnisse anzeigen',
        confirmText:
          'Die Abstimmung wird beendet und die Ergebnisse werden sichtbar.',
      };
    case 'results':
      return {
        target: 'ended',
        actionLabel: 'Rallye beenden',
        confirmText:
          'Die Rallye wird abgeschlossen, das Ergebnis bleibt sichtbar. Für einen neuen Durchlauf kann sie in den Einstellungen zurückgesetzt werden.',
      };
    case 'ended':
      return null;
  }
};

// Home-page grouping: three user-facing phase buckets (spec section 2).
export type RallyePhaseGroup = 'live' | 'preparation' | 'done';

export const RALLYE_PHASE_GROUPS: {
  id: RallyePhaseGroup;
  label: string;
}[] = [
  { id: 'live', label: 'Läuft gerade' },
  { id: 'preparation', label: 'In Vorbereitung' },
  { id: 'done', label: 'Abgeschlossen' },
];

export const getRallyePhaseGroup = (status: RallyeStatus): RallyePhaseGroup => {
  switch (status) {
    case 'ended':
      return 'done';
    case 'draft':
    case 'ready':
      return 'preparation';
    default:
      return 'live';
  }
};

export interface Location {
  id: number;
  name: string;
  created_at: string;
  default_rallye_id: number | null;
}

export type LocationOption = Pick<Location, 'id' | 'name'>;

export interface Department {
  id: number;
  name: string;
  created_at: string;
  location_id: number;
}

export type DepartmentOption = Pick<Department, 'id' | 'name'>;
