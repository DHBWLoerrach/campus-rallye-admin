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
  end_time: string;
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
    case 'voting':
      return 'Abstimmung';
    case 'ranking':
      return 'Ranking';
    case 'ended':
      return 'Beendet';
    case 'inactive':
      return 'Inaktiv';
    default:
      return 'Unbekannt';
  }
};

export const isRallyeActive = (status: RallyeStatus): boolean => status === 'running';

export interface Organization {
  id: number;
  name: string;
  created_at: string;
  default_rallye_id: number | null;
}

export type OrganizationOption = Pick<Organization, 'id' | 'name'>;

export interface Department {
  id: number;
  name: string;
  created_at: string;
  organization_id: number;
}

export type DepartmentOption = Pick<Department, 'id' | 'name'>;
