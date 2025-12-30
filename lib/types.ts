export interface Route {
  href: string;
  label: string;
}

// Rallye Status - Single State Pattern
export type RallyeStatus = 'preparing' | 'running' | 'post_processing' | 'ended' | 'inactive';

export interface Rallye {
  id: number;
  name: string;
  status: RallyeStatus;
  end_time: string;
  studiengang: string;
  password: string;
  created_at: string;
}

export type RallyeOption = Pick<Rallye, 'id' | 'name'>;

// Helper functions for status logic
export const getRallyeStatusLabel = (status: RallyeStatus): string => {
  switch (status) {
    case 'preparing':
      return 'Vorbereitung';
    case 'running':
      return 'Gestartet';
    case 'post_processing':
      return 'Abstimmung';
    case 'ended':
      return 'Beendet';
    case 'inactive':
      return 'Inaktiv';
    default:
      return 'Unbekannt';
  }
};

export const isRallyeActive = (status: RallyeStatus): boolean => status === 'running';
