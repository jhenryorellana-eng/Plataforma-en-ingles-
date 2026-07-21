import { Prisma } from '@prisma/client';

/**
 * Serializes every transaction that changes or relies on a learner's family
 * authorization. PostgreSQL transaction advisory locks release automatically
 * on commit/rollback and work across API replicas.
 */
export async function lockLearnerPolicy(
  tx: Prisma.TransactionClient,
  learnerId: string,
): Promise<void> {
  await tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`learner-family-policy:v1:${learnerId}`}, 0))`,
  );
}

export async function lockLearnerDailyReward(
  tx: Prisma.TransactionClient,
  learnerId: string,
  dayUtc: Date,
): Promise<void> {
  const day = dayUtc.toISOString().slice(0, 10);
  await tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`learner-daily-reward:v1:${learnerId}:${day}`}, 0))`,
  );
}
