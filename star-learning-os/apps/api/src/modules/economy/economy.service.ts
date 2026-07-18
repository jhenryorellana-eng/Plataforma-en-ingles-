import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { zAvatarConfig, type AvatarConfig, type EconomyState } from '@star/contracts';
import { AppError } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';

export interface NovaGrant {
  userId: string;
  kind: string;
  amount: number;
  /** Idempotencia: id de la evidencia/sesión de origen (único en XpEvent). */
  refId: string;
}

@Injectable()
export class EconomyService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Estado ----------------

  async getState(userId: string): Promise<EconomyState> {
    const [wallet, avatarRow, inventory, shop, events] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { userId } }),
      this.prisma.avatarConfig.findUnique({ where: { userId } }),
      this.prisma.inventoryItem.findMany({ where: { userId }, select: { itemId: true, equipped: true } }),
      this.prisma.shopItem.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] }),
      this.prisma.xpEvent.findMany({ where: { userId }, select: { createdAt: true } }),
    ]);
    return {
      balance: wallet?.balance ?? 0,
      earnedTotal: wallet?.earned ?? 0,
      streakDays: computeStreakDays(events.map((event) => event.createdAt)),
      avatar: parseAvatarConfig(avatarRow?.config),
      inventory: inventory.map((entry) => entry.itemId),
      equipped: inventory.filter((entry) => entry.equipped).map((entry) => entry.itemId),
      shop: shop.map((item) => ({ id: item.id, slot: item.slot, name: item.name, price: item.price })),
    };
  }

  // ---------------- Avatar ----------------

  async saveAvatar(userId: string, config: AvatarConfig): Promise<{ ok: true }> {
    const owned = await this.prisma.inventoryItem.findMany({ where: { userId }, select: { itemId: true } });
    const ownedIds = new Set(owned.map((entry) => entry.itemId));
    // Jamás confiar en el cliente: solo persisten accesorios que el usuario posee.
    const sanitized: AvatarConfig = {
      ...config,
      accessories: config.accessories.filter((id) => ownedIds.has(id)),
    };
    const json = sanitized as unknown as Prisma.InputJsonObject;
    await this.prisma.avatarConfig.upsert({
      where: { userId },
      create: { userId, config: json },
      update: { config: json },
    });
    return { ok: true };
  }

  // ---------------- Tienda ----------------

  async purchase(userId: string, itemId: string): Promise<{ balance: number }> {
    const item = await this.prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item) throw new AppError('ITEM_NOT_FOUND', 404, 'Ese objeto no existe en la tienda');
    return this.prisma.$transaction(async (tx) => {
      const owned = await tx.inventoryItem.findUnique({
        where: { userId_itemId: { userId, itemId } },
      });
      if (owned) throw new AppError('ALREADY_OWNED', 409, 'Ya tienes este objeto');
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if ((wallet?.balance ?? 0) < item.price) {
        throw new AppError('INSUFFICIENT_NOVAS', 402, 'No tienes Novas suficientes: sigue aprendiendo para ganar más');
      }
      const updated = await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: item.price } },
      });
      await tx.inventoryItem.create({ data: { userId, itemId, equipped: false } });
      return { balance: updated.balance };
    });
  }

  async equip(userId: string, itemId: string, equipped: boolean): Promise<{ equipped: string[] }> {
    const owned = await this.prisma.inventoryItem.findUnique({
      where: { userId_itemId: { userId, itemId } },
      include: { item: true },
    });
    if (!owned) throw new AppError('ITEM_NOT_FOUND', 404, 'No posees este objeto');
    return this.prisma.$transaction(async (tx) => {
      if (equipped) {
        // Un accesorio por slot: al equipar se desequipa lo demás del mismo slot.
        await tx.inventoryItem.updateMany({
          where: { userId, equipped: true, itemId: { not: itemId }, item: { slot: owned.item.slot } },
          data: { equipped: false },
        });
      }
      await tx.inventoryItem.update({
        where: { userId_itemId: { userId, itemId } },
        data: { equipped },
      });
      const nowEquipped = await tx.inventoryItem.findMany({
        where: { userId, equipped: true },
        select: { itemId: true },
      });
      return { equipped: nowEquipped.map((entry) => entry.itemId) };
    });
  }

  // ---------------- Recompensas (llamado por learning/voice dentro de su transacción) ----------------

  /**
   * Otorga Novas en la transacción del módulo origen. Idempotente por `refId`
   * único: devuelve false si el premio ya fue otorgado y no toca la wallet.
   */
  async grantNovasInTx(tx: Prisma.TransactionClient, grant: NovaGrant): Promise<boolean> {
    try {
      await tx.xpEvent.create({
        data: { userId: grant.userId, kind: grant.kind, amount: grant.amount, refId: grant.refId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false;
      throw error;
    }
    await tx.wallet.upsert({
      where: { userId: grant.userId },
      create: { userId: grant.userId, balance: grant.amount, earned: grant.amount },
      update: { balance: { increment: grant.amount }, earned: { increment: grant.amount } },
    });
    return true;
  }
}

// ---------------- Helpers puros ----------------

function parseAvatarConfig(config: unknown): AvatarConfig | null {
  if (config === null || config === undefined) return null;
  const parsed = zAvatarConfig.safeParse(config);
  return parsed.success ? parsed.data : null;
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Racha tipo Duolingo: cuenta desde hoy si hubo eventos hoy; si no, desde ayer (racha viva); si no, 0. */
function computeStreakDays(dates: Date[]): number {
  const days = new Set(dates.map(dayKey));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
