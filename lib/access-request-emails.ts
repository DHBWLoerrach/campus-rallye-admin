/**
 * Contact addresses shown to users whose access is not approved yet,
 * configured as a comma-separated list in ACCESS_REQUEST_EMAILS.
 */
export function getAccessRequestEmails(): string[] {
  return (process.env.ACCESS_REQUEST_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}
