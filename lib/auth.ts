/**
 * Checks if a user is authorized to access the app.
 * A user is authorized if they have the 'staff' role OR their email
 * is in the ALLOWED_EMAILS environment variable.
 */
export function isAuthorizedUser(
  roles: string[],
  email: string | null
): boolean {
  if (roles.includes('staff')) {
    return true;
  }

  if (!email) {
    return false;
  }

  const allowedEmails = process.env.ALLOWED_EMAILS;
  if (!allowedEmails) {
    return false;
  }

  const emailList = allowedEmails.split(',').map((e) => e.trim().toLowerCase());

  return emailList.includes(email.toLowerCase());
}
