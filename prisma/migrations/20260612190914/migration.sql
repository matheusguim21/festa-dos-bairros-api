-- DropForeignKey (already removed on a prior failed attempt; safe to skip if missing)
ALTER TABLE "venda_fichas" DROP CONSTRAINT IF EXISTS "TokenSale_cashierId_fkey";

-- Rename primary key constraint to match @@map("venda_fichas")
ALTER TABLE "venda_fichas" RENAME CONSTRAINT "TokenSale_pkey" TO "venda_fichas_pkey";

-- Remove temporary default (schema has no @default on paymentMethod)
ALTER TABLE "venda_fichas" ALTER COLUMN "paymentMethod" DROP DEFAULT;

-- AddForeignKey with name aligned to Prisma model
ALTER TABLE "venda_fichas" DROP CONSTRAINT IF EXISTS "venda_fichas_cashierId_fkey";
ALTER TABLE "venda_fichas" ADD CONSTRAINT "venda_fichas_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "Cashier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
