export interface Route {
  href: string;
  label: string;
}

export type FormState = { errors?: { message?: string } } | null;
