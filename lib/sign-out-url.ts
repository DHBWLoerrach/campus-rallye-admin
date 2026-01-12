export function getSignOutUrl() {
  const isDev = process.env.NODE_ENV === 'development';
  return isDev
    ? 'http://localhost:4181/oauth2/sign_out?rd=http%3A%2F%2Flocalhost%3A3000'
    : '/oauth2/sign_out';
}
