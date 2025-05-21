/*
  Warnings:

  - The values [STALL] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `sales` on the `Product` table. All the data in the column will be lost.

*/
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

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "sales";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STALL_SELLER';
