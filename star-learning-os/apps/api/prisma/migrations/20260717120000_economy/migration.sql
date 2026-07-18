-- Economía adolescente: avatar por capas, moneda "Novas" (solo ganada aprendiendo),
-- tienda de cosméticos y eventos XP idempotentes (base de la racha diaria).

CREATE SCHEMA IF NOT EXISTS "economy";

-- CreateTable
CREATE TABLE "economy"."avatar_configs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "avatar_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "economy"."wallets" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "earned" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "economy"."xp_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "refId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "economy"."shop_items" (
    "id" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "shop_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "economy"."inventory_items" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "itemId" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "acquiredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "avatar_configs_userId_key" ON "economy"."avatar_configs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "economy"."wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "xp_events_refId_key" ON "economy"."xp_events"("refId");

-- CreateIndex
CREATE INDEX "xp_events_userId_createdAt_idx" ON "economy"."xp_events"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_userId_itemId_key" ON "economy"."inventory_items"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "economy"."avatar_configs" ADD CONSTRAINT "avatar_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "economy"."wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "economy"."xp_events" ADD CONSTRAINT "xp_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "economy"."inventory_items" ADD CONSTRAINT "inventory_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "economy"."inventory_items" ADD CONSTRAINT "inventory_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "economy"."shop_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Catálogo inicial de cosméticos (precios en Novas).
INSERT INTO "economy"."shop_items" ("id", "slot", "name", "price", "sort") VALUES
  ('glasses_round', 'glasses', 'Gafas redondas', 40, 10),
  ('glasses_star', 'glasses', 'Gafas estrella', 60, 20),
  ('cap_starbiz', 'head', 'Gorra Starbiz', 50, 30),
  ('antenna_glow', 'head', 'Antena luminosa', 90, 40),
  ('helmet_space', 'head', 'Casco espacial', 120, 50),
  ('headphones', 'ears', 'Auriculares pro', 80, 60),
  ('halo_gold', 'aura', 'Halo dorado', 100, 70),
  ('wings_cosmic', 'back', 'Alas cósmicas', 150, 80);
