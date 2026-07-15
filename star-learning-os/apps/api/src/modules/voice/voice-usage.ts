import type { PrismaClient, Prisma } from '@prisma/client';

/** Lunes 00:00 UTC de la semana actual (ciclo semanal de cuota de voz). */
export function startOfIsoWeekUtc(now: Date = new Date()): Date {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

type Client = PrismaClient | Prisma.TransactionClient;

/** Solo cuenta tiempo activo (COM-04: no se cobra espera, caída ni reconexión). */
export async function weeklyVoiceSecondsUsed(client: Client, enrollmentId: string): Promise<number> {
  const aggregate = await client.voiceSession.aggregate({
    where: { enrollmentId, createdAt: { gte: startOfIsoWeekUtc() } },
    _sum: { activeSeconds: true },
  });
  return aggregate._sum.activeSeconds ?? 0;
}

export async function weeklyVoiceMinutesUsed(client: Client, enrollmentId: string): Promise<number> {
  const seconds = await weeklyVoiceSecondsUsed(client, enrollmentId);
  return Math.ceil(seconds / 60);
}
