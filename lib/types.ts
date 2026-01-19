export interface Route {
  href: string;
  label: string;
}

// Rallye Status - Single State Pattern
export type RallyeStatus = 'preparing' | 'inactive' | 'running' | 'voting' | 'ranking' | 'ended';

export interface Rallye {
  id: number;
  name: string;
  status: RallyeStatus;
  end_time: string;
  password: string;
  created_at: string;
  // Verknüpfte Departments (über join_department_rallye)
  departments?: Department[];
}

export interface Organization {
  id: number;
  name: string;
  default_rallye_id: number | null;
  created_at: string;
  // Verknüpfte Departments
  departments?: Department[];
  // Verknüpfte Default-Rallye
  default_rallye?: Rallye | null;
}

export interface Department {
  id: number;
  name: string;
  organization_id: number;
  created_at: string;
  // Verknüpfte Organisation
  organization?: Organization;
  // Verknüpfte Rallyes (über join_department_rallye)
  rallyes?: Rallye[];
}

export interface JoinDepartmentRallye {
  id: number;
  department_id: number;
  rallye_id: number;
  created_at: string;
}

// Helper functions for status logic
export const getRallyeStatusLabel = (status: RallyeStatus): string => {
  switch (status) {
    case 'preparing':
      return 'Vorbereitung';
    case 'inactive':
      return 'Inaktiv';
    case 'running':
      return 'Gestartet';
    case 'voting':
      return 'Abstimmung';
    case 'ranking':
      return 'Auswertung';
    case 'ended':
      return 'Beendet';
    default:
      return 'Unbekannt';
  }
};

export const isRallyeActive = (status: RallyeStatus): boolean => status === 'running';
