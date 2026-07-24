import { createHmac, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppError } from './errors';

export interface LocalRateLimitPolicy {
  windowMs: number;
  maxPerIp: number;
  maxPerIdentifier: number;
}

export const AUTH_RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, maxPerIp: 30, maxPerIdentifier: 10 },
  registration: { windowMs: 60 * 60 * 1000, maxPerIp: 12, maxPerIdentifier: 5 },
  recovery: { windowMs: 60 * 60 * 1000, maxPerIp: 20, maxPerIdentifier: 5 },
  passwordReset: { windowMs: 15 * 60 * 1000, maxPerIp: 20, maxPerIdentifier: 5 },
  familyCode: { windowMs: 15 * 60 * 1000, maxPerIp: 20, maxPerIdentifier: 8 },
} as const satisfies Record<string, LocalRateLimitPolicy>;

export const PUBLIC_RATE_LIMITS = {
  /** Máximo tres muestras por IP al día; en producción se complementa en el gateway. */
  voiceDemo: { windowMs: 24 * 60 * 60 * 1000, maxPerIp: 3, maxPerIdentifier: 3 },
} as const satisfies Record<string, LocalRateLimitPolicy>;

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_BUCKETS = 20_000;

/**
 * Defensa local y sin dependencias para una sola instancia. No sustituye un
 * limitador distribuido en el edge/gateway cuando hay varias réplicas.
 */
@Injectable()
export class LocalRateLimitService {
  private readonly buckets = new Map<string, Bucket>();
  private readonly hmacKey = randomBytes(32);

  assertAllowed(
    scope: string,
    ip: string,
    identifier: string,
    policy: LocalRateLimitPolicy,
    now = Date.now(),
  ): void {
    this.pruneIfNeeded(now);
    const dimensions = [
      { key: this.key(scope, 'ip', normalize(ip)), maximum: policy.maxPerIp },
      { key: this.key(scope, 'identifier', normalize(identifier)), maximum: policy.maxPerIdentifier },
    ];
    const states = dimensions.map(({ key, maximum }) => {
      const current = this.buckets.get(key);
      const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + policy.windowMs } : current;
      return { key, maximum, bucket };
    });

    const blocked = states.filter(({ bucket, maximum }) => bucket.count >= maximum);
    if (blocked.length > 0) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(Math.max(...blocked.map(({ bucket }) => bucket.resetAt - now)) / 1000),
      );
      throw new AppError('RATE_LIMITED', 429, 'Demasiados intentos. Intenta de nuevo más tarde.', {
        retryAfterSeconds,
      });
    }

    for (const { key, bucket } of states) {
      this.buckets.set(key, { count: bucket.count + 1, resetAt: bucket.resetAt });
    }
  }

  private key(scope: string, dimension: string, value: string): string {
    const digest = createHmac('sha256', this.hmacKey)
      .update(scope)
      .update('\0')
      .update(dimension)
      .update('\0')
      .update(value)
      .digest('hex');
    return `${scope}:${dimension}:${digest}`;
  }

  private pruneIfNeeded(now: number): void {
    if (this.buckets.size < MAX_BUCKETS) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    while (this.buckets.size >= MAX_BUCKETS) {
      const oldest = this.buckets.keys().next().value as string | undefined;
      if (!oldest) break;
      this.buckets.delete(oldest);
    }
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase() || 'unknown';
}
