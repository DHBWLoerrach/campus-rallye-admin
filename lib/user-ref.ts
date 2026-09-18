const UUID_PATTERN =
  /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function getUserRef(userId: string | null | undefined): string | null {
  if (!userId || !UUID_PATTERN.test(userId)) return null;
  return userId.replaceAll('-', '').slice(0, 8).toLowerCase();
}
