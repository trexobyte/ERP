import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getAuthSecret,
  isDevPasswordFallbackAllowed,
  isDemoLoginEnabled,
  getRedisConfig,
  isRedisConfigured,
  DEFAULT_DEV_SECRET,
} from '@/lib/env';

describe('Auth & Environment Security Controls (RB-05)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isDevPasswordFallbackAllowed', () => {
    it('strictly forbids fallback in production even if ALLOW_DEV_PASSWORD_FALLBACK is true', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('ALLOW_DEV_PASSWORD_FALLBACK', 'true');

      expect(isDevPasswordFallbackAllowed()).toBe(false);
    });

    it('forbids fallback in production when flag is not set', () => {
      vi.stubEnv('NODE_ENV', 'production');
      delete process.env.ALLOW_DEV_PASSWORD_FALLBACK;

      expect(isDevPasswordFallbackAllowed()).toBe(false);
    });

    it('forbids fallback in development when flag is not set', () => {
      vi.stubEnv('NODE_ENV', 'development');
      delete process.env.ALLOW_DEV_PASSWORD_FALLBACK;

      expect(isDevPasswordFallbackAllowed()).toBe(false);
    });

    it('forbids fallback in development when flag is set to false', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('ALLOW_DEV_PASSWORD_FALLBACK', 'false');

      expect(isDevPasswordFallbackAllowed()).toBe(false);
    });

    it('permits fallback ONLY in non-production when ALLOW_DEV_PASSWORD_FALLBACK is true', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('ALLOW_DEV_PASSWORD_FALLBACK', 'true');

      expect(isDevPasswordFallbackAllowed()).toBe(true);
    });
  });

  describe('getAuthSecret', () => {
    it('returns custom secret if NEXTAUTH_SECRET is set', () => {
      vi.stubEnv('NEXTAUTH_SECRET', 'my-custom-super-secure-production-secret-12345');
      expect(getAuthSecret()).toBe('my-custom-super-secure-production-secret-12345');
    });

    it('falls back to default dev secret in development when NEXTAUTH_SECRET is unset', () => {
      vi.stubEnv('NODE_ENV', 'development');
      delete process.env.NEXTAUTH_SECRET;

      expect(getAuthSecret()).toBe(DEFAULT_DEV_SECRET);
    });

    it('logs critical security error in production when NEXTAUTH_SECRET is unset', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.stubEnv('NODE_ENV', 'production');
      delete process.env.NEXTAUTH_SECRET;

      const secret = getAuthSecret();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL SECURITY ERROR: NEXTAUTH_SECRET is not defined')
      );
      expect(secret).toBe(DEFAULT_DEV_SECRET);
    });

    it('logs warning in production when known dev secret is used', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXTAUTH_SECRET', DEFAULT_DEV_SECRET);

      getAuthSecret();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY WARNING: Production environment is using a known default')
      );
    });
  });

  describe('isDemoLoginEnabled', () => {
    it('is enabled by default in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      delete process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN;

      expect(isDemoLoginEnabled()).toBe(true);
    });

    it('is disabled in production unless NEXT_PUBLIC_ENABLE_DEMO_LOGIN is true', () => {
      vi.stubEnv('NODE_ENV', 'production');
      delete process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN;

      expect(isDemoLoginEnabled()).toBe(false);
    });

    it('can be explicitly enabled in production with NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_LOGIN', 'true');

      expect(isDemoLoginEnabled()).toBe(true);
    });

    it('can be explicitly disabled in development with NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_LOGIN', 'false');

      expect(isDemoLoginEnabled()).toBe(false);
    });
  });

  describe('Redis Configuration', () => {
    it('reports unconfigured when env variables are missing', () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      expect(isRedisConfigured()).toBe(false);
      expect(getRedisConfig()).toEqual({ url: undefined, token: undefined });
    });

    it('reports configured when both url and token are provided', () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://upstash.example.com');
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'secret-token-abc');

      expect(isRedisConfigured()).toBe(true);
      expect(getRedisConfig()).toEqual({
        url: 'https://upstash.example.com',
        token: 'secret-token-abc',
      });
    });
  });
});
