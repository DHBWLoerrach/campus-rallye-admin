export interface Route {
  href: string;
  label: string;
}

// Rallye Status - Single State Pattern
export const RALLYE_STATUSES = [
  'preparing',
  'inactive',
  'running',
  'voting',
  'ranking',
  'ended',
] as const;

export type RallyeStatus = (typeof RALLYE_STATUSES)[number];

export interface Rallye {
  id: number;
  name: string;
  status: RallyeStatus;
  end_time: string | null;
  password: string;
  created_at: string;
}

export type RallyeOption = Pick<Rallye, 'id' | 'name'>;

// Helper functions for status logic
export const getRallyeStatusLabel = (status: RallyeStatus): string => {
  switch (status) {
    case 'preparing':
      return 'Entwurf';
    case 'running':
      return 'Läuft';
    case 'voting':
      return 'Abstimmung';
    case 'ranking':
      return 'Ranking';
    case 'ended':
      return 'Abgeschlossen';
    case 'inactive':
      return 'Bereit';
    default:
      return 'Unbekannt';
  }
};

export const isRallyeActive = (status: RallyeStatus): boolean =>
  status === 'running';

// Guided phase transitions for the rallye lifecycle. The next action is
// derived from the current status; 'ended' is final (see ADR-0002).
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
    case 'preparing':
      return {
        target: 'inactive',
        actionLabel: 'Vorbereitung abschließen',
        confirmText:
          'Die Rallye ist danach bereit zum Start. Teams können noch nicht beitreten.',
      };
    case 'inactive':
      return {
        target: 'running',
        actionLabel: 'Rallye starten',
        confirmText:
          'Teams können ab jetzt beitreten und die Fragen beantworten.',
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
            target: 'ranking',
            actionLabel: 'Ranking zeigen',
            confirmText:
              'Teams können nicht mehr antworten. Das Ergebnis-Ranking wird sichtbar.',
          };
    case 'voting':
      return {
        target: 'ranking',
        actionLabel: 'Ranking zeigen',
        confirmText:
          'Die Abstimmung wird beendet und das Ergebnis-Ranking sichtbar.',
      };
    case 'ranking':
      return {
        target: 'ended',
        actionLabel: 'Rallye beenden',
        confirmText:
          'Die Rallye wird endgültig abgeschlossen und kann nicht wieder geöffnet werden.',
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
    case 'preparing':
    case 'inactive':
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
