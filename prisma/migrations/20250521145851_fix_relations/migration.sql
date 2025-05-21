-- ⚠️ Primeiro, remova a coluna que depende do tipo antigo
ALTER TABLE "Product" DROP COLUMN IF EXISTS "sales";

-- Agora pode atualizar o enum com segurança
-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PREPARING';

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'STALL_SELLER', 'ORDER_PREPARER', 'CASHIER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STALL_SELLER';
COMMIT;

-- (opcional) remover redundância
-- ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STALL_SELLER';