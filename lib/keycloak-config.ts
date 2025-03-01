import { env } from 'process';

// additional infos can be found in "https://auth.dhbw-loerrach.de/realms/dhbw/.well-known/openid-configuration"

const isDevelopment = process.env.NODE_ENV === 'development';
// TODO: Change to production URL
const baseUrl = 'http://localhost:3000';

export const KEYCLOAK_CONFIG = {
  baseUrl: 'https://auth.dhbw-loerrach.de/realms/dhbw',
  authUrl: 'https://auth.dhbw-loerrach.de/realms/dhbw/protocol/openid-connect/auth',
  tokenUrl: 'https://auth.dhbw-loerrach.de/realms/dhbw/protocol/openid-connect/token',
  clientId: 'campusrally',
  clientSecret: env.KEYCLOAK_CLIENT_SECRET || '',
  redirectUri: `${baseUrl}/login/keycloakCallback`,
  responseType: 'code'
} as const;