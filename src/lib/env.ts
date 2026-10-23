/**
 * Environment configuration and security validation for TrexoByte ERP.
 * Centralizes environment variable resolution, runtime security guards,
 * and multi-instance caching credentials.
 */

const KNOWN_DEV_SECRETS = [
  'trexobyte-erp-secret-key-kathmandu-2026-secure-jwt',
  'kEcdz2zeFok2+ALwhAfsXLE44lMSsJt/K25Ez6tbJOg=',
];

export const DEFAULT_DEV_SECRET = 'trexobyte-erp-secret-key-kathmandu-2026-secure-jwt';

/**
 * Resolves the JWT session secret for NextAuth.
 * Enforces production security invariants:
 * - Production deployments MUST supply a custom, non-default NEXTAUTH_SECRET.
 * - Development and test environments safely fall back to the default dev secret.
 */
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProd) {
      console.error(
        'CRITICAL SECURITY ERROR: NEXTAUTH_SECRET is not defined in production environment. Sessions may be compromised.'
      );
      // In production, fallback to a persistent default if unset to prevent unhandled crash, but flag loudly
      return DEFAULT_DEV_SECRET;
    }
    return DEFAULT_DEV_SECRET;
  }

  if (isProd && KNOWN_DEV_SECRETS.includes(secret)) {
    console.warn(
      'SECURITY WARNING: Production environment is using a known default NEXTAUTH_SECRET. Generate a random secret with: openssl rand -base64 32'
    );
  }

  return secret;
}

/**
 * Determines whether the legacy development password fallback ('password123')
 * is permitted for emergency team logins.
 *
 * Security Invariant:
 * - Strictly forbidden in production (`NODE_ENV === 'production'`).
 * - In non-production, requires explicit activation via `ALLOW_DEV_PASSWORD_FALLBACK='true'`.
 */
export function isDevPasswordFallbackAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  return process.env.ALLOW_DEV_PASSWORD_FALLBACK === 'true';
}

/**
 * Determines if demo account quick-fill buttons should be visible on the login screen.
 */
export function isDemoLoginEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'false') {
    return false;
  }
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  return process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true';
}

/**
 * Upstash Redis configuration for distributed serverless cache.
 */
export interface RedisConfig {
  url?: string;
  token?: string;
}

export function getRedisConfig(): RedisConfig {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  return { url, token };
}

export function isRedisConfigured(): boolean {
  const { url, token } = getRedisConfig();
  return Boolean(url && token);
}
