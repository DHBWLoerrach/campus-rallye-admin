import type { LocalUser } from './db/local-user';

export const PENDING_APPROVAL_PATH = '/pending';

// Admins are always approved so they can never lock themselves out.
export function isApprovedUser(user: LocalUser): boolean {
  return user.admin || user.approved;
}
